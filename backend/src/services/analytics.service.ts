import mongoose, { PipelineStage } from "mongoose";
import { DateRangeEnum, DateRangePreset } from "../enums/date-range.enum";
import TransactionModel, {
  PaymentMethodEnum,
  TransactionTypeEnum,
} from "../models/transaction.model";
import { getDateRange } from "../utils/date";
import {
  differenceInDays,
  subDays,
  subYears,
  startOfMonth,
  subMonths,
  startOfQuarter,
  endOfQuarter,
  subQuarters,
  startOfYear,
  endOfYear,
  startOfDay,
  endOfDay,
  endOfMonth,
} from "date-fns";
import { convertToUnit } from "../utils/format-currency";
import {
  genAI,
  genAIModel,
  generateContentWithRetry,
} from "../config/google-ai.config";
import { Env } from "../config/env.config";
import { getBudgetService, updateBudgetService } from "./budget.service";
import {
  createTransactionService,
  deleteTransactionService,
  updateTransactionService,
  exportTransactionsEmailService,
} from "./transaction.service";
import { createInstantReportService } from "./report.service";
import UserModel from "../models/user.model";

export const summaryAnalyticsService = async (
  userId: string,
  dateRangePreset?: DateRangePreset,
  customFrom?: Date,
  customTo?: Date
) => {
  const range = getDateRange(dateRangePreset, customFrom, customTo);

  const { from, to, value: rangeValue } = range;

  const currentPeriodPipeline: PipelineStage[] = [
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        ...(from &&
          to && {
          date: {
            $gte: from,
            $lte: to,
          },
        }),
      },
    },
    {
      $group: {
        _id: null,
        totalIncome: {
          $sum: {
            $cond: [
              { $eq: ["$type", TransactionTypeEnum.INCOME] },
              { $abs: "$amount" },
              0,
            ],
          },
        },
        totalExpenses: {
          $sum: {
            $cond: [
              { $eq: ["$type", TransactionTypeEnum.EXPENSE] },
              { $abs: "$amount" },
              0,
            ],
          },
        },

        transactionCount: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        totalIncome: 1,
        totalExpenses: 1,
        transactionCount: 1,

        availableBalance: { $subtract: ["$totalIncome", "$totalExpenses"] },

        savingData: {
          $let: {
            vars: {
              income: { $ifNull: ["$totalIncome", 0] },
              expenses: { $ifNull: ["$totalExpenses", 0] },
            },
            in: {
              // ((income - expenses) / income) * 100;
              savingsPercentage: {
                $cond: [
                  { $lte: ["$$income", 0] },
                  0,
                  {
                    $multiply: [
                      {
                        $divide: [
                          { $subtract: ["$$income", "$$expenses"] },
                          "$$income",
                        ],
                      },
                      100,
                    ],
                  },
                ],
              },

              //Expense Ratio = (expenses / income) * 100
              expenseRatio: {
                $cond: [
                  { $lte: ["$$income", 0] },
                  0,
                  {
                    $multiply: [
                      {
                        $divide: ["$$expenses", "$$income"],
                      },
                      100,
                    ],
                  },
                ],
              },
            },
          },
        },
      },
    },
  ];

  const [current] = await TransactionModel.aggregate(currentPeriodPipeline);

  const {
    totalIncome = 0,
    totalExpenses = 0,
    availableBalance = 0,
    transactionCount = 0,
    savingData = {
      expenseRatio: 0,
      savingsPercentage: 0,
    },
  } = current || {};

  const budgetProfile = await getBudgetService(userId);
  const budgetLimit = budgetProfile.limit || 0;
  // True remaining budget calculation: independent of Income
  const remainingBudget = budgetLimit - totalExpenses;

  let percentageChange: any = {
    income: 0,
    expenses: 0,
    balance: 0,
    prevPeriodFrom: null,
    prevPeriodTo: null,
    previousValues: {
      incomeAmount: 0,
      expenseAmount: 0,
      balanceAmount: 0,
    },
  };

  if (from && to && rangeValue !== DateRangeEnum.ALL_TIME) {
    //last 30 days  previous las 30 days,

    const period = differenceInDays(to, from) + 1;

    const isYearly = [
      DateRangeEnum.LAST_YEAR,
      DateRangeEnum.THIS_YEAR,
    ].includes(rangeValue);

    const prevPeriodFrom = isYearly ? subYears(from, 1) : subDays(from, period);

    const prevPeriodTo = isYearly ? subYears(to, 1) : subDays(to, period);

    const prevPeriodPipeline = [
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          date: {
            $gte: prevPeriodFrom,
            $lte: prevPeriodTo,
          },
        },
      },
      {
        $group: {
          _id: null,
          totalIncome: {
            $sum: {
              $cond: [
                { $eq: ["$type", TransactionTypeEnum.INCOME] },
                { $abs: "$amount" },
                0,
              ],
            },
          },
          totalExpenses: {
            $sum: {
              $cond: [
                { $eq: ["$type", TransactionTypeEnum.EXPENSE] },
                { $abs: "$amount" },
                0,
              ],
            },
          },
        },
      },
    ];

    const [previous] = await TransactionModel.aggregate(prevPeriodPipeline);

    if (previous) {
      const prevIncome = previous.totalIncome || 0;
      const prevExpenses = previous.totalExpenses || 0;
      const prevBalance = prevIncome - prevExpenses;

      const currentIncome = totalIncome;
      const currentExpenses = totalExpenses;
      const currentBalance = availableBalance;

      percentageChange = {
        income: calaulatePercentageChange(prevIncome, currentIncome),
        expenses: calaulatePercentageChange(prevExpenses, currentExpenses),
        balance: calaulatePercentageChange(prevBalance, currentBalance),
        prevPeriodFrom: prevPeriodFrom,
        prevPeriodTo: prevPeriodTo,
        previousValues: {
          incomeAmount: prevIncome,
          expenseAmount: prevExpenses,
          balanceAmount: prevBalance,
        },
      };
    }
  }

  return {
    budgetLimit: convertToUnit(budgetLimit),
    remainingBudget: convertToUnit(remainingBudget),
    availableBalance: convertToUnit(availableBalance),
    totalIncome: convertToUnit(totalIncome),
    totalExpenses: convertToUnit(totalExpenses),
    savingRate: {
      percentage: parseFloat(savingData.savingsPercentage.toFixed(2)),
      expenseRatio: parseFloat(savingData.expenseRatio.toFixed(2)),
    },
    transactionCount,
    percentageChange: {
      ...percentageChange,
      previousValues: {
        incomeAmount: convertToUnit(
          percentageChange.previousValues.incomeAmount
        ),
        expenseAmount: convertToUnit(
          percentageChange.previousValues.expenseAmount
        ),
        balanceAmount: convertToUnit(
          percentageChange.previousValues.balanceAmount
        ),
      },
    },
    preset: {
      ...range,
      value: rangeValue || DateRangeEnum.ALL_TIME,
      label: range?.label || "All Time",
    },
  };
};

export const chartAnalyticsService = async (
  userId: string,
  dateRangePreset?: DateRangePreset,
  customFrom?: Date,
  customTo?: Date
) => {
  const range = getDateRange(dateRangePreset, customFrom, customTo);
  const { from, to, value: rangeValue } = range;

  const filter: any = {
    userId: new mongoose.Types.ObjectId(userId),
    ...(from &&
      to && {
      date: {
        $gte: from,
        $lte: to,
      },
    }),
  };

  const result = await TransactionModel.aggregate([
    { $match: filter },
    //Group the transaction by date (YYYY-MM-DD)
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$date",
          },
        },

        income: {
          $sum: {
            $cond: [
              { $eq: ["$type", TransactionTypeEnum.INCOME] },
              { $abs: "$amount" },
              0,
            ],
          },
        },

        expenses: {
          $sum: {
            $cond: [
              { $eq: ["$type", TransactionTypeEnum.EXPENSE] },
              { $abs: "$amount" },
              0,
            ],
          },
        },

        incomeCount: {
          $sum: {
            $cond: [{ $eq: ["$type", TransactionTypeEnum.INCOME] }, 1, 0],
          },
        },

        expenseCount: {
          $sum: {
            $cond: [{ $eq: ["$type", TransactionTypeEnum.EXPENSE] }, 1, 0],
          },
        },
      },
    },

    { $sort: { _id: 1 } },

    {
      $project: {
        _id: 0,
        date: "$_id",
        income: 1,
        expenses: 1,
        incomeCount: 1,
        expenseCount: 1,
      },
    },

    {
      $group: {
        _id: null,
        chartData: { $push: "$$ROOT" },
        totalIncomeCount: { $sum: "$incomeCount" },
        totalExpenseCount: { $sum: "$expenseCount" },
      },
    },

    {
      $project: {
        _id: 0,
        chartData: 1,
        totalIncomeCount: 1,
        totalExpenseCount: 1,
      },
    },
  ]);

  const resultData = result[0] || {};

  const transaformedData = (resultData?.chartData || []).map((item: any) => ({
    date: item.date,
    income: convertToUnit(item.income),
    expenses: convertToUnit(item.expenses),
  }));

  return {
    chartData: transaformedData,
    totalIncomeCount: resultData.totalIncomeCount,
    totalExpenseCount: resultData.totalExpenseCount,
    preset: {
      ...range,
      value: rangeValue || DateRangeEnum.ALL_TIME,
      label: range?.label || "All Time",
    },
  };
};

export const expensePieChartBreakdownService = async (
  userId: string,
  dateRangePreset?: DateRangePreset,
  customFrom?: Date,
  customTo?: Date
) => {
  const range = getDateRange(dateRangePreset, customFrom, customTo);
  const { from, to, value: rangeValue } = range;

  const filter: any = {
    userId: new mongoose.Types.ObjectId(userId),
    type: TransactionTypeEnum.EXPENSE,
    ...(from &&
      to && {
      date: {
        $gte: from,
        $lte: to,
      },
    }),
  };

  const pipleline: PipelineStage[] = [
    {
      $match: filter,
    },
    {
      $group: {
        _id: "$category",
        value: { $sum: { $abs: "$amount" } },
      },
    },
    { $sort: { value: -1 } }, //

    {
      $facet: {
        topThree: [{ $limit: 3 }],
        others: [
          { $skip: 3 },
          {
            $group: {
              _id: "others",
              value: { $sum: "$value" },
            },
          },
        ],
      },
    },

    {
      $project: {
        categories: {
          $concatArrays: ["$topThree", "$others"],
        },
      },
    },

    { $unwind: "$categories" },

    {
      $group: {
        _id: null,
        totalSpent: { $sum: "$categories.value" },
        breakdown: { $push: "$categories" },
      },
    },

    {
      $project: {
        _id: 0,
        totalSpent: 1,
        breakdown: {
          // .map((cat: any)=> )
          $map: {
            input: "$breakdown",
            as: "cat",
            in: {
              name: "$$cat._id",
              value: "$$cat.value",
              percentage: {
                $cond: [
                  { $eq: ["$totalSpent", 0] },
                  0,
                  {
                    $round: [
                      {
                        $multiply: [
                          { $divide: ["$$cat.value", "$totalSpent"] },
                          100,
                        ],
                      },
                      0,
                    ],
                  },
                ],
              },
            },
          },
        },
      },
    },
  ];

  const result = await TransactionModel.aggregate(pipleline);

  const data = result[0] || {
    totalSpent: 0,
    breakdown: [],
  };
  const transformedData = {
    totalSpent: convertToUnit(data.totalSpent),
    breakdown: data.breakdown.map((item: any) => ({
      ...item,
      value: convertToUnit(item.value),
    })),
  };

  return {
    ...transformedData,
    preset: {
      ...range,
      value: rangeValue || DateRangeEnum.ALL_TIME,
      label: range?.label || "All Time",
    },
  };
};

function calaulatePercentageChange(previous: number, current: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  const changes = ((current - previous) / Math.abs(previous)) * 100;
  const cappedChange = Math.min(Math.max(changes, -100), 100);
  return parseFloat(cappedChange.toFixed(2));
}

export const generateAiInsightsService = async (
  userId: string,
  dateRangePreset?: DateRangePreset,
  customFrom?: Date,
  customTo?: Date
) => {
  if (!Env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing from environment variables");
  }

  const range = getDateRange(dateRangePreset, customFrom, customTo);
  const { from, to, label: rangeLabel } = range;

  const txFilter: any = { userId: new mongoose.Types.ObjectId(userId) };
  if (from && to) {
    txFilter.date = { $gte: from, $lte: to };
  }

  const transactions = await TransactionModel.find(txFilter)
    .sort({ date: -1 })
    .limit(50)
    .lean();

  const summary = await summaryAnalyticsService(
    userId,
    dateRangePreset,
    customFrom,
    customTo
  );
  const expenseBreakdown = await expensePieChartBreakdownService(
    userId,
    dateRangePreset,
    customFrom,
    customTo
  );

  const prompt = `
    You are the Lead Financial Analyst at Obsidian Finance, a luxury wealth platform.
    Analyze the user's financial records specifically for the active period: "${rangeLabel}".
    
    ANALYSIS TIMEFRAME: ${rangeLabel}
    
    METRICS FOR THIS PERIOD:
    - Total Income: ₹${summary.totalIncome.toLocaleString("en-IN")}
    - Total Expenses: ₹${summary.totalExpenses.toLocaleString("en-IN")}
    - Net Savings / Available Balance: ₹${summary.availableBalance.toLocaleString("en-IN")}
    - Savings Rate: ${summary.savingRate?.percentage || 0}%
    - Total Transactions Recorded: ${summary.transactionCount || transactions.length}
    - Income Growth vs Previous Period: ${summary.percentageChange?.income || 0}%
    - Expense Growth vs Previous Period: ${summary.percentageChange?.expenses || 0}%
    
    SPENDING BY CATEGORY (${rangeLabel}):
    ${
      expenseBreakdown.breakdown?.length
        ? expenseBreakdown.breakdown
            .map(
              (cat: any) =>
                `- ${cat._id || cat.name}: ₹${Number(cat.value).toLocaleString("en-IN")}`
            )
            .join("\n")
        : "No categorized expenses recorded in this period"
    }
    
    LEDGER ENTRIES (${rangeLabel}):
    ${
      transactions.length
        ? transactions
            .map(
              (t) =>
                `- ${new Date(t.date).toISOString().split("T")[0]}: ${
                  t.type
                } of ₹${convertToUnit(t.amount).toLocaleString("en-IN")} for ${
                  t.category
                } ("${t.title || t.description || "N/A"}")`
            )
            .join("\n")
        : "No transactions recorded for this period"
    }
    
    OUTPUT REQUIREMENTS:
    1. Output strictly as a valid JSON array of 3 to 4 distinct strings. No markdown formatting, backticks, asterisks, or nested objects.
    2. Format exactly like: ["Insight 1", "Insight 2", "Insight 3"]
    3. Explicitly contextualize the insights around "${rangeLabel}" and cite concrete figures in Indian Rupees (₹) where relevant.
    4. Provide razor-sharp, actionable observations: high-impact categories, savings discipline, burn rate, or noteworthy inflows/outflows.
    5. No generic conversational filler, greetings, or robotic templates.
  `;

  try {
    const response = await generateContentWithRetry({
      contents: prompt,
    });

    const text = response.text || "[]";
    const jsonStr = text.replace(/```(?:json)?\n?/g, "").trim();
    const insightsArray = JSON.parse(jsonStr);

    return Array.isArray(insightsArray) ? insightsArray : [text];
  } catch (error) {
    console.error("Gemini AI generation failed", error);
    return [
      `Summary for ${rangeLabel}: Income ₹${summary.totalIncome.toLocaleString(
        "en-IN"
      )}, Expenses ₹${summary.totalExpenses.toLocaleString(
        "en-IN"
      )}, Net Balance ₹${summary.availableBalance.toLocaleString(
        "en-IN"
      )}, Savings Rate ${summary.savingRate?.percentage || 0}%.`,
    ];
  }
};

export const chatWithAiFinancialAdvisorService = async (
  userId: string,
  userMessage: string,
  history: Array<{ role: "user" | "model"; parts: string }> = [],
  currentRange?: {
    label?: string;
    value?: string;
    from?: string | Date;
    to?: string | Date;
  }
) => {
  if (!Env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing from environment variables");
  }

  const user = await UserModel.findById(userId).lean();
  const userName = user?.name || "Client";
  const userEmail = user?.email || "";

  // 1. All-time portfolio summary
  const allTimeSummary = await summaryAnalyticsService(
    userId,
    DateRangeEnum.ALL_TIME
  );
  const allTimeBreakdown = await expensePieChartBreakdownService(
    userId,
    DateRangeEnum.ALL_TIME
  );

  // 2. Active viewing period summary
  let activePreset: DateRangePreset | undefined = undefined;
  if (currentRange?.value) {
    activePreset = currentRange.value as DateRangePreset;
  }
  const currentSummary = await summaryAnalyticsService(
    userId,
    activePreset,
    currentRange?.from ? new Date(currentRange.from) : undefined,
    currentRange?.to ? new Date(currentRange.to) : undefined
  );
  const currentBreakdown = await expensePieChartBreakdownService(
    userId,
    activePreset,
    currentRange?.from ? new Date(currentRange.from) : undefined,
    currentRange?.to ? new Date(currentRange.to) : undefined
  );

  // 3. User budget
  const budget = await getBudgetService(userId);
  const budgetLimit = budget?.limit || 0;
  const currentMonthSpent = currentSummary.totalExpenses || 0;

  // 4. Up to 100 recent transactions across all dates
  const transactions = await TransactionModel.find({
    userId: new mongoose.Types.ObjectId(userId),
  })
    .sort({ date: -1 })
    .limit(100)
    .lean();

  const todayStr = new Date().toISOString().split("T")[0];
  const activePeriodLabel = currentRange?.label || "Last 30 Days";

  const contextPrompt = `
You are the Obsidian Finance Autonomous Financial Advisor & Wealth Strategist for ${userName} (${userEmail}).
You are embedded inside a luxury financial portfolio management platform.
You have FULL AUTHORITY to execute financial actions on the user's behalf (add transactions, delete transactions, edit/update transactions, set budgets, generate and email financial reports, or export transaction ledgers) OR answer analytical questions with exact, non-generic figures.

CURRENT SYSTEM DATE: ${todayStr}
CURRENT DASHBOARD VIEWING PERIOD: "${activePeriodLabel}"

PORTFOLIO INTELLIGENCE:
1. ALL-TIME METRICS:
- Total Income: ₹${allTimeSummary.totalIncome.toLocaleString("en-IN")}
- Total Expenses: ₹${allTimeSummary.totalExpenses.toLocaleString("en-IN")}
- Net Available Balance: ₹${allTimeSummary.availableBalance.toLocaleString("en-IN")}
- All-Time Savings Rate: ${allTimeSummary.savingRate?.percentage || 0}%
- Total Ledger Entries: ${allTimeSummary.transactionCount}
- Top All-Time Categories: ${
    allTimeBreakdown.breakdown
      .map(
        (cat: any) =>
          `${cat._id || cat.name}: ₹${Number(cat.value).toLocaleString("en-IN")}`
      )
      .join(", ") || "None recorded yet"
  }

2. CURRENT ACTIVE PERIOD METRICS ("${activePeriodLabel}"):
- Income: ₹${currentSummary.totalIncome.toLocaleString("en-IN")}
- Expenses: ₹${currentSummary.totalExpenses.toLocaleString("en-IN")}
- Net Balance: ₹${currentSummary.availableBalance.toLocaleString("en-IN")}
- Savings Rate: ${currentSummary.savingRate?.percentage || 0}%
- Top Categories: ${
    currentBreakdown.breakdown
      .map(
        (cat: any) =>
          `${cat._id || cat.name}: ₹${Number(cat.value).toLocaleString("en-IN")}`
      )
      .join(", ") || "None recorded in this period"
  }

3. MONTHLY BUDGET:
- Budget Limit: ₹${budgetLimit.toLocaleString("en-IN")}
- Current Month Spending: ₹${currentMonthSpent.toLocaleString("en-IN")}
- Budget Remaining: ₹${Math.max(0, budgetLimit - currentMonthSpent).toLocaleString("en-IN")}

4. COMPLETE TRANSACTION LEDGER (Latest ${transactions.length} entries):
${
  transactions
    .map(
      (t) =>
        `* [ID: ${t._id}] ${new Date(t.date).toISOString().split("T")[0]}: ${
          t.type
        } of ₹${convertToUnit(t.amount).toLocaleString("en-IN")} in "${
          t.category
        }" - "${t.title}" (${t.description || "N/A"})`
    )
    .join("\n") || "No transactions recorded yet"
}

ALLOWED ACTIONS:
1. "ADD_TRANSACTION": If the user wants to add an expense or income (e.g., "Spent 450 on coffee", "Add my 80000 salary on 2026-11-01").
   Params: title (string), amount (positive number in INR), type ("INCOME" | "EXPENSE"), category (one of: groceries, dining, transportation, utilities, entertainment, shopping, healthcare, travel, housing, income, investments, other), paymentMethod ("CARD", "CASH", "BANK_TRANSFER", "AUTO_DEBIT", "MOBILE_PAYMENT", "OTHER"), date (ISO string YYYY-MM-DD, defaults to current date if not specified), description (optional).
2. "DELETE_TRANSACTION": If the user wants to delete/remove a transaction (e.g., "Delete the coffee expense", "Remove my last transaction").
   Params: keyword (e.g., "coffee", "last", or transaction title).
3. "UPDATE_TRANSACTION": If the user wants to modify an existing transaction, including changing its date, amount, title, or category (e.g., "Change the date of my coffee expense to yesterday", "Move my salary transaction to Nov 1", "Update amount to 1200").
   Params: keyword (to match title or transaction ID), date (ISO string YYYY-MM-DD), amount (optional number), title (optional string), category (optional string).
4. "SET_BUDGET": If the user wants to set or adjust their monthly budget limit (e.g., "Set budget to 50000").
   Params: limit (positive number).
5. "GENERATE_REPORT": If the user asks for a financial report, summary for any timeframe, or asks to email/mail a report (e.g. "Generate report for this month", "Show all time report", "March 2026 report", "Mail me the report", "Send report to my email").
   Params: 
   - period: "ALL_TIME" | "THIS_MONTH" | "LAST_MONTH" | "THIS_QUARTER" | "LAST_QUARTER" | "THIS_YEAR" | "LAST_YEAR" | "LAST_30_DAYS" | "CUSTOM"
   - fromDate: string (YYYY-MM-DD if custom or specific month, e.g. "2026-03-01")
   - toDate: string (YYYY-MM-DD if custom or specific month, e.g. "2026-03-31")
   - sendEmail: boolean (Set to true whenever user mentions "email", "mail", "inbox", "send to my email", "mail me", or asks to send the report)
6. "EXPORT_TRANSACTIONS": If user wants to export transaction CSV or email transaction data (e.g., "export my transactions", "mail transaction records", "send CSV to my email").
   Params: fromDate (optional), toDate (optional), category (optional), type (optional).
7. "NONE": For purely analytical questions, financial questions, or portfolio assessments. When answering, cite exact numbers from the metrics and ledger above. Never give generic boilerplate advice.

OUTPUT FORMAT REQUIREMENTS:
Output strictly valid JSON matching this schema:
{
  "action": "ADD_TRANSACTION" | "DELETE_TRANSACTION" | "UPDATE_TRANSACTION" | "SET_BUDGET" | "GENERATE_REPORT" | "EXPORT_TRANSACTIONS" | "NONE",
  "actionParams": {
    "title": "string",
    "amount": 0,
    "type": "INCOME" | "EXPENSE",
    "category": "string",
    "paymentMethod": "CARD",
    "date": "YYYY-MM-DD",
    "description": "string",
    "keyword": "string",
    "limit": 0,
    "period": "ALL_TIME",
    "fromDate": "YYYY-MM-DD",
    "toDate": "YYYY-MM-DD",
    "sendEmail": false
  },
  "headline": "Short, elegant headline (e.g., 'Expense Added', 'Date Adjusted', 'Report Generated', 'Portfolio Analysis')",
  "summary": "1-2 natural, razor-sharp sentences answering the user directly or confirming the action with exact numbers in ₹. Never use robotic phrases or generic filler.",
  "keyMetrics": [
    { "label": "string", "value": "string" }
  ],
  "bulletPoints": [
    "Insight or detail 1",
    "Insight or detail 2"
  ],
  "recommendation": "Optional practical, tailored wealth strategy or advice"
}
`;

  try {
    const formattedHistory = history.slice(-4).map((msg) => ({
      role: msg.role === "user" ? ("user" as const) : ("model" as const),
      parts: [{ text: msg.parts }],
    }));

    const contents = [
      {
        role: "user" as const,
        parts: [{ text: contextPrompt }],
      },
      {
        role: "model" as const,
        parts: [
          {
            text: "{\"action\":\"NONE\",\"actionParams\":{},\"headline\":\"System Ready\",\"summary\":\"Obsidian Autonomous Agent initialized with full portfolio visibility and execution permissions.\",\"keyMetrics\":[],\"bulletPoints\":[],\"recommendation\":\"Ready for queries or commands.\"}",
          },
        ],
      },
      ...formattedHistory,
      {
        role: "user" as const,
        parts: [{ text: userMessage }],
      },
    ];

    const response = await generateContentWithRetry({
      contents: contents as any,
      config: {
        responseMimeType: "application/json",
      },
    });

    const rawText = response.text || "{}";
    const cleaned = rawText.replace(/```(?:json)?\n?/g, "").trim();
    let parsed: any = {};
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        action: "NONE",
        headline: "Portfolio Intelligence",
        summary: rawText,
        keyMetrics: [],
        bulletPoints: [],
        recommendation: "",
      };
    }

    // Now execute any requested financial action
    let actionTaken: {
      type: string;
      description: string;
      data?: any;
    } | undefined = undefined;

    const action = parsed.action || "NONE";
    const params = parsed.actionParams || {};

    if (action === "ADD_TRANSACTION" && params.amount) {
      const type =
        params.type === "INCOME"
          ? TransactionTypeEnum.INCOME
          : TransactionTypeEnum.EXPENSE;

      const validCategories = [
        "groceries",
        "dining",
        "transportation",
        "utilities",
        "entertainment",
        "shopping",
        "healthcare",
        "travel",
        "housing",
        "income",
        "investments",
        "other",
      ];

      const category = validCategories.includes(params.category?.toLowerCase())
        ? params.category.toLowerCase()
        : type === TransactionTypeEnum.INCOME
        ? "income"
        : "other";

      const validMethods = Object.values(PaymentMethodEnum);
      const paymentMethod = validMethods.includes(params.paymentMethod)
        ? params.paymentMethod
        : PaymentMethodEnum.CARD;

      let transactionDate = new Date();
      if (params.date) {
        const parsedDate = new Date(params.date);
        if (!isNaN(parsedDate.getTime())) {
          transactionDate = parsedDate;
        }
      }

      const created = await createTransactionService(
        {
          title: params.title || "Transaction",
          amount: Math.abs(Number(params.amount)),
          type,
          category,
          date: transactionDate,
          paymentMethod,
          description: params.description || `Added via Obsidian AI Assistant`,
          isRecurring: false,
        },
        userId
      );

      const formattedDateStr = transactionDate.toISOString().split("T")[0];
      actionTaken = {
        type: "ADD_TRANSACTION",
        description: `Successfully added ${type.toLowerCase()} of ₹${Number(
          params.amount
        ).toLocaleString("en-IN")} for "${created.title}" under ${category} on ${formattedDateStr}.`,
        data: created,
      };
    } else if (action === "DELETE_TRANSACTION") {
      const keyword = (params.keyword || params.title || "").trim();
      const query: any = { userId: new mongoose.Types.ObjectId(userId) };

      if (keyword && keyword.toLowerCase() !== "last") {
        query.title = { $regex: keyword, $options: "i" };
      }

      const candidate = await TransactionModel.findOne(query).sort({
        date: -1,
        createdAt: -1,
      });

      if (candidate) {
        await deleteTransactionService(userId, candidate._id.toString());
        actionTaken = {
          type: "DELETE_TRANSACTION",
          description: `Deleted transaction "${candidate.title}" (₹${convertToUnit(
            candidate.amount
          )}).`,
          data: candidate,
        };
      } else {
        actionTaken = {
          type: "DELETE_TRANSACTION",
          description: keyword
            ? `No transaction found matching "${keyword}".`
            : "No recent transactions found to delete.",
        };
      }
    } else if (action === "UPDATE_TRANSACTION") {
      const keyword = (params.keyword || params.title || "").trim();
      let query: any = { userId: new mongoose.Types.ObjectId(userId) };

      if (mongoose.Types.ObjectId.isValid(keyword)) {
        query._id = new mongoose.Types.ObjectId(keyword);
      } else if (keyword && keyword.toLowerCase() !== "last") {
        query.title = { $regex: keyword, $options: "i" };
      }

      const candidate = await TransactionModel.findOne(query).sort({
        date: -1,
        createdAt: -1,
      });

      if (candidate) {
        const updates: any = {};
        if (params.amount) updates.amount = Math.abs(Number(params.amount));
        if (params.title) updates.title = params.title;
        if (params.category) updates.category = params.category.toLowerCase();
        if (params.type) updates.type = params.type;
        if (params.date) {
          const parsedDate = new Date(params.date);
          if (!isNaN(parsedDate.getTime())) {
            updates.date = parsedDate;
          }
        }

        await updateTransactionService(
          userId,
          candidate._id.toString(),
          updates
        );

        const updatedDateStr = updates.date
          ? ` on ${updates.date.toISOString().split("T")[0]}`
          : "";

        actionTaken = {
          type: "UPDATE_TRANSACTION",
          description: `Updated transaction "${candidate.title}"${updatedDateStr}.`,
          data: { ...candidate.toObject(), ...updates },
        };
      } else {
        actionTaken = {
          type: "UPDATE_TRANSACTION",
          description: `Could not find transaction matching "${keyword}" to update.`,
        };
      }
    } else if (action === "SET_BUDGET" && params.limit !== undefined) {
      const newLimit = Math.abs(Number(params.limit));
      const budget = await updateBudgetService(userId, newLimit);
      actionTaken = {
        type: "SET_BUDGET",
        description: `Monthly budget limit successfully updated to ₹${newLimit.toLocaleString(
          "en-IN"
        )}.`,
        data: budget,
      };
    } else if (
      action === "GENERATE_REPORT" ||
      /\b(report|financial\s*summary)\b/i.test(userMessage) ||
      (/\b(mail|email|send)\b/i.test(userMessage) && !/\b(csv|export)\b/i.test(userMessage))
    ) {
      const now = new Date();
      const today = endOfDay(now);
      let from: Date = startOfMonth(today);
      let to: Date = today;

      const requestedPeriod = (params.period || "").toUpperCase();
      const emailKeywords = /\b(mail|email|inbox|send.*(?:mail|email|me)|forward)\b/i;
      const shouldEmail = Boolean(params.sendEmail) || emailKeywords.test(userMessage);

      // 1. Explicit fromDate & toDate
      if (params.fromDate) {
        from = startOfDay(new Date(params.fromDate));
        to = params.toDate ? endOfDay(new Date(params.toDate)) : today;
      }
      // 2. All Time
      else if (
        requestedPeriod === "ALL_TIME" ||
        /\b(all\s*time|entire\s*history|overall|everything|all)\b/i.test(userMessage)
      ) {
        from = new Date(0);
        to = today;
      }
      // 3. Last Month
      else if (
        requestedPeriod === "LAST_MONTH" ||
        /\blast\s*month\b/i.test(userMessage)
      ) {
        from = startOfMonth(subMonths(today, 1));
        to = endOfMonth(subMonths(today, 1));
      }
      // 4. This Month
      else if (
        requestedPeriod === "THIS_MONTH" ||
        /\bthis\s*month\b/i.test(userMessage)
      ) {
        from = startOfMonth(today);
        to = today;
      }
      // 5. This Quarter
      else if (
        requestedPeriod === "THIS_QUARTER" ||
        /\bthis\s*quarter\b/i.test(userMessage)
      ) {
        from = startOfQuarter(today);
        to = today;
      }
      // 6. Last Quarter
      else if (
        requestedPeriod === "LAST_QUARTER" ||
        /\blast\s*quarter\b/i.test(userMessage)
      ) {
        const prevQ = subQuarters(today, 1);
        from = startOfQuarter(prevQ);
        to = endOfQuarter(prevQ);
      }
      // 7. This Year or specific year 2026
      else if (
        requestedPeriod === "THIS_YEAR" ||
        /\b(this\s*year|2026)\b/i.test(userMessage)
      ) {
        from = startOfYear(today);
        to = endOfYear(today);
      }
      // 8. Last Year
      else if (
        requestedPeriod === "LAST_YEAR" ||
        /\blast\s*year\b/i.test(userMessage)
      ) {
        const prevY = subYears(today, 1);
        from = startOfYear(prevY);
        to = endOfYear(prevY);
      }
      // 9. Last 30 Days
      else if (
        requestedPeriod === "LAST_30_DAYS" ||
        /\b(?:30\s*days|last\s*30)\b/i.test(userMessage)
      ) {
        from = subDays(today, 30);
        to = today;
      }
      // 10. Check if user mentioned a specific month and optional year, e.g. "March", "March 2026", "Sept 2026"
      else {
        const monthNames = [
          "january|jan",
          "february|feb",
          "march|mar",
          "april|apr",
          "may",
          "june|jun",
          "july|jul",
          "august|aug",
          "september|sept|sep",
          "october|oct",
          "november|nov",
          "december|dec",
        ];
        let matchedMonth = false;
        for (let m = 0; m < 12; m++) {
          const mRegex = new RegExp(`\\b(${monthNames[m]})\\b(?:\\s*(\\d{4}))?`, "i");
          const match = userMessage.match(mRegex);
          if (match) {
            const year = match[2] ? parseInt(match[2], 10) : today.getFullYear();
            from = startOfMonth(new Date(year, m, 1));
            to = endOfMonth(new Date(year, m, 1));
            matchedMonth = true;
            break;
          }
        }

        // 11. If no month matched, check if currentRange is active
        if (!matchedMonth) {
          if (
            currentRange?.value === DateRangeEnum.ALL_TIME ||
            currentRange?.label?.toLowerCase().includes("all time")
          ) {
            from = new Date(0);
            to = today;
          } else if (currentRange?.from && currentRange?.to) {
            from = startOfDay(new Date(currentRange.from));
            to = endOfDay(new Date(currentRange.to));
          }
        }
      }

      try {
        const reportRes = await createInstantReportService(
          userId,
          from,
          to,
          shouldEmail
        );

        actionTaken = {
          type: "GENERATE_REPORT",
          description: shouldEmail
            ? `Generated financial report for ${reportRes.period} and delivered to ${
                userEmail || "your email"
              }.`
            : `Generated financial report for ${reportRes.period}.`,
          data: reportRes,
        };

        const formattedIncome =
          "₹" + Number(reportRes.summary.income).toLocaleString("en-IN");
        const formattedExpenses =
          "₹" + Number(reportRes.summary.expenses).toLocaleString("en-IN");
        const formattedBalance =
          "₹" + Number(reportRes.summary.balance).toLocaleString("en-IN");
        const formattedSavingsRate = `${reportRes.summary.savingsRate}%`;

        parsed.headline = `Financial Report: ${reportRes.period}`;
        parsed.summary = `Your financial report for ${reportRes.period} has been generated.${
          reportRes.emailSent
            ? ` A copy with complete breakdowns and insights has been delivered to ${userEmail}.`
            : ""
        }`;

        parsed.keyMetrics = [
          { label: "Total Income", value: formattedIncome },
          { label: "Total Expenses", value: formattedExpenses },
          { label: "Net Balance", value: formattedBalance },
          { label: "Savings Rate", value: formattedSavingsRate },
        ];

        if (reportRes.insights && reportRes.insights.length > 0) {
          parsed.bulletPoints = reportRes.insights;
        }
      } catch (err: any) {
        actionTaken = {
          type: "GENERATE_REPORT",
          description: err.message || "No financial activity found for this period.",
        };
        parsed.headline = "No Transactions Found";
        parsed.summary = `No financial activity or transactions were recorded for the selected period.`;
        parsed.keyMetrics = [
          { label: "Total Income", value: "₹0" },
          { label: "Total Expenses", value: "₹0" },
        ];
        parsed.bulletPoints = [
          "Try requesting a broader period like 'All Time' or 'This Year' to view your records.",
        ];
      }
    } else if (
      action === "EXPORT_TRANSACTIONS" ||
      (/\b(export|csv)\b/i.test(userMessage) &&
        /\b(mail|email|send)\b/i.test(userMessage))
    ) {
      const targetEmail = userEmail;

      if (!targetEmail) {
        throw new Error("No user email address found on file to export transactions.");
      }

      await exportTransactionsEmailService(userId, targetEmail, {
        type: params.type,
        category: params.category,
        fromDate: params.fromDate ? new Date(params.fromDate) : undefined,
        toDate: params.toDate ? new Date(params.toDate) : undefined,
      });

      actionTaken = {
        type: "EXPORT_TRANSACTIONS",
        description: `Exported transactions CSV and delivered to ${targetEmail}.`,
      };

      parsed.headline = "Transaction Export Delivered";
      parsed.summary = `Your transaction ledger has been exported to CSV and sent directly to ${targetEmail}.`;
      parsed.keyMetrics = [
        { label: "Recipient", value: targetEmail },
        { label: "Format", value: "CSV Spreadsheet" },
      ];
    }

    const replyFallback =
      parsed.summary +
      (parsed.bulletPoints?.length
        ? "\n\n" + parsed.bulletPoints.map((b: string) => `• ${b}`).join("\n")
        : "") +
      (parsed.recommendation ? `\n\nTip: ${parsed.recommendation}` : "");

    return {
      headline:
        parsed.headline || (actionTaken ? "Action Completed" : "Obsidian Intelligence"),
      summary: parsed.summary || replyFallback,
      keyMetrics: Array.isArray(parsed.keyMetrics) ? parsed.keyMetrics : [],
      bulletPoints: Array.isArray(parsed.bulletPoints) ? parsed.bulletPoints : [],
      recommendation: parsed.recommendation || "",
      actionTaken,
      reply: replyFallback,
    };
  } catch (error: any) {
    console.error("Gemini AI chat error:", error);
    throw new Error(error.message || "Failed to communicate with AI advisor");
  }
};

