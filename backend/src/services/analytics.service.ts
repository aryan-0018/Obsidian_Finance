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
  endOfDay,
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
} from "./transaction.service";
import { createInstantReportService } from "./report.service";

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

export const generateAiInsightsService = async (userId: string) => {
  if (!Env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing from environment variables");
  }

  const transactions = await TransactionModel.find({ userId: new mongoose.Types.ObjectId(userId) })
    .sort({ date: -1 })
    .limit(30)
    .lean();

  const summary = await summaryAnalyticsService(userId);
  const expenseBreakdown = await expensePieChartBreakdownService(userId);

  const prompt = `
    You are a financial analyst for Obsidian Finance.
    Analyze the user's finances and provide clear, practical insights.
    
    Financial Summary:
    Total Income: ₹${summary.totalIncome}
    Total Expenses: ₹${summary.totalExpenses}
    Available Balance: ₹${summary.availableBalance}
    Saving Rate: ${summary.savingRate.percentage}%
    Income Growth vs Previous Period: ${summary.percentageChange?.income || 0}%
    Expense Growth vs Previous Period: ${summary.percentageChange?.expenses || 0}%
    
    Category Spending Breakdown:
    ${expenseBreakdown.breakdown.map((cat: any) => `- ${cat._id || cat.name}: ₹${cat.value}`).join("\n")}
    
    Recent Transactions: 
    ${transactions.map(t => `- ${t.date.toISOString().split('T')[0]}: ${t.type} of ₹${convertToUnit(t.amount)} for ${t.category} (${t.description || "N/A"})`).join("\n")}
    
    OUTPUT REQUIREMENTS:
    1. Output strictly as a valid JSON array of strings. No markdown formatting, asterisks, or nested objects.
    2. Format exactly like: ["Point 1", "Point 2", "Point 3"]
    3. Use Indian Rupees (₹) for all currencies. 
    4. Exclude all conversational filler, fluff, warnings, or moral advice.
    5. Provide concise, realistic financial insights based on the user's spending and income.
    6. Ensure maximum 4 elements in the array.
  `;

  try {
    const response = await generateContentWithRetry({
      contents: prompt,
    });

    // Clean and parse the json response
    const text = response.text || "[]";
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const insightsArray = JSON.parse(jsonStr);

    return Array.isArray(insightsArray) ? insightsArray : [text];
  } catch (error) {
    console.error("Gemini AI generation failed", error);
    return ["AI insights are temporarily unavailable. Please try again shortly."];
  }
};

export const chatWithAiFinancialAdvisorService = async (
  userId: string,
  userMessage: string,
  history: Array<{ role: "user" | "model"; parts: string }> = []
) => {
  if (!Env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing from environment variables");
  }

  const transactions = await TransactionModel.find({
    userId: new mongoose.Types.ObjectId(userId),
  })
    .sort({ date: -1 })
    .limit(30)
    .lean();

  const summary = await summaryAnalyticsService(userId);
  const expenseBreakdown = await expensePieChartBreakdownService(userId);

  const todayStr = new Date().toISOString().split("T")[0];

  const contextPrompt = `
You are the Obsidian Finance AI Financial Assistant.
You are embedded inside a luxury financial portfolio management platform.
You have FULL AUTHORITY to execute financial actions on the user's behalf (add transactions, delete transactions, edit/update transactions and their dates, set budgets, generate reports) OR answer financial queries.

CURRENT SYSTEM DATE: ${todayStr}

CURRENT USER PORTFOLIO DATA:
- Total Income: ₹${summary.totalIncome}
- Total Expenses: ₹${summary.totalExpenses}
- Available Balance: ₹${summary.availableBalance}
- Savings Rate: ${summary.savingRate?.percentage || 0}%
- Top Spending Categories: ${
    expenseBreakdown.breakdown
      .map((cat: any) => `${cat._id || cat.name}: ₹${cat.value}`)
      .join(", ") || "None recorded yet"
  }
- Recent Transactions (latest 30):
${
  transactions
    .map(
      (t) =>
        `* [ID: ${t._id}] ${new Date(t.date).toISOString().split("T")[0]}: ${
          t.type
        } of ₹${convertToUnit(t.amount)} in "${t.category}" - "${t.title}" (${
          t.description || "N/A"
        })`
    )
    .join("\n") || "No transactions recorded yet"
}

ALLOWED ACTIONS:
1. "ADD_TRANSACTION": If the user wants to add an expense or income (e.g., "I spent 450 on coffee yesterday", "Add my 80000 salary on 2026-11-01").
   Params: title (string), amount (positive number in INR), type ("INCOME" | "EXPENSE"), category (one of: groceries, dining, transportation, utilities, entertainment, shopping, healthcare, travel, housing, income, investments, other), paymentMethod ("CARD", "CASH", "BANK_TRANSFER", "AUTO_DEBIT", "MOBILE_PAYMENT", "OTHER"), date (ISO string YYYY-MM-DD, e.g. "2026-11-05", defaults to current date if not specified), description (optional).
2. "DELETE_TRANSACTION": If the user wants to delete/remove a transaction (e.g., "Delete the coffee expense", "Remove my last transaction").
   Params: keyword (e.g., "coffee", "last", or transaction title).
3. "UPDATE_TRANSACTION": If the user wants to modify an existing transaction, including changing its date, amount, title, or category (e.g., "Change the date of my coffee expense to yesterday", "Move my salary transaction to Nov 1", "Update the amount of dinner to 1200").
   Params: keyword (to match title or transaction ID), date (ISO string YYYY-MM-DD or full ISO date when user asks to adjust/change the date), amount (optional number), title (optional string), category (optional string).
4. "SET_BUDGET": If the user wants to set or adjust their monthly budget limit (e.g., "Set budget to 50000").
   Params: limit (positive number).
5. "GENERATE_REPORT": If the user wants a financial report or summary for a period (e.g., "Generate report for this month", "Show my last quarter report").
   Params: period ("THIS_MONTH" | "LAST_MONTH" | "THIS_QUARTER" | "THIS_YEAR"), sendEmail (boolean, DEFAULT FALSE. Only set to true if user explicitly mentions "email it to me", "send to my email", or "mail me").
6. "NONE": For purely analytical questions, advisory tips, or portfolio assessments.

OUTPUT FORMAT REQUIREMENTS:
Output strictly valid JSON matching this schema.
Write in a natural, elegant, human financial advisor tone. DO NOT use generic robotic phrases, pseudo-statistical filler, or raw markdown headers (###, **).
{
  "action": "ADD_TRANSACTION" | "DELETE_TRANSACTION" | "UPDATE_TRANSACTION" | "SET_BUDGET" | "GENERATE_REPORT" | "NONE",
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
    "period": "THIS_MONTH",
    "sendEmail": false
  },
  "headline": "Short, elegant headline (e.g., 'Expense Added', 'Date Adjusted', 'Budget Updated', 'Spending Overview')",
  "summary": "1-2 natural, clear sentences explaining what was done or answering the user directly. Never use robotic jargon or template phrases. Use Indian Rupees (₹) for values.",
  "keyMetrics": [
    { "label": "string", "value": "string" }
  ],
  "bulletPoints": [
    "Helpful, direct insight 1",
    "Helpful, direct insight 2"
  ],
  "recommendation": "Optional practical advice (or omit if action was a simple command)"
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
    } else if (action === "GENERATE_REPORT") {
      const now = new Date();
      const today = endOfDay(now);
      let from = startOfMonth(today);
      let to = today;

      const period = (params.period || "THIS_MONTH").toUpperCase();
      if (period === "LAST_MONTH") {
        from = startOfMonth(subMonths(today, 1));
        to = startOfMonth(today);
      } else if (period === "THIS_QUARTER") {
        from = startOfQuarter(today);
        to = today;
      } else if (period === "LAST_QUARTER") {
        const prevQ = subQuarters(today, 1);
        from = startOfQuarter(prevQ);
        to = endOfQuarter(prevQ);
      } else if (period === "THIS_YEAR") {
        from = startOfYear(today);
        to = today;
      }

      const shouldEmail = Boolean(params.sendEmail);

      const reportRes = await createInstantReportService(
        userId,
        from,
        to,
        shouldEmail
      );

      const periodLabels: Record<string, string> = {
        THIS_MONTH: "this month",
        LAST_MONTH: "last month",
        THIS_QUARTER: "this quarter",
        LAST_QUARTER: "last quarter",
        THIS_YEAR: "this year",
      };
      const displayPeriod = periodLabels[period] || period.toLowerCase().replace("_", " ");

      actionTaken = {
        type: "GENERATE_REPORT",
        description: shouldEmail
          ? `Generated financial report for ${displayPeriod} and sent it to your email.`
          : `Generated financial report for ${displayPeriod}.`,
        data: reportRes,
      };
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

