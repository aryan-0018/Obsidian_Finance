import mongoose from "mongoose";
import ReportSettingModel from "../models/report-setting.model";
import ReportModel, { ReportStatusEnum } from "../models/report.model";
import UserModel from "../models/user.model";
import TransactionModel, {
  TransactionTypeEnum,
} from "../models/transaction.model";
import { NotFoundException } from "../utils/app-error";
import { calulateNextReportDate } from "../utils/helper";
import { UpdateReportSettingType } from "../validators/report.validator";
import { convertToUnit } from "../utils/format-currency";
import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { genAI, genAIModel } from "../config/google-ai.config";
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

  console.log(nextReportDate, "nextReportDate");

  existingReportSetting.set({
    ...body,
    nextReportDate,
  });

  await existingReportSetting.save();
};

export const resendReportService = async (
  userId: string,
  reportId: string
) => {
  const report = await ReportModel.findOne({ _id: reportId, userId });
  if (!report) throw new NotFoundException("Report not found");

  const user = await UserModel.findById(userId);
  if (!user || !user.email) throw new NotFoundException("User not found");

  const setting = await ReportSettingModel.findOne({ userId });
  const frequency = setting?.frequency || "MONTHLY";

  const sentMonth = report.sentDate || report.createdAt;
  const from = startOfMonth(subMonths(sentMonth, 1));
  const to = endOfMonth(subMonths(sentMonth, 1));

  const generated = await generateReportService(userId, from, to);

  await sendReportEmail({
    email: user.email,
    username: user.name || "User",
    report: {
      period: report.period,
      totalIncome: generated?.summary.income || 0,
      totalExpenses: generated?.summary.expenses || 0,
      availableBalance: generated?.summary.balance || 0,
      savingsRate: generated?.summary.savingsRate || 0,
      topSpendingCategories: generated?.summary.topCategories || [],
      insights: generated?.insights || ["Monthly financial summary"],
    },
    frequency,
  });

  report.sentDate = new Date();
  report.status = ReportStatusEnum.SENT;
  await report.save();

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

  const setting = await ReportSettingModel.findOne({ userId });
  const frequency = setting?.frequency || "MONTHLY";

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
        },
        frequency,
      });
      emailSent = true;
    } catch (err) {
      console.error("Failed to email instant report:", err);
    }
  }

  const savedReport = await ReportModel.create({
    userId,
    period: report.period,
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

  console.log(results[0], "results");

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

  const periodLabel = `${format(fromDate, "MMMM d")} - ${format(toDate, "d, yyyy")}`;

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
  try {
    const prompt = reportInsightPrompt({
      totalIncome: convertToUnit(totalIncome),
      totalExpenses: convertToUnit(totalExpenses),
      availableBalance: convertToUnit(availableBalance),
      savingsRate: Number(savingsRate.toFixed(1)),
      categories,
      periodLabel,
    });

    const result = await genAI.models.generateContent({
      model: genAIModel,
      contents: [createUserContent([prompt])],
      config: {
        responseMimeType: "application/json",
      },
    });

    const response = result.text;
    const cleanedText = response?.replace(/```(?:json)?\n?/g, "").trim();

    if (!cleanedText) return [];

    const data = JSON.parse(cleanedText);
    return data;
  } catch (error) {
    return [];
  }
}

function calculateSavingRate(totalIncome: number, totalExpenses: number) {
  if (totalIncome <= 0) return 0;
  const savingRate = ((totalIncome - totalExpenses) / totalIncome) * 100;
  return parseFloat(savingRate.toFixed(2));
}
