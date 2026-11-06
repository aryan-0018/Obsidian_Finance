import mongoose from "mongoose";
import ReportSettingModel from "../models/report-setting.model";
import ReportModel, { ReportStatusEnum } from "../models/report.model";
import UserModel from "../models/user.model";
import TransactionModel, {
  TransactionTypeEnum,
} from "../models/transaction.model";
import { NotFoundException, BadRequestException } from "../utils/app-error";
import { calulateNextReportDate } from "../utils/helper";
import { UpdateReportSettingType } from "../validators/report.validator";
import { convertToUnit } from "../utils/format-currency";
import {
  endOfMonth,
  format,
  startOfMonth,
  subMonths,
  startOfDay,
  endOfDay,
} from "date-fns";
import { genAI, genAIModel, generateContentWithRetry } from "../config/google-ai.config";
import { createUserContent } from "@google/genai";
import { reportInsightPrompt } from "../utils/prompt";
import { sendReportEmail } from "../mailers/report.mailer";

export const getAllReportsService = async (
  userId: string,
  pagination: {
    pageSize: number;
    pageNumber: number;
  }
) => {
  const query: Record<string, any> = { userId };

  const { pageSize, pageNumber } = pagination;
  const skip = (pageNumber - 1) * pageSize;

  const [reports, totalCount] = await Promise.all([
    ReportModel.find(query).skip(skip).limit(pageSize).sort({ createdAt: -1 }),
    ReportModel.countDocuments(query),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    reports,
    pagination: {
      pageSize,
      pageNumber,
      totalCount,
      totalPages,
      skip,
    },
  };
};

export const updateReportSettingService = async (
  userId: string,
  body: UpdateReportSettingType
) => {
  const { isEnabled } = body;
  let nextReportDate: Date | null = null;

  const existingReportSetting = await ReportSettingModel.findOne({
    userId,
  });
  if (!existingReportSetting)
    throw new NotFoundException("Report setting not found");

  //   const frequency =
  //     existingReportSetting.frequency || ReportFrequencyEnum.MONTHLY;

  if (isEnabled) {
    const currentNextReportDate = existingReportSetting.nextReportDate;
    const now = new Date();
    if (!currentNextReportDate || currentNextReportDate <= now) {
      nextReportDate = calulateNextReportDate(
        existingReportSetting.lastSentDate
      );
    } else {
      nextReportDate = currentNextReportDate;
    }
  }

  existingReportSetting.set({
    ...body,
    nextReportDate,
  });

  await existingReportSetting.save();
};

export function parseReportPeriod(
  period: string,
  fallbackDate: Date = new Date()
): { from: Date; to: Date } {
  const p = (period || "").trim();
  if (/^all\s*time$/i.test(p)) {
    return { from: new Date(0), to: endOfDay(new Date()) };
  }

  // Single month pattern: e.g. "March 2026"
  const singleMonthMatch = p.match(/^([a-zA-Z]+)\s+(\d{4})$/);
  if (singleMonthMatch) {
    const d = new Date(`${p} 1`);
    if (!isNaN(d.getTime())) {
      return { from: startOfMonth(d), to: endOfMonth(d) };
    }
  }

  // Dash pattern: e.g. "Jan 1, 2020 - Nov 6, 2026" or "November 1 - 6, 2026"
  const dashParts = p.split(/\s*-\s*/);
  if (dashParts.length === 2) {
    const p1 = dashParts[0].trim();
    const p2 = dashParts[1].trim();

    const yearMatch = p2.match(/\b(\d{4})\b/) || p1.match(/\b(\d{4})\b/);
    const year = yearMatch
      ? yearMatch[1]
      : fallbackDate instanceof Date
      ? fallbackDate.getFullYear()
      : new Date().getFullYear();

    let d2 = new Date(p2);
    if (isNaN(d2.getTime())) {
      const p1Month = p1.match(/^([a-zA-Z]+)/);
      if (p1Month) {
        d2 = new Date(`${p1Month[1]} ${p2}`);
      }
    }

    let d1Str = p1;
    if (!p1.match(/\b\d{4}\b/)) {
      d1Str = `${p1}, ${year}`;
    }
    const d1 = new Date(d1Str);

    if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
      return { from: startOfDay(d1), to: endOfDay(d2) };
    }
  }

  const sentMonth = fallbackDate instanceof Date ? fallbackDate : new Date();
  return {
    from: startOfMonth(subMonths(sentMonth, 1)),
    to: endOfMonth(subMonths(sentMonth, 1)),
  };
}

export const resendReportService = async (
  userId: string,
  reportId: string
) => {
  const report = await ReportModel.findOne({ _id: reportId, userId });
  if (!report) throw new NotFoundException("Report not found");

  const user = await UserModel.findById(userId);
  if (!user || !user.email)
    throw new NotFoundException("User not found or email address missing");

  const setting = await ReportSettingModel.findOne({ userId });
  const frequency = setting?.frequency || "MONTHLY";

  let from: Date | undefined = report.fromDate;
  let to: Date | undefined = report.toDate;

  if (!from || !to) {
    const parsed = parseReportPeriod(
      report.period,
      report.sentDate || report.createdAt
    );
    from = parsed.from;
    to = parsed.to;
  }

  const generated = await generateReportService(userId, from, to);
  if (!generated) {
    throw new BadRequestException(
      `No transaction records found for period "${report.period}" to resend.`
    );
  }

  try {
    await sendReportEmail({
      email: user.email,
      username: user.name || "User",
      report: {
        period: report.period,
        totalIncome: generated.summary.income,
        totalExpenses: generated.summary.expenses,
        availableBalance: generated.summary.balance,
        savingsRate: generated.summary.savingsRate,
        topSpendingCategories: generated.summary.topCategories,
        insights: generated.insights,
        recentTransactions: generated.recentTransactions,
      },
      frequency,
    });

    report.sentDate = new Date();
    report.status = ReportStatusEnum.SENT;
    if (!report.fromDate) report.fromDate = from;
    if (!report.toDate) report.toDate = to;
    await report.save();
  } catch (err: any) {
    report.status = ReportStatusEnum.FAILED;
    await report.save();
    throw new BadRequestException(
      `Failed to deliver report email: ${err?.message || "SMTP error"}`
    );
  }

  return report;
};

export const createInstantReportService = async (
  userId: string,
  fromDate: Date,
  toDate: Date,
  shouldSendEmail: boolean = true
) => {
  const report = await generateReportService(userId, fromDate, toDate);
  if (!report) {
    throw new NotFoundException(
      "No financial activity found for this period to generate a report."
    );
  }

  const user = await UserModel.findById(userId);
  if (!user) throw new NotFoundException("User not found");

  let emailSent = false;
  if (shouldSendEmail && user.email) {
    try {
      await sendReportEmail({
        email: user.email,
        username: user.name || "User",
        report: {
          period: report.period,
          totalIncome: report.summary.income,
          totalExpenses: report.summary.expenses,
          availableBalance: report.summary.balance,
          savingsRate: report.summary.savingsRate,
          topSpendingCategories: report.summary.topCategories,
          insights: report.insights,
          recentTransactions: report.recentTransactions,
        },
        frequency: "Instant",
      });
      emailSent = true;
    } catch (err) {
      console.error("Failed to email instant report:", err);
    }
  }

  const savedReport = await ReportModel.create({
    userId,
    period: report.period,
    fromDate,
    toDate,
    sentDate: new Date(),
    status: emailSent
      ? ReportStatusEnum.SENT
      : shouldSendEmail
      ? ReportStatusEnum.FAILED
      : ReportStatusEnum.PENDING,
  });

  return {
    ...report,
    savedReport,
    emailSent,
  };
};

export const generateReportService = async (
  userId: string,
  fromDate: Date,
  toDate: Date
) => {
  const results = await TransactionModel.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        date: { $gte: fromDate, $lte: toDate },
      },
    },
    {
      $facet: {
        summary: [
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
        ],

        categories: [
          {
            $match: { type: TransactionTypeEnum.EXPENSE },
          },
          {
            $group: {
              _id: "$category",
              total: { $sum: { $abs: "$amount" } },
            },
          },
          {
            $sort: { total: -1 },
          },
          {
            $limit: 5,
          },
        ],
      },
    },
    {
      $project: {
        totalIncome: {
          $arrayElemAt: ["$summary.totalIncome", 0],
        },
        totalExpenses: {
          $arrayElemAt: ["$summary.totalExpenses", 0],
        },
        categories: 1,
      },
    },
  ]);

  if (
    !results?.length ||
    (results[0]?.totalIncome === 0 && results[0]?.totalExpenses === 0)
  )
    return null;

  const {
    totalIncome = 0,
    totalExpenses = 0,
    categories = [],
  } = results[0] || {};

  const byCategory = categories.reduce(
    (acc: any, { _id, total }: any) => {
      acc[_id] = {
        amount: convertToUnit(total),
        percentage:
          totalExpenses > 0 ? Math.round((total / totalExpenses) * 100) : 0,
      };
      return acc;
    },
    {} as Record<string, { amount: number; percentage: number }>
  );

  const availableBalance = totalIncome - totalExpenses;
  const savingsRate = calculateSavingRate(totalIncome, totalExpenses);

  // Accurate period formatting
  const fromMonth = format(fromDate, "MMMM");
  const toMonth = format(toDate, "MMMM");
  const fromYear = format(fromDate, "yyyy");
  const toYear = format(toDate, "yyyy");

  let periodLabel = `${fromMonth} ${format(fromDate, "d")} - ${toMonth} ${format(toDate, "d, yyyy")}`;
  if (fromDate.getFullYear() < 2000) {
    periodLabel = "All Time";
  } else if (fromYear === toYear && fromMonth === toMonth) {
    if (
      format(fromDate, "d") === "1" &&
      format(toDate, "d") === format(endOfMonth(fromDate), "d")
    ) {
      periodLabel = `${fromMonth} ${fromYear}`;
    } else {
      periodLabel = `${fromMonth} ${format(fromDate, "d")} - ${format(
        toDate,
        "d, yyyy"
      )}`;
    }
  } else if (fromYear !== toYear) {
    periodLabel = `${format(fromDate, "MMM d, yyyy")} - ${format(
      toDate,
      "MMM d, yyyy"
    )}`;
  }

  // Fetch transactions during this period for detailed email representation
  const rawTransactions = await TransactionModel.find({
    userId: new mongoose.Types.ObjectId(userId),
    date: { $gte: fromDate, $lte: toDate },
  })
    .sort({ date: -1 })
    .limit(20);

  const recentTransactions = rawTransactions.map((tx) => ({
    title: tx.title,
    category: tx.category,
    type: tx.type,
    amount: Math.abs(tx.amount),
    date: tx.date,
  }));

  const insights = await generateInsightsAI({
    totalIncome,
    totalExpenses,
    availableBalance,
    savingsRate,
    categories: byCategory,
    periodLabel: periodLabel,
  });

  return {
    period: periodLabel,
    summary: {
      income: convertToUnit(totalIncome),
      expenses: convertToUnit(totalExpenses),
      balance: convertToUnit(availableBalance),
      savingsRate: Number(savingsRate.toFixed(1)),
      topCategories: Object.entries(byCategory)?.map(([name, cat]: any) => ({
        name,
        amount: cat.amount,
        percent: cat.percentage,
      })),
    },
    recentTransactions,
    insights,
  };
};

async function generateInsightsAI({
  totalIncome,
  totalExpenses,
  availableBalance,
  savingsRate,
  categories,
  periodLabel,
}: {
  totalIncome: number;
  totalExpenses: number;
  availableBalance: number;
  savingsRate: number;
  categories: Record<string, { amount: number; percentage: number }>;
  periodLabel: string;
}) {
  const topCatNames = Object.keys(categories);
  const fallbackInsights = [
    `Total expenditure for ${periodLabel} was ₹${convertToUnit(
      totalExpenses
    ).toLocaleString("en-IN")}, against an income of ₹${convertToUnit(
      totalIncome
    ).toLocaleString("en-IN")}.`,
    `A savings rate of ${savingsRate.toFixed(
      1
    )}% was achieved with an available balance of ₹${convertToUnit(
      availableBalance
    ).toLocaleString("en-IN")}.`,
    topCatNames.length > 0
      ? `Highest spending category was ${topCatNames[0]} at ₹${Number(
          categories[topCatNames[0]].amount
        ).toLocaleString("en-IN")} (${categories[topCatNames[0]].percentage}%).`
      : "Spending remained well within allocations during this period.",
  ];

  try {
    const prompt = reportInsightPrompt({
      totalIncome: convertToUnit(totalIncome),
      totalExpenses: convertToUnit(totalExpenses),
      availableBalance: convertToUnit(availableBalance),
      savingsRate: Number(savingsRate.toFixed(1)),
      categories,
      periodLabel,
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("AI insights timeout")), 5000)
    );

    const generatePromise = generateContentWithRetry({
      contents: [createUserContent([prompt])],
      config: {
        responseMimeType: "application/json",
      },
    });

    const result = await Promise.race([generatePromise, timeoutPromise]);
    const response = (result as any).text;
    const cleanedText = response?.replace(/```(?:json)?\n?/g, "").trim();

    if (!cleanedText) return fallbackInsights;

    const data = JSON.parse(cleanedText);
    return Array.isArray(data) && data.length > 0 ? data : fallbackInsights;
  } catch (error) {
    return fallbackInsights;
  }
}

function calculateSavingRate(totalIncome: number, totalExpenses: number) {
  if (totalIncome <= 0) return 0;
  const savingRate = ((totalIncome - totalExpenses) / totalIncome) * 100;
  return parseFloat(savingRate.toFixed(2));
}
