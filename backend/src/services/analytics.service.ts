import mongoose, { PipelineStage } from "mongoose";
import { DateRangeEnum, DateRangePreset } from "../enums/date-range.enum";
import TransactionModel, {
  PaymentMethodEnum,
  RecurringIntervalEnum,
  TransactionTypeEnum,
} from "../models/transaction.model";
import { getDateRange } from "../utils/date";
import { escapeRegex } from "../utils/security";
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
  format,
  addDays,
} from "date-fns";
import { BadRequestException } from "../utils/app-error";
import { convertToUnit } from "../utils/format-currency";
import {
  genAI,
  genAIModel,
  generateContentWithRetry,
} from "../config/google-ai.config";
import { Env } from "../config/env.config";
import { getBudgetService, updateBudgetService } from "./budget.service";
import {
  parseIndianCurrencyExpression,
  detectIndianMerchantAndCategory,
} from "../utils/nlp-parser";
import { verifyLedgerIntegrityService } from "./ledger-audit.service";
import {
  generateTelegramPairingCodeService,
  getTelegramStatusService,
  unlinkTelegramService,
} from "./telegram.service";
import {
  createTransactionService,
  deleteTransactionService,
  updateTransactionService,
  exportTransactionsEmailService,
} from "./transaction.service";
import { createInstantReportService } from "./report.service";
import UserModel from "../models/user.model";
import { getAllAccountsService } from "./account.service";
import { getAllGoalsService } from "./goal.service";
import { getAllSplitsService } from "./split.service";
import { getSubscriptionRadarService } from "./radar-digest.service";

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

  // Standardize aggregated values into pure currency units (Rupees/INR)
  const totalIncomeInUnit = convertToUnit(totalIncome);
  const totalExpensesInUnit = convertToUnit(totalExpenses);
  const availableBalanceInUnit = convertToUnit(availableBalance);

  const budgetProfile = await getBudgetService(userId);
  const budgetLimit = Number(budgetProfile?.limit) || 0;
  // If the queried range is not monthly (e.g. ALL_TIME, THIS_YEAR, or LAST_30_DAYS), calculate current calendar month expenses for the monthly budget limit
  let monthlyExpensesForBudget = totalExpensesInUnit;
  if (rangeValue !== DateRangeEnum.THIS_MONTH) {
    const startOfCurrentMonth = startOfMonth(new Date());
    const endOfCurrentMonth = endOfMonth(new Date());
    const [thisMonthExpensesData] = await TransactionModel.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          type: TransactionTypeEnum.EXPENSE,
          date: { $gte: startOfCurrentMonth, $lte: endOfCurrentMonth },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $abs: "$amount" } },
        },
      },
    ]);
    monthlyExpensesForBudget = convertToUnit(thisMonthExpensesData?.total || 0);
  }
  const remainingBudget = budgetLimit > 0 ? (budgetLimit - monthlyExpensesForBudget) : 0;

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

    const isYearly = [
      DateRangeEnum.LAST_YEAR,
      DateRangeEnum.THIS_YEAR,
    ].includes(rangeValue);
    const isMonthly = [
      DateRangeEnum.LAST_MONTH,
      DateRangeEnum.THIS_MONTH,
    ].includes(rangeValue);
    const isQuarterly = [
      DateRangeEnum.LAST_QUARTER,
      DateRangeEnum.THIS_QUARTER,
    ].includes(rangeValue);

    let prevPeriodFrom: Date;
    let prevPeriodTo: Date;

    if (isYearly) {
      prevPeriodFrom = subYears(from, 1);
      prevPeriodTo = subYears(to, 1);
    } else if (isMonthly) {
      prevPeriodFrom = subMonths(from, 1);
      prevPeriodTo = subMonths(to, 1);
    } else if (isQuarterly) {
      prevPeriodFrom = subQuarters(from, 1);
      prevPeriodTo = subQuarters(to, 1);
    } else {
      const period = differenceInDays(to, from) + 1;
      prevPeriodFrom = subDays(from, period);
      prevPeriodTo = subDays(to, period);
    }

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
          incomeAmount: convertToUnit(prevIncome),
          expenseAmount: convertToUnit(prevExpenses),
          balanceAmount: convertToUnit(prevBalance),
        },
      };
    }
  }

  // Calculate Wealth Runway, Daily Burn Velocity & Financial Discipline Index
  const userDoc = await UserModel.findById(userId).select("portfolioBalance currency");
  const baseWealth = Number(userDoc?.portfolioBalance) || 0;

  // Calculate user's true all-time cash flow accrual (all-time income minus all-time expenses)
  let allTimeCashFlowInUnit = availableBalanceInUnit;
  if (rangeValue !== DateRangeEnum.ALL_TIME) {
    const [allTimeData] = await TransactionModel.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
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
    ]);
    const allInc = convertToUnit(allTimeData?.totalIncome || 0);
    const allExp = convertToUnit(allTimeData?.totalExpenses || 0);
    allTimeCashFlowInUnit = allInc - allExp;
  }

  // True Total Portfolio Balance matching EditableBalanceCard on dashboard
  const totalPortfolioBalance = baseWealth + allTimeCashFlowInUnit;
  const currentNetWealth = Math.max(0, totalPortfolioBalance);

  let effectivePeriodDays = 30;
  if (from && to) {
    effectivePeriodDays = Math.max(1, differenceInDays(to, from) + 1);
  } else if (rangeValue === DateRangeEnum.ALL_TIME) {
    const earliestTx = await TransactionModel.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    })
      .sort({ date: 1 })
      .select("date")
      .lean();
    if (earliestTx?.date) {
      effectivePeriodDays = Math.max(1, differenceInDays(new Date(), new Date(earliestTx.date)) + 1);
    }
  }
  const dailyBurn = totalExpensesInUnit / effectivePeriodDays;
  const monthlyProjectedExpense = dailyBurn * 30;
  const monthlyRunway = monthlyProjectedExpense > 0
    ? Math.max(0, parseFloat((currentNetWealth / monthlyProjectedExpense).toFixed(1)))
    : 999;

  // Composite Health Score (0-100)
  let healthScore = 50;
  const savingsPct = savingData.savingsPercentage || 0;
  if (savingsPct >= 25) healthScore += 25;
  else if (savingsPct >= 10) healthScore += 15;
  else if (savingsPct < 0) healthScore -= 20;

  if (budgetLimit > 0) {
    if (remainingBudget >= 0) healthScore += 15;
    else healthScore -= 20;
  } else {
    healthScore += 10;
  }

  if (savingData.expenseRatio > 80) healthScore -= 15;
  else if (savingData.expenseRatio < 50 && totalIncomeInUnit > 0) healthScore += 10;

  healthScore = Math.max(15, Math.min(99, Math.round(healthScore)));
  const healthRating =
    healthScore >= 80 ? "Prime" : healthScore >= 65 ? "Balanced" : healthScore >= 45 ? "Caution" : "Action Needed";

  return {
    budgetLimit: budgetLimit,
    remainingBudget: remainingBudget,
    availableBalance: availableBalanceInUnit,
    totalIncome: totalIncomeInUnit,
    totalExpenses: totalExpensesInUnit,
    allTimeCashFlow: allTimeCashFlowInUnit,
    totalPortfolioBalance: totalPortfolioBalance,
    basePortfolioBalance: baseWealth,
    savingRate: {
      percentage: parseFloat((savingData.savingsPercentage || 0).toFixed(2)),
      expenseRatio: parseFloat((savingData.expenseRatio || 0).toFixed(2)),
    },
    runwayMetrics: {
      dailyBurnRate: Math.round(dailyBurn * 100) / 100,
      projectedMonthlyExpense: Math.round(monthlyProjectedExpense * 100) / 100,
      runwayMonths: monthlyRunway >= 999 ? "Perpetual" : `${monthlyRunway} mo`,
      healthScore,
      healthRating,
      netWealth: currentNetWealth,
    },
    transactionCount,
    percentageChange,
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
  const cappedChange = Math.min(Math.max(changes, -100), 1000);
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
                } of ₹${Number(convertToUnit(t.amount)).toLocaleString("en-IN")} for ${
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
    4. Use simple, everyday words that are easy to understand. Avoid financial jargon (do not use terms like "burn velocity", "discretionary outlays", "amortization", or "capital deployment"). Highlight practical spending habits, top categories, and savings tips with exact figures in ₹.
    5. No generic conversational filler, greetings, or robotic templates.
  `;

  try {
    const aiTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("AI_INSIGHTS_TIMEOUT")), 4500)
    );

    const response = await Promise.race([
      generateContentWithRetry({
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      }),
      aiTimeout,
    ]);

    const text = response.text || "[]";
    const jsonStr = text.replace(/```(?:json)?\n?/g, "").trim();
    let insightsArray: any = [];
    try {
      insightsArray = JSON.parse(jsonStr);
    } catch {
      const match = jsonStr.match(/\[[\s\S]*\]/);
      if (match) {
        try {
          insightsArray = JSON.parse(match[0]);
        } catch {
          // fallback
        }
      }
    }

    return Array.isArray(insightsArray) && insightsArray.length > 0 ? insightsArray : [text];
  } catch (error) {
    console.warn("[Analytics Service] AI insights timeout or error, preparing fallback insights:", error);
    const topCat = expenseBreakdown.breakdown?.[0];
    const topCatStr = topCat
      ? `Top spending category for ${rangeLabel} is ${topCat._id || topCat.name} at ₹${Number(topCat.value).toLocaleString("en-IN")}.`
      : "No expenses recorded for this timeframe.";

    const savingsAnalysis =
      (summary.savingRate?.percentage || 0) >= 20
        ? `You achieved a strong savings rate of ${summary.savingRate?.percentage || 0}%, keeping spending well controlled.`
        : `Your savings rate for ${rangeLabel} is ${summary.savingRate?.percentage || 0}%. Consider reviewing top categories to grow savings.`;

    return [
      `In ${rangeLabel}, total income was ₹${summary.totalIncome.toLocaleString("en-IN")} against total spending of ₹${summary.totalExpenses.toLocaleString("en-IN")}, leaving ₹${summary.availableBalance.toLocaleString("en-IN")} available.`,
      topCatStr,
      savingsAnalysis,
      `Track recurring subscriptions and daily dining to maximize your available balance next period.`,
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

  // 1. Multi-period summaries and breakdowns in parallel
  let activePreset: DateRangePreset | undefined = undefined;
  if (currentRange?.value) {
    activePreset = currentRange.value as DateRangePreset;
  }

  const [
    allTimeSummary,
    allTimeBreakdown,
    thisMonthSummary,
    lastMonthSummary,
    thisYearSummary,
    lastYearSummary,
    currentSummary,
    currentBreakdown,
    budget,
    transactions,
    accountsData,
    goalsData,
    splitsData,
    recurringData,
  ] = await Promise.all([
    summaryAnalyticsService(userId, DateRangeEnum.ALL_TIME),
    expensePieChartBreakdownService(userId, DateRangeEnum.ALL_TIME),
    summaryAnalyticsService(userId, DateRangeEnum.THIS_MONTH),
    summaryAnalyticsService(userId, DateRangeEnum.LAST_MONTH),
    summaryAnalyticsService(userId, DateRangeEnum.THIS_YEAR),
    summaryAnalyticsService(userId, DateRangeEnum.LAST_YEAR),
    summaryAnalyticsService(
      userId,
      activePreset,
      currentRange?.from ? new Date(currentRange.from) : undefined,
      currentRange?.to ? new Date(currentRange.to) : undefined
    ),
    expensePieChartBreakdownService(
      userId,
      activePreset,
      currentRange?.from ? new Date(currentRange.from) : undefined,
      currentRange?.to ? new Date(currentRange.to) : undefined
    ),
    getBudgetService(userId),
    TransactionModel.find({
      userId: new mongoose.Types.ObjectId(userId),
    })
      .sort({ date: -1 })
      .limit(100)
      .lean(),
    getAllAccountsService(userId),
    getAllGoalsService(userId),
    getAllSplitsService(userId),
    getSubscriptionRadarService(userId),
  ]);

  // 2. User base wealth & true portfolio balance
  const baseBalance = Number(user?.portfolioBalance) || 0;
  const allTimeCashFlow = allTimeSummary.availableBalance || 0;
  const trueTotalPortfolioBalance = baseBalance + allTimeCashFlow;

  // 3. User budget
  const budgetLimit = budget?.limit || 0;
  const currentMonthSpent = thisMonthSummary.totalExpenses || 0;
  const remainingBudget = thisMonthSummary.remainingBudget || 0;

  const todayStr = new Date().toISOString().split("T")[0];
  const activePeriodLabel = currentRange?.label || "Last 30 Days";
  const currentYearNum = new Date().getFullYear();

  const contextPrompt = `
You are the Obsidian Finance Autonomous Financial Advisor & Wealth Strategist for ${userName} (${userEmail}).
You are embedded inside a luxury financial portfolio management platform.
You have FULL AUTHORITY to execute financial actions on the user's behalf (add transactions, delete transactions, edit/update transactions, set budgets, generate and email financial reports, or export transaction ledgers) OR answer analytical questions with exact, non-generic figures.

CURRENT SYSTEM DATE: ${todayStr}
CURRENT DASHBOARD VIEWING PERIOD: "${activePeriodLabel}"

PORTFOLIO INTELLIGENCE & MULTI-PERIOD METRICS:
1. PORTFOLIO BALANCES (Displayed on User's Dashboard Header):
- Starting / Base Portfolio Balance: ₹${baseBalance.toLocaleString("en-IN")}
- Cumulative All-Time Cash Flow Accrual (Income - Expenses): ${allTimeCashFlow >= 0 ? "+" : ""}₹${allTimeCashFlow.toLocaleString("en-IN")}
- TRUE TOTAL PORTFOLIO BALANCE (Net Wealth / Balance on Dashboard): ₹${trueTotalPortfolioBalance.toLocaleString("en-IN")}

2. ALL-TIME METRICS:
- Total All-Time Income: ₹${allTimeSummary.totalIncome.toLocaleString("en-IN")}
- Total All-Time Expenses: ₹${allTimeSummary.totalExpenses.toLocaleString("en-IN")}
- Net Available All-Time Cash Flow: ₹${allTimeSummary.availableBalance.toLocaleString("en-IN")}
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

3. PERIOD INTELLIGENCE MATRIX (Verified Figures For Different Timeframes):
- This Calendar Month (${format(new Date(), "MMMM yyyy")}):
  * Income: ₹${thisMonthSummary.totalIncome.toLocaleString("en-IN")}
  * Expenses: ₹${thisMonthSummary.totalExpenses.toLocaleString("en-IN")}
  * Net Cash Flow: ${thisMonthSummary.availableBalance >= 0 ? "+" : ""}₹${thisMonthSummary.availableBalance.toLocaleString("en-IN")}
  * Savings Rate: ${thisMonthSummary.savingRate?.percentage || 0}%
  * Remaining Monthly Budget: ₹${thisMonthSummary.budgetLimit > 0 ? thisMonthSummary.remainingBudget.toLocaleString("en-IN") : "N/A"}
  * Transactions: ${thisMonthSummary.transactionCount}

- Last Calendar Month (${format(subMonths(new Date(), 1), "MMMM yyyy")}):
  * Income: ₹${lastMonthSummary.totalIncome.toLocaleString("en-IN")}
  * Expenses: ₹${lastMonthSummary.totalExpenses.toLocaleString("en-IN")}
  * Net Cash Flow: ${lastMonthSummary.availableBalance >= 0 ? "+" : ""}₹${lastMonthSummary.availableBalance.toLocaleString("en-IN")}
  * Savings Rate: ${lastMonthSummary.savingRate?.percentage || 0}%
  * Transactions: ${lastMonthSummary.transactionCount}

- This Year (YTD ${currentYearNum}):
  * Income: ₹${thisYearSummary.totalIncome.toLocaleString("en-IN")}
  * Expenses: ₹${thisYearSummary.totalExpenses.toLocaleString("en-IN")}
  * Net Cash Flow: ${thisYearSummary.availableBalance >= 0 ? "+" : ""}₹${thisYearSummary.availableBalance.toLocaleString("en-IN")}
  * Savings Rate: ${thisYearSummary.savingRate?.percentage || 0}%
  * Transactions: ${thisYearSummary.transactionCount}

- Last Year (${currentYearNum - 1}):
  * Income: ₹${lastYearSummary.totalIncome.toLocaleString("en-IN")}
  * Expenses: ₹${lastYearSummary.totalExpenses.toLocaleString("en-IN")}
  * Net Cash Flow: ${lastYearSummary.availableBalance >= 0 ? "+" : ""}₹${lastYearSummary.availableBalance.toLocaleString("en-IN")}
  * Savings Rate: ${lastYearSummary.savingRate?.percentage || 0}%
  * Transactions: ${lastYearSummary.transactionCount}

- Active Dashboard Viewing Period ("${activePeriodLabel}"):
  * Income: ₹${currentSummary.totalIncome.toLocaleString("en-IN")}
  * Expenses: ₹${currentSummary.totalExpenses.toLocaleString("en-IN")}
  * Period Net Cash Flow: ₹${currentSummary.availableBalance.toLocaleString("en-IN")}
  * Period Savings Rate: ${currentSummary.savingRate?.percentage || 0}%
  * Top Categories: ${
      currentBreakdown.breakdown
        .map(
          (cat: any) =>
            `${cat._id || cat.name}: ₹${Number(cat.value).toLocaleString("en-IN")}`
        )
        .join(", ") || "None recorded in this period"
    }

4. MONTHLY BUDGET & CATEGORY LIMITS:
- Monthly Global Budget Limit: ₹${budgetLimit.toLocaleString("en-IN")}
- Current Month Spending: ₹${currentMonthSpent.toLocaleString("en-IN")}
- Remaining Budget: ₹${remainingBudget.toLocaleString("en-IN")}
- Category Budgets: ${
    (budget?.categoryProgress || [])
      .map(
        (c) =>
          `${c.category}: ₹${c.spent.toLocaleString("en-IN")} / ₹${c.limit.toLocaleString("en-IN")} (${c.percentUsed}%)`
      )
      .join(", ") || "None configured"
  }

5. ACCOUNTS, GOALS, SHARED IOUs & RECURRING BILLS:
- Accounts (${accountsData.summary.accountCount}, Net Balance ₹${accountsData.summary.netBalance.toLocaleString("en-IN")}): ${
    accountsData.accounts
      .map(
        (a) =>
          `${a.name} [${a.type}${a.accountMask ? ` ••${a.accountMask}` : ""}]: ₹${Number(a.balance).toLocaleString("en-IN")}`
      )
      .join(", ") || "None added"
  }
- Savings Goals (${goalsData.summary.totalGoals}, Saved ₹${goalsData.summary.totalSaved.toLocaleString("en-IN")} / ₹${goalsData.summary.totalTarget.toLocaleString("en-IN")}): ${
    goalsData.goals
      .map(
        (g) =>
          `${g.title}: ₹${Number(g.currentAmount).toLocaleString("en-IN")} / ₹${Number(g.targetAmount).toLocaleString("en-IN")} (${g.status})`
      )
      .join(", ") || "None added"
  }
- Shared Expenses & IOUs: Owed to user ₹${splitsData.summary.totalOwedToMe.toLocaleString("en-IN")}, User owes ₹${splitsData.summary.totalIOwe.toLocaleString("en-IN")} (${splitsData.summary.pendingCount} open)
- Recurring Bills & Subscriptions (${recurringData.summary.count}, Monthly total ₹${recurringData.summary.totalMonthlyRecurring.toLocaleString("en-IN")}): ${
    recurringData.subscriptions
      .slice(0, 8)
      .map((s) => `${s.title} ₹${s.amount.toLocaleString("en-IN")} (${s.interval}, due in ${s.daysUntilDue}d)`)
      .join(", ") || "None detected"
  }

6. WEALTH PACE & RUNWAY:
- Daily Spending Pace: ₹${currentSummary.runwayMetrics?.dailyBurnRate || 0}/day
- Projected Monthly Spend: ₹${currentSummary.runwayMetrics?.projectedMonthlyExpense || 0}
- Runway (How long savings will last): ${currentSummary.runwayMetrics?.runwayMonths || "Perpetual"}
- Financial Health Score: ${currentSummary.runwayMetrics?.healthScore || 85}/100 (${currentSummary.runwayMetrics?.healthRating || "Prime"})

6. COMPLETE TRANSACTION LEDGER (Latest ${transactions.length} entries):
${
  transactions
    .map(
      (t) =>
        `* [ID: ${t._id}] ${new Date(t.date).toISOString().split("T")[0]}: ${
          t.type
        } of ₹${Number(convertToUnit(t.amount)).toLocaleString("en-IN")} in "${
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
7. "AUDIT_LEDGER": If user asks to audit, verify, or inspect the cryptographic Merkle hash chain or tamper proof ledger.
8. "TELEGRAM_ACTION": If user asks for Telegram pairing code, connection status, or to unlink Telegram.
9. "OPEN_MODAL": If user asks to open an interactive view like Add Transaction, Receipt Scanner, Bank Statement Import, or Ledger Audit.
10. "NONE": For purely analytical questions, financial questions, or portfolio assessments:
    - If the user asks "what is my balance", "how much money do I have", or "my portfolio balance", ALWAYS cite their TRUE TOTAL PORTFOLIO BALANCE of ₹${trueTotalPortfolioBalance.toLocaleString("en-IN")}, and explain that it includes their base balance (₹${baseBalance.toLocaleString("en-IN")}) plus accrued net cash flow (${allTimeCashFlow >= 0 ? "+" : ""}₹${allTimeCashFlow.toLocaleString("en-IN")}).
    - If the user asks about ANY specific period or timeframe (e.g. "this month", "last month", "this year", "last year", "all time", or the active dashboard period): ALWAYS cite the exact matching figures from section 3 "PERIOD INTELLIGENCE MATRIX" above. E.g., for "last month income" cite ₹${lastMonthSummary.totalIncome.toLocaleString("en-IN")}; for "last month spending" cite ₹${lastMonthSummary.totalExpenses.toLocaleString("en-IN")}; for "this year income" cite ₹${thisYearSummary.totalIncome.toLocaleString("en-IN")}; for "this year spending" cite ₹${thisYearSummary.totalExpenses.toLocaleString("en-IN")}.
    - If the user asks "how much did I spend" without a specific period, state the spending for the active period (₹${currentSummary.totalExpenses.toLocaleString("en-IN")}) and their remaining monthly budget (₹${remainingBudget.toLocaleString("en-IN")}).
    - If the user asks "Can I afford X?", evaluate against Remaining Monthly Budget (₹${remainingBudget.toLocaleString("en-IN")}) and True Total Portfolio Balance (₹${trueTotalPortfolioBalance.toLocaleString("en-IN")}):
      * If X is within the remaining budget, approve with confidence.
      * If X exceeds the remaining budget but is within total portfolio balance, clearly explain that it exceeds the monthly budget limit by ₹(X - remainingBudget) but is fully covered by liquid portfolio reserves.
      * If X exceeds the total portfolio balance, state clearly that it is not affordable.
    - If the user asks about Savings Rate, cite the savings rate for the requested period (e.g., ${thisMonthSummary.savingRate?.percentage || 0}% for this month or ${currentSummary.savingRate?.percentage || 0}% for the active period).
    - If the user asks about Runway or how long savings will last, cite ${currentSummary.runwayMetrics?.runwayMonths || "Perpetual"} months based on daily burn rate of ₹${currentSummary.runwayMetrics?.dailyBurnRate || 0}/day.
    - If the user asks about specific merchants or categories (e.g. Swiggy, Dining, Groceries), search the complete transaction ledger provided above, sum the exact amounts, and report the precise total and count of transactions.
    - Never invent numbers or give vague boilerplate advice. All numbers must strictly correspond to the real ledger and metrics above.

OUTPUT FORMAT REQUIREMENTS:
Output strictly valid JSON matching this schema:
{
  "action": "ADD_TRANSACTION" | "DELETE_TRANSACTION" | "UPDATE_TRANSACTION" | "SET_BUDGET" | "GENERATE_REPORT" | "EXPORT_TRANSACTIONS" | "AUDIT_LEDGER" | "TELEGRAM_ACTION" | "OPEN_MODAL" | "NONE",
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
  "summary": "1-2 natural, friendly sentences in simple everyday words answering the user directly or confirming the action with exact numbers in ₹. Avoid complex financial jargon (no 'discretionary burn', 'amortization', etc.). Never use robotic phrases or generic filler.",
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
      timeoutMs: 22000,
      perAttemptTimeoutMs: 9000,
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

    if (action === "ADD_TRANSACTION" && params.amount !== undefined) {
      const cleanAmt = Math.abs(Number(params.amount));
      if (!Number.isFinite(cleanAmt) || cleanAmt <= 0 || cleanAmt > 1_000_000_000) {
        throw new BadRequestException("Invalid transaction amount");
      }
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
        query.title = { $regex: escapeRegex(keyword), $options: "i" };
      }

      const candidate = await TransactionModel.findOne(query).sort({
        date: -1,
        createdAt: -1,
      });

      if (candidate) {
        await deleteTransactionService(userId, candidate._id.toString());
        actionTaken = {
          type: "DELETE_TRANSACTION",
          description: `Deleted transaction "${candidate.title}" (₹${Number(
            candidate.amount
          ).toLocaleString("en-IN")}).`,
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
        query.title = { $regex: escapeRegex(keyword), $options: "i" };
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
      if (!Number.isFinite(newLimit) || newLimit > 1_000_000_000_000) {
        throw new BadRequestException("Invalid budget limit");
      }
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
      // 7. This Year or explicit current year
      else if (
        requestedPeriod === "THIS_YEAR" ||
        /\bthis\s*year\b/i.test(userMessage) ||
        new RegExp(`\\b${today.getFullYear()}\\b`).test(userMessage)
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
      parsed.summary = `Your transactions have been exported to CSV and sent directly to ${targetEmail}.`;
      parsed.keyMetrics = [
        { label: "Recipient", value: targetEmail },
        { label: "Format", value: "CSV Spreadsheet" },
      ];
    } else if (
      action === "AUDIT_LEDGER" ||
      /\b(audit|verify|tamper|merkle|cryptographic.*ledger|integrity.*ledger|reconcil)\b/i.test(userMessage)
    ) {
      const audit = await verifyLedgerIntegrityService(userId);
      const isSecure = audit.status === "VERIFIED_SECURE";
      actionTaken = {
        type: "AUDIT_LEDGER",
        description: `Record check: ${isSecure ? "All transactions verified and accurate" : "Discrepancy detected"}. Verified across ${audit.chainDepth} records in ${audit.executionTimeMs}ms.`,
        data: audit,
      };
      parsed.headline = isSecure ? "Records Verified & Accurate" : "Discrepancy Found";
      parsed.summary = isSecure
        ? `All ${audit.chainDepth} transactions have been checked and verified accurate in ${audit.executionTimeMs}ms.`
        : `A discrepancy was identified in the transaction sequence.`;
      parsed.keyMetrics = [
        { label: "Status", value: isSecure ? "Verified Safe" : "Discrepancy" },
        { label: "Transactions Checked", value: `${audit.chainDepth}` },
        { label: "Check Time", value: `${audit.executionTimeMs} ms` },
      ];
    } else if (
      action === "TELEGRAM_ACTION" ||
      /\b(telegram|copilot\s*bot)\b/i.test(userMessage)
    ) {
      if (/\b(pair|code|token|connect|link)\b/i.test(userMessage)) {
        const pair = await generateTelegramPairingCodeService(userId);
        actionTaken = {
          type: "TELEGRAM_ACTION",
          description: `Telegram pairing code generated: ${pair.code}. Valid for 15 minutes.`,
          data: pair,
        };
        parsed.headline = "Telegram Pairing Code Generated";
        parsed.summary = `Your pairing code is ${pair.code}. Send /start ${pair.code} to @${pair.botUsername} or click the link.`;
        parsed.keyMetrics = [
          { label: "Code", value: pair.code },
          { label: "Bot", value: `@${pair.botUsername}` },
        ];
      } else if (/\b(unlink|disconnect|remove)\b/i.test(userMessage)) {
        await unlinkTelegramService(userId);
        actionTaken = {
          type: "TELEGRAM_ACTION",
          description: "Telegram Assistant has been unlinked from your account.",
        };
        parsed.headline = "Telegram Unlinked";
        parsed.summary = "Your Telegram account association has been removed.";
      } else {
        const status = await getTelegramStatusService(userId);
        actionTaken = {
          type: "TELEGRAM_ACTION",
          description: status.isConnected
            ? `Telegram Assistant connected to @${status.telegramUsername}.`
            : "Telegram Assistant is disconnected.",
          data: status,
        };
        parsed.headline = "Telegram Assistant Status";
        parsed.summary = status.isConnected
          ? `Your account is paired with @${status.telegramUsername}.`
          : "Your account is not paired with Telegram.";
        parsed.keyMetrics = [
          { label: "Status", value: status.isConnected ? "CONNECTED" : "DISCONNECTED" },
          { label: "Account", value: status.telegramUsername || "None" },
        ];
      }
    } else if (
      action === "OPEN_MODAL" ||
      /\b(open|show|launch)\b.*\b(drawer|modal|scanner|importer|statement|receipt)\b/i.test(userMessage)
    ) {
      let targetModal = "ADD_TRANSACTION";
      let modalName = "Add Transaction Drawer";
      if (/\b(receipt|bill|scan)\b/i.test(userMessage)) {
        targetModal = "RECEIPT_SCANNER";
        modalName = "Receipt Scanner";
      } else if (/\b(import|statement|csv|pdf)\b/i.test(userMessage)) {
        targetModal = "IMPORT_STATEMENT";
        modalName = "Statement & CSV Import";
      } else if (/\b(audit|ledger|merkle|verify)\b/i.test(userMessage)) {
        targetModal = "LEDGER_AUDIT";
        modalName = "Record Verification Screen";
      } else if (/\b(telegram|copilot)\b/i.test(userMessage)) {
        targetModal = "TELEGRAM_COPILOT";
        modalName = "Telegram Assistant Panel";
      }

      actionTaken = {
        type: "OPEN_MODAL",
        description: `Opening ${modalName}...`,
        data: { modal: targetModal },
      };
      parsed.headline = `${modalName} Opened`;
      parsed.summary = `We have opened ${modalName} for you on the screen.`;
    }

    const replyFallback =
      parsed.summary +
      (parsed.bulletPoints?.length
        ? "\n\n" + parsed.bulletPoints.map((b: string) => `• ${b}`).join("\n")
        : "") +
      (parsed.recommendation ? `\n\nTip: ${parsed.recommendation}` : "");

    return {
      headline:
        parsed.headline || (actionTaken ? "Action Completed" : "Financial Overview"),
      summary: parsed.summary || replyFallback,
      keyMetrics: Array.isArray(parsed.keyMetrics) ? parsed.keyMetrics : [],
      bulletPoints: Array.isArray(parsed.bulletPoints) ? parsed.bulletPoints : [],
      recommendation: parsed.recommendation || "",
      actionTaken,
      reply: replyFallback,
    };
  } catch (error: any) {
    console.warn("AI chat timeout or error, activating intelligent heuristic shield:", error?.message);
    const lower = userMessage.toLowerCase();

    // 1. Safe read-only fallback: do not mutate ledger transactions on AI failure
    const fastAmount = parseIndianCurrencyExpression(lower);

    // 2. Check if user asked to Delete / Undo
    if (/\b(delete|remove|cancel|undo|clear)\b/i.test(lower)) {
      try {
        const keywordMatch = lower.match(
          /\b(?:delete|remove|cancel|undo|clear)\b.*?(?:the|my)?\s+([a-z0-9_-]+)/i
        );
        const keyword = keywordMatch ? keywordMatch[1] : "";
        const query: any = { userId: new mongoose.Types.ObjectId(userId) };
        if (keyword && !["last", "recent", "transaction", "expense", "one"].includes(keyword.toLowerCase())) {
          query.title = { $regex: escapeRegex(keyword), $options: "i" };
        }
        const candidate = await TransactionModel.findOne(query).sort({ date: -1, createdAt: -1 });
        if (candidate) {
          await deleteTransactionService(userId, candidate._id.toString());
          const cleanAmt = Number(candidate.amount).toLocaleString("en-IN");
          return {
            headline: "Transaction Removed",
            summary: `Deleted "${candidate.title}" (₹${cleanAmt}) from your transactions.`,
            keyMetrics: [
              { label: "Removed Title", value: candidate.title },
              { label: "Amount", value: `₹${cleanAmt}` },
            ],
            bulletPoints: [`Entry removed: ${candidate.title}`, `Amount reversed: ₹${cleanAmt}`],
            actionTaken: {
              type: "DELETE_TRANSACTION",
              description: `Deleted transaction "${candidate.title}" (₹${cleanAmt}).`,
              data: candidate,
            },
            reply: `Deleted transaction "${candidate.title}" (₹${cleanAmt}).`,
          };
        }
      } catch (delErr) {
        console.warn("Shield delete error:", delErr);
      }
    }

    // 3. Check if user asked to Set Budget
    if (/\b(budget)\b/i.test(lower) && fastAmount && fastAmount > 0) {
      try {
        const updated = await updateBudgetService(userId, fastAmount);
        const formatted = fastAmount.toLocaleString("en-IN");
        return {
          headline: "Budget Updated",
          summary: `Your monthly budget limit has been set to ₹${formatted}.`,
          keyMetrics: [{ label: "Monthly Budget", value: `₹${formatted}` }],
          bulletPoints: [`New budget ceiling: ₹${formatted}`, "All progress indicators updated"],
          actionTaken: {
            type: "SET_BUDGET",
            description: `Monthly budget updated to ₹${formatted}.`,
            data: updated,
          },
          reply: `Your monthly budget limit has been set to ₹${formatted}.`,
        };
      } catch (budErr) {
        console.warn("Shield budget error:", budErr);
      }
    }

    // 4. Question-Aware Analytical Fallback (exact live numbers when AI is unavailable)
    const totalBal = Math.round(trueTotalPortfolioBalance).toLocaleString("en-IN");
    const inc = Math.round(currentSummary.totalIncome).toLocaleString("en-IN");
    const exp = Math.round(currentSummary.totalExpenses).toLocaleString("en-IN");
    const rate = currentSummary.savingRate?.percentage || 0;
    const remBudget = Math.max(0, budgetLimit - currentMonthSpent).toLocaleString("en-IN");

    const expensesOnly = (transactions || []).filter(
      (t: any) => t.type === TransactionTypeEnum.EXPENSE
    );
    const sortedExpenses = [...expensesOnly].sort(
      (a: any, b: any) => Number(b.amount) - Number(a.amount)
    );
    const topCategoriesList = (currentBreakdown.breakdown || []).slice(0, 4);

    if (
      /\b(most\s*money|highest|biggest|largest|top\s*spend|where\s*did\s*i\s*spend|category|categories|spent\s*most)\b/i.test(
        lower
      )
    ) {
      const topCatName = topCategoriesList[0]
        ? String(topCategoriesList[0]._id || topCategoriesList[0].name || "Other")
        : "None";
      const topCatAmt = topCategoriesList[0]
        ? Math.round(Number(topCategoriesList[0].value) || 0).toLocaleString("en-IN")
        : "0";
      const biggestTx = sortedExpenses[0];
      const biggestTxAmt = biggestTx
        ? Math.round(convertToUnit(Number(biggestTx.amount))).toLocaleString("en-IN")
        : "0";

      return {
        headline: "Highest Spending Breakdown",
        summary: topCategoriesList[0]
          ? `Your highest spending category is ${topCatName} at ₹${topCatAmt} (${topCategoriesList[0].percentage || 0}% of expenses in ${activePeriodLabel}).${biggestTx ? ` Your single largest expense is "${biggestTx.title}" at ₹${biggestTxAmt}.` : ""}`
          : "No expense categories recorded in this period.",
        keyMetrics: topCategoriesList.map((c: any) => ({
          label: String(c._id || c.name || "Other").toUpperCase(),
          value: `₹${Math.round(Number(c.value) || 0).toLocaleString("en-IN")} (${c.percentage || 0}%)`,
        })),
        bulletPoints: sortedExpenses.slice(0, 4).map((t: any) => {
          const amt = Math.round(convertToUnit(Number(t.amount))).toLocaleString("en-IN");
          return `${t.title} (${t.category}) — ₹${amt}`;
        }),
        recommendation:
          topCategoriesList[0]
            ? `Focusing on trimming ${topCatName} spending offers the fastest path to improving your monthly cash flow.`
            : "Log your expenses consistently to unlock detailed spending insights.",
        reply: `Top category: ${topCatName} (₹${topCatAmt}). Largest transaction: ${biggestTx?.title || "N/A"} (₹${biggestTxAmt}).`,
      };
    }

    if (/\b(subscription|recurring|leak|leaks|bills)\b/i.test(lower)) {
      const recurringExpenses = expensesOnly.filter((t: any) => t.isRecurring);
      const recurringTotal = recurringExpenses.reduce(
        (sum: number, t: any) => sum + convertToUnit(Number(t.amount)),
        0
      );
      return {
        headline: "Recurring & Subscription Audit",
        summary:
          recurringExpenses.length > 0
            ? `Found ${recurringExpenses.length} recurring expense(s) totaling ₹${Math.round(recurringTotal).toLocaleString("en-IN")} per cycle.`
            : "No recurring subscriptions or automated bills are currently flagged in your ledger.",
        keyMetrics: [
          { label: "Active Subscriptions", value: `${recurringExpenses.length}` },
          {
            label: "Total Recurring",
            value: `₹${Math.round(recurringTotal).toLocaleString("en-IN")}`,
          },
        ],
        bulletPoints: recurringExpenses.slice(0, 5).map((t: any) => {
          const amt = Math.round(convertToUnit(Number(t.amount))).toLocaleString("en-IN");
          return `${t.title} (${t.recurringInterval || "MONTHLY"}) — ₹${amt}`;
        }),
        recommendation:
          recurringExpenses.length > 0
            ? "Cancel or downgrade any recurring charges you haven't used in the past 30 days."
            : "Mark monthly bills and subscriptions as recurring to track fixed commitments.",
        reply: `Recurring expenses tracked: ${recurringExpenses.length}, total ₹${Math.round(recurringTotal).toLocaleString("en-IN")}.`,
      };
    }

    if (/\b(pace|burn|runway|projection|forecast)\b/i.test(lower)) {
      const dailyBurn = currentSummary.runwayMetrics?.dailyBurnRate || Math.round(currentMonthSpent / Math.max(1, new Date().getDate()));
      const projectedMonthly = Math.round(dailyBurn * 30).toLocaleString("en-IN");
      return {
        headline: "Spending Pace & Runway",
        summary: `Your current daily burn rate is ₹${Math.round(dailyBurn).toLocaleString("en-IN")}/day, projecting ₹${projectedMonthly} over 30 days.`,
        keyMetrics: [
          { label: "Daily Burn Rate", value: `₹${Math.round(dailyBurn).toLocaleString("en-IN")}` },
          { label: "30-Day Projection", value: `₹${projectedMonthly}` },
          { label: "Portfolio Balance", value: `₹${totalBal}` },
        ],
        bulletPoints: [
          `This month's expenses so far: ₹${Math.round(currentMonthSpent).toLocaleString("en-IN")}`,
          `Monthly budget limit: ₹${budgetLimit.toLocaleString("en-IN")}`,
          `Remaining budget: ₹${remBudget}`,
        ],
        recommendation:
          budgetLimit > 0 && dailyBurn * 30 > budgetLimit
            ? "Your current pace will exceed your monthly budget limit unless daily discretionary spend slows down."
            : "Your current spending pace fits within your overall financial buffer.",
        reply: `Daily burn rate: ₹${Math.round(dailyBurn).toLocaleString("en-IN")}/day (projected ₹${projectedMonthly}/mo).`,
      };
    }

    const topCat = topCategoriesList[0]
      ? `${topCategoriesList[0]._id || topCategoriesList[0].name} (₹${Math.round(topCategoriesList[0].value).toLocaleString("en-IN")})`
      : "None recorded";

    return {
      headline: "Financial Overview",
      summary: `Your total portfolio balance is ₹${totalBal}. This period, earnings are ₹${inc} and spending is ₹${exp}, with a ${rate}% savings rate and ₹${remBudget} remaining in your monthly budget.`,
      keyMetrics: [
        { label: "Portfolio Balance", value: `₹${totalBal}` },
        { label: "Total Income", value: `₹${inc}` },
        { label: "Total Expenses", value: `₹${exp}` },
        { label: "Remaining Budget", value: `₹${remBudget}` },
      ],
      bulletPoints: [
        `Base balance: ₹${baseBalance.toLocaleString("en-IN")}`,
        `Net cash flow accrual: ${allTimeCashFlow >= 0 ? "+" : ""}₹${allTimeCashFlow.toLocaleString("en-IN")}`,
        `Top spending category: ${topCat}`,
        `Monthly budget limit: ₹${budgetLimit.toLocaleString("en-IN")}`,
      ],
      recommendation:
        rate >= 20
          ? "Great job maintaining a healthy savings rate above 20%!"
          : "Consider reducing discretionary dining and shopping to boost your monthly savings.",
      reply: `Your total portfolio balance is ₹${totalBal}. This period, earnings are ₹${inc} and spending is ₹${exp}, with a ${rate}% savings rate and ₹${remBudget} remaining in your monthly budget.\n\n• Top spending category: ${topCat}\n• Remaining budget: ₹${remBudget}\n\nTip: ${rate >= 20 ? "Great job maintaining a healthy savings rate!" : "Try to save at least 20% of your monthly income."}`,
    };
  }
};

export const getFreedomMetricsService = async (userId: string) => {
  const user = await UserModel.findById(userId).lean();
  const baseWealth = Number(user?.portfolioBalance) || 0;

  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30);
  const startOfThisMonth = startOfMonth(now);
  const startOfLastMonth = startOfMonth(subMonths(now, 1));
  const endOfLastMonth = endOfMonth(subMonths(now, 1));

  const [allTimeData, last30DaysData, thisMonthData, lastMonthData] = await Promise.all([
    TransactionModel.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalIncome: {
            $sum: { $cond: [{ $eq: ["$type", TransactionTypeEnum.INCOME] }, { $abs: "$amount" }, 0] },
          },
          totalExpenses: {
            $sum: { $cond: [{ $eq: ["$type", TransactionTypeEnum.EXPENSE] }, { $abs: "$amount" }, 0] },
          },
        },
      },
    ]),
    TransactionModel.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          type: TransactionTypeEnum.EXPENSE,
          date: { $gte: thirtyDaysAgo, $lte: now },
        },
      },
      { $group: { _id: null, totalExpenses: { $sum: { $abs: "$amount" } } } },
    ]),
    TransactionModel.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          date: { $gte: startOfThisMonth, $lte: now },
        },
      },
      {
        $group: {
          _id: null,
          income: { $sum: { $cond: [{ $eq: ["$type", TransactionTypeEnum.INCOME] }, { $abs: "$amount" }, 0] } },
          expenses: { $sum: { $cond: [{ $eq: ["$type", TransactionTypeEnum.EXPENSE] }, { $abs: "$amount" }, 0] } },
        },
      },
    ]),
    TransactionModel.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          date: { $gte: startOfLastMonth, $lte: endOfLastMonth },
        },
      },
      {
        $group: {
          _id: null,
          income: { $sum: { $cond: [{ $eq: ["$type", TransactionTypeEnum.INCOME] }, { $abs: "$amount" }, 0] } },
          expenses: { $sum: { $cond: [{ $eq: ["$type", TransactionTypeEnum.EXPENSE] }, { $abs: "$amount" }, 0] } },
        },
      },
    ]),
  ]);

  const allInc = convertToUnit(allTimeData[0]?.totalIncome || 0);
  const allExp = convertToUnit(allTimeData[0]?.totalExpenses || 0);
  const allTimeCashFlow = allInc - allExp;
  const currentNetWealth = Math.max(0, baseWealth + allTimeCashFlow);

  const last30Expenses = convertToUnit(last30DaysData[0]?.totalExpenses || 0);
  let dailyBurnRate = last30Expenses > 0 ? last30Expenses / 30 : 0;
  if (dailyBurnRate === 0 && allExp > 0) {
    dailyBurnRate = Math.max(1, allExp / 90);
  }

  const costPerDay = Math.round(dailyBurnRate);
  let totalDays = 0;
  if (dailyBurnRate > 0) {
    totalDays = Math.floor(currentNetWealth / dailyBurnRate);
  } else if (currentNetWealth > 0) {
    totalDays = 9125; // 25+ years if user has wealth with zero expenses logged
  }

  const years = Math.floor(totalDays / 365);
  const months = Math.floor((totalDays % 365) / 30);
  const days = (totalDays % 365) % 30;

  let formattedRunway = "";
  if (totalDays >= 9125) {
    formattedRunway = "25+ Years (Full Financial Independence)";
  } else if (years > 0) {
    formattedRunway = `${years}y ${months}m ${days}d`;
  } else if (months > 0) {
    formattedRunway = `${months}m ${days}d`;
  } else {
    formattedRunway = `${days} Days`;
  }

  const thisMonthInc = convertToUnit(thisMonthData[0]?.income || 0);
  const thisMonthExp = convertToUnit(thisMonthData[0]?.expenses || 0);
  const thisMonthNet = thisMonthInc - thisMonthExp;
  const freedomVelocityDays = dailyBurnRate > 0 ? parseFloat((thisMonthNet / dailyBurnRate).toFixed(1)) : 0;

  const calcProgress = (target: number) => {
    if (target <= 0) return currentNetWealth > 0 ? 100 : 0;
    return Math.min(100, Math.max(0, Math.round((currentNetWealth / target) * 100)));
  };

  const milestones = [
    {
      id: "survival_90",
      label: "90-Day Iron Fortress",
      description: "Baseline liquidity to survive sudden income disruption without debt",
      targetDays: 90,
      targetAmount: Math.round(dailyBurnRate * 90),
      isAchieved: totalDays >= 90,
      progress: calcProgress(dailyBurnRate * 90),
      daysRemaining: Math.max(0, 90 - totalDays),
    },
    {
      id: "deep_breath_180",
      label: "6-Month Deep Breath",
      description: "Half-year autonomy allowing deliberate career and investment decisions",
      targetDays: 180,
      targetAmount: Math.round(dailyBurnRate * 180),
      isAchieved: totalDays >= 180,
      progress: calcProgress(dailyBurnRate * 180),
      daysRemaining: Math.max(0, 180 - totalDays),
    },
    {
      id: "leap_year_365",
      label: "1-Year Independence Leap",
      description: "Full 365 days of self-sovereign living without paycheck reliance",
      targetDays: 365,
      targetAmount: Math.round(dailyBurnRate * 365),
      isAchieved: totalDays >= 365,
      progress: calcProgress(dailyBurnRate * 365),
      daysRemaining: Math.max(0, 365 - totalDays),
    },
    {
      id: "sabbatical_730",
      label: "2-Year Sabbatical Vault",
      description: "Multi-year freedom cushion to build ventures or take extended sabbaticals",
      targetDays: 730,
      targetAmount: Math.round(dailyBurnRate * 730),
      isAchieved: totalDays >= 730,
      progress: calcProgress(dailyBurnRate * 730),
      daysRemaining: Math.max(0, 730 - totalDays),
    },
    {
      id: "fire_perpetual",
      label: "Full Financial Independence (25x FIRE)",
      description: "Perpetual wealth generation under the classic 4% safe withdrawal rule",
      targetDays: 9125,
      targetAmount: Math.round(dailyBurnRate * 365 * 25),
      isAchieved: totalDays >= 9125,
      progress: calcProgress(dailyBurnRate * 365 * 25),
      daysRemaining: Math.max(0, 9125 - totalDays),
    },
  ];

  return {
    currentNetWealth,
    dailyBurnRate: Math.round(dailyBurnRate),
    costPerDay,
    totalFreedomDays: totalDays,
    formattedRunway,
    years,
    months,
    days,
    freedomVelocityDays,
    thisMonthNetCashFlow: Math.round(thisMonthNet),
    milestones,
    currency: user?.currency || "INR",
  };
};

export const simulatePurchaseService = async (
  userId: string,
  input: { amount: number; title: string; category?: string }
) => {
  const purchaseAmount = Math.abs(Number(input.amount));
  if (isNaN(purchaseAmount) || purchaseAmount <= 0) {
    throw new BadRequestException("Please enter a valid positive purchase amount");
  }

  const purchaseTitle = (input.title || "Target Acquisition").trim();
  const freedomData = await getFreedomMetricsService(userId);
  const { currentNetWealth, dailyBurnRate, totalFreedomDays } = freedomData;

  const freedomDaysCost = dailyBurnRate > 0 ? parseFloat((purchaseAmount / dailyBurnRate).toFixed(1)) : 0;

  const recurringTxs = await TransactionModel.find({
    userId: new mongoose.Types.ObjectId(userId),
    isRecurring: true,
  }).lean();

  const now = new Date();
  const windowStart = startOfDay(now);
  const windowEnd = endOfDay(addDays(now, 30));

  const countRecurringOccurrencesIn30Days = (tx: any): number => {
    const interval = tx.recurringInterval;
    if (interval === RecurringIntervalEnum.DAILY) return 30;
    if (interval === RecurringIntervalEnum.WEEKLY) return 4;
    if (interval === RecurringIntervalEnum.YEARLY) {
      if (!tx.nextRecurringDate && !tx.date) return 0;
      const anchor = new Date(tx.nextRecurringDate || tx.date);
      const nextThisYear = new Date(
        now.getFullYear(),
        anchor.getMonth(),
        anchor.getDate()
      );
      if (nextThisYear < windowStart) {
        nextThisYear.setFullYear(now.getFullYear() + 1);
      }
      return nextThisYear >= windowStart && nextThisYear <= windowEnd ? 1 : 0;
    }
    // Default / MONTHLY
    return 1;
  };

  let upcomingRecurringBills = 0;
  const upcomingBillsList: Array<{ title: string; amount: number; date: string }> = [];

  for (const tx of recurringTxs) {
    if (tx.type === TransactionTypeEnum.EXPENSE) {
      const occurrences = countRecurringOccurrencesIn30Days(tx);
      if (occurrences <= 0) continue;
      const singleAmt = convertToUnit(Number(tx.amount));
      const totalForBill = singleAmt * occurrences;
      upcomingRecurringBills += totalForBill;
      upcomingBillsList.push({
        title: occurrences > 1 ? `${tx.title} (${occurrences}x)` : tx.title,
        amount: Math.round(totalForBill),
        date: tx.nextRecurringDate
          ? new Date(tx.nextRecurringDate).toISOString().split("T")[0]
          : "Within 30d",
      });
    }
  }

  const postPurchaseNetWealth = currentNetWealth - purchaseAmount;
  const liquidBufferAfterBills = postPurchaseNetWealth - upcomingRecurringBills;
  const emergencyFloor90Days = dailyBurnRate * 90;
  const emergencyFloor30Days = dailyBurnRate * 30;
  const postPurchaseFreedomDays = dailyBurnRate > 0 ? Math.max(0, Math.floor(postPurchaseNetWealth / dailyBurnRate)) : totalFreedomDays;

  let verdict: "SAFE" | "CONDITIONAL" | "HIGH_RISK" = "SAFE";
  let headline = "";
  let recommendation = "";
  let tradeOffAdvice: string | null = null;

  if (liquidBufferAfterBills < 0) {
    verdict = "HIGH_RISK";
    headline = "Not Recommended: Exceeds available cash flow.";
    recommendation = `Purchasing this now will leave you with a ₹${Math.abs(Math.round(liquidBufferAfterBills)).toLocaleString("en-IN")} deficit after upcoming bills (₹${Math.round(upcomingRecurringBills).toLocaleString("en-IN")}) are paid.`;
    tradeOffAdvice = "Postpone this purchase until your next income cycle.";
  } else if (postPurchaseNetWealth < emergencyFloor30Days) {
    verdict = "CONDITIONAL";
    headline = "Caution: Leaves less than 30 days of reserves.";
    recommendation = `You have enough funds to cover this and upcoming bills with ₹${Math.round(liquidBufferAfterBills).toLocaleString("en-IN")} remaining, but your emergency runway drops to ${postPurchaseFreedomDays} days.`;
    tradeOffAdvice = "Ensure no unexpected expenses arise before your next deposit.";
  } else if (postPurchaseNetWealth < emergencyFloor90Days) {
    verdict = "CONDITIONAL";
    headline = "Caution: Leaves a narrow safety buffer.";
    recommendation = `You have sufficient funds (₹${Math.round(liquidBufferAfterBills).toLocaleString("en-IN")} remaining after upcoming bills), but it leaves less than 3 months of emergency savings.`;
    tradeOffAdvice = "Consider pacing other discretionary spending over the next two weeks.";
  } else {
    verdict = "SAFE";
    headline = "Affordable: Fits comfortably within your current reserves.";
    recommendation = `Your balance comfortably covers this ₹${purchaseAmount.toLocaleString("en-IN")} expense while keeping your emergency buffer intact.`;
    tradeOffAdvice = null;
  }

  return {
    purchaseTitle,
    purchaseAmount,
    freedomDaysCost,
    currentFreedomDays: totalFreedomDays,
    postPurchaseFreedomDays,
    currentNetWealth,
    postPurchaseNetWealth: Math.round(postPurchaseNetWealth),
    liquidBufferAfterBills: Math.round(liquidBufferAfterBills),
    upcomingRecurringBills: Math.round(upcomingRecurringBills),
    emergencyFloor: Math.round(emergencyFloor90Days),
    verdict,
    headline,
    recommendation,
    tradeOffAdvice,
    upcomingBills: upcomingBillsList.slice(0, 5),
  };
};

export const getLiquidityRadarService = async (userId: string) => {
  const freedomData = await getFreedomMetricsService(userId);
  const { currentNetWealth, dailyBurnRate } = freedomData;

  const now = new Date();
  const recurringTxs = await TransactionModel.find({
    userId: new mongoose.Types.ObjectId(userId),
    isRecurring: true,
  }).lean();

  let runningBalance = currentNetWealth;
  const trajectory: Array<{
    date: string;
    dayLabel: string;
    balance: number;
    dailyBurn: number;
    inflows: number;
    outflows: number;
    events: string[];
  }> = [];

  let valleyBalance = runningBalance;
  let valleyDate = format(now, "yyyy-MM-dd");
  let valleyDayLabel = format(now, "MMM dd");

  for (let i = 0; i <= 30; i++) {
    const curDate = addDays(now, i);
    const dateStr = format(curDate, "yyyy-MM-dd");
    const dayLabel = format(curDate, "MMM dd");
    const dayNum = curDate.getDate();

    let dayInflows = 0;
    let dayOutflows = 0;
    const events: string[] = [];

    for (const tx of recurringTxs) {
      let isDue = false;
      const anchor = tx.nextRecurringDate
        ? new Date(tx.nextRecurringDate)
        : tx.date
        ? new Date(tx.date)
        : null;

      if (anchor && !Number.isNaN(anchor.getTime())) {
        const curStart = startOfDay(curDate);
        const anchorStart = startOfDay(anchor);
        const interval = tx.recurringInterval;

        if (interval === RecurringIntervalEnum.DAILY) {
          isDue = curStart >= anchorStart || !tx.nextRecurringDate;
        } else if (interval === RecurringIntervalEnum.WEEKLY) {
          const daysApart = differenceInDays(curStart, anchorStart);
          isDue =
            daysApart >= 0
              ? daysApart % 7 === 0
              : Math.abs(daysApart) % 7 === 0 && !tx.nextRecurringDate;
        } else if (interval === RecurringIntervalEnum.YEARLY) {
          isDue =
            curDate.getMonth() === anchor.getMonth() &&
            curDate.getDate() === anchor.getDate() &&
            curStart >= anchorStart;
        } else {
          // MONTHLY or unspecified: match calendar day (or last day of shorter months)
          const lastDayOfMonth = endOfMonth(curDate).getDate();
          const targetDay = Math.min(anchor.getDate(), lastDayOfMonth);
          isDue = dayNum === targetDay && (curStart >= anchorStart || !tx.nextRecurringDate);
        }
      }

      if (isDue) {
        const amt = convertToUnit(Number(tx.amount));
        if (tx.type === TransactionTypeEnum.INCOME) {
          dayInflows += amt;
          events.push(`+₹${Math.round(amt).toLocaleString("en-IN")} (${tx.title})`);
        } else {
          dayOutflows += amt;
          events.push(`-₹${Math.round(amt).toLocaleString("en-IN")} (${tx.title})`);
        }
      }
    }

    if (i > 0) {
      runningBalance = runningBalance - dailyBurnRate + dayInflows - dayOutflows;
    }

    const roundedBal = Math.round(runningBalance);
    trajectory.push({
      date: dateStr,
      dayLabel,
      balance: roundedBal,
      dailyBurn: Math.round(dailyBurnRate),
      inflows: Math.round(dayInflows),
      outflows: Math.round(dayOutflows),
      events,
    });

    if (roundedBal < valleyBalance) {
      valleyBalance = roundedBal;
      valleyDate = dateStr;
      valleyDayLabel = dayLabel;
    }
  }

  const valleySafetyDays = dailyBurnRate > 0 ? parseFloat((valleyBalance / dailyBurnRate).toFixed(1)) : 0;
  const valleyRisk: "DEFICIT" | "TIGHT" | "OPTIMAL" =
    valleyBalance < 0 ? "DEFICIT" : valleyBalance < dailyBurnRate * 15 ? "TIGHT" : "OPTIMAL";

  return {
    currentNetWealth: Math.round(currentNetWealth),
    dailyBurnRate: Math.round(dailyBurnRate),
    trajectory,
    valley: {
      date: valleyDate,
      dayLabel: valleyDayLabel,
      balance: valleyBalance,
      safetyDays: valleySafetyDays,
      riskLevel: valleyRisk,
      description:
        valleyRisk === "DEFICIT"
          ? `Estimated low of ₹${valleyBalance.toLocaleString("en-IN")} on ${valleyDayLabel}`
          : valleyRisk === "TIGHT"
          ? `Estimated low of ₹${valleyBalance.toLocaleString("en-IN")} on ${valleyDayLabel}`
          : `Projected minimum of ₹${valleyBalance.toLocaleString("en-IN")} on ${valleyDayLabel}`,
    },
    thirtyDayNetChange: Math.round(runningBalance - currentNetWealth),
  };
};

