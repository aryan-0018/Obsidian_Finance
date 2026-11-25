import { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../middlewares/asyncHandler.middlerware";
import { HTTPSTATUS } from "../config/http.config";
import { DateRangeEnum, DateRangePreset } from "../enums/date-range.enum";
import { BadRequestException } from "../utils/app-error";
import {
  chartAnalyticsService,
  expensePieChartBreakdownService,
  summaryAnalyticsService,
  generateAiInsightsService,
  chatWithAiFinancialAdvisorService,
  getFreedomMetricsService,
  simulatePurchaseService,
  getLiquidityRadarService,
} from "../services/analytics.service";
import { processVoiceCommandService } from "../services/voice-terminal.service";
import {
  formatWeeklyDigestHtml,
  generateWeeklyDigestService,
  getSubscriptionRadarService,
  sendWeeklyDigestToTelegramService,
} from "../services/radar-digest.service";

const validPresets = new Set<string>(Object.values(DateRangeEnum));

const parseRangeQuery = (query: Request["query"]) => {
  const rawPreset = typeof query.preset === "string" ? query.preset : undefined;
  if (rawPreset && !validPresets.has(rawPreset)) {
    throw new BadRequestException(`Invalid date range preset: ${rawPreset}`);
  }

  let customFrom: Date | undefined;
  let customTo: Date | undefined;

  if (query.from !== undefined && query.from !== "") {
    customFrom = new Date(String(query.from));
    if (Number.isNaN(customFrom.getTime())) {
      throw new BadRequestException("Invalid 'from' date parameter");
    }
  }

  if (query.to !== undefined && query.to !== "") {
    customTo = new Date(String(query.to));
    if (Number.isNaN(customTo.getTime())) {
      throw new BadRequestException("Invalid 'to' date parameter");
    }
  }

  if (customFrom && customTo && customFrom > customTo) {
    throw new BadRequestException("'from' date cannot be after 'to' date");
  }

  return {
    dateRangePreset: rawPreset as DateRangePreset | undefined,
    customFrom,
    customTo,
  };
};

const aiChatBodySchema = z.object({
  message: z.string().trim().min(1, "A message string is required").max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "model"]),
        parts: z
          .string()
          .optional()
          .transform((s) => (s ? s.slice(0, 4000) : s)),
        content: z
          .string()
          .optional()
          .transform((s) => (s ? s.slice(0, 4000) : s)),
      })
    )
    .optional()
    .default([])
    .transform((arr) => arr.slice(-20)),
  currentRange: z
    .object({
      label: z.string().max(100).optional(),
      value: z.string().max(50).optional(),
      from: z.string().nullable().optional(),
      to: z.string().nullable().optional(),
    })
    .optional(),
});

const voiceCommandSchema = z.object({
  transcript: z.string().trim().min(1, "Transcript is required").max(1000),
});

const simulatePurchaseSchema = z.object({
  amount: z.coerce
    .number()
    .finite("Amount must be a valid number")
    .positive("Purchase amount must be positive")
    .max(1_000_000_000_000),
  title: z.string().trim().min(1).max(200).optional().default("Target Purchase"),
  category: z.string().trim().max(100).optional(),
});

export const summaryAnalyticsController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const filter = parseRangeQuery(req.query);

    const stats = await summaryAnalyticsService(
      userId,
      filter.dateRangePreset,
      filter.customFrom,
      filter.customTo
    );

    return res.status(HTTPSTATUS.OK).json({
      message: "Summary fetched successfully",
      data: stats,
    });
  }
);

export const chartAnalyticsController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const filter = parseRangeQuery(req.query);

    const chartData = await chartAnalyticsService(
      userId,
      filter.dateRangePreset,
      filter.customFrom,
      filter.customTo
    );

    return res.status(HTTPSTATUS.OK).json({
      message: "Chart fetched successfully",
      data: chartData,
    });
  }
);

export const expensePieChartBreakdownController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const filter = parseRangeQuery(req.query);

    const pieChartData = await expensePieChartBreakdownService(
      userId,
      filter.dateRangePreset,
      filter.customFrom,
      filter.customTo
    );

    return res.status(HTTPSTATUS.OK).json({
      message: "Expense breakdown fetched successfully",
      data: pieChartData,
    });
  }
);

export const generateAiInsightsController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const { dateRangePreset, customFrom, customTo } = parseRangeQuery(req.query);

    const insight = await generateAiInsightsService(
      userId,
      dateRangePreset,
      customFrom,
      customTo
    );

    return res.status(HTTPSTATUS.OK).json({
      message: "AI Insight generated successfully",
      data: insight,
    });
  }
);

export const chatAiAdvisorController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const { message, history, currentRange } = aiChatBodySchema.parse(req.body);
    const normalizedHistory = history.map((item) => ({
      role: item.role === "user" ? ("user" as const) : ("model" as const),
      parts: item.parts ?? item.content ?? "",
    }));

    const normalizedRange = currentRange
      ? {
          label: currentRange.label,
          value: currentRange.value,
          from: currentRange.from ?? undefined,
          to: currentRange.to ?? undefined,
        }
      : undefined;

    const result = await chatWithAiFinancialAdvisorService(
      userId,
      message,
      normalizedHistory,
      normalizedRange
    );

    return res.status(HTTPSTATUS.OK).json({
      message: "AI Advisor response generated",
      ...result,
    });
  }
);

export const voiceTerminalCommandController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const { transcript } = voiceCommandSchema.parse(req.body);

    const result = await processVoiceCommandService(userId, transcript);

    return res.status(HTTPSTATUS.OK).json({
      message: "Voice command processed successfully",
      data: result,
    });
  }
);

export const getFreedomMetricsController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const data = await getFreedomMetricsService(userId);

    return res.status(HTTPSTATUS.OK).json({
      message: "Freedom metrics retrieved successfully",
      data,
    });
  }
);

export const simulatePurchaseController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const payload = simulatePurchaseSchema.parse(req.body);

    const data = await simulatePurchaseService(userId, payload);

    return res.status(HTTPSTATUS.OK).json({
      message: "Purchase simulation calculated",
      data,
    });
  }
);

export const getLiquidityRadarController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const data = await getLiquidityRadarService(userId);

    return res.status(HTTPSTATUS.OK).json({
      message: "30-day liquidity radar calculated",
      data,
    });
  }
);

export const getSubscriptionRadarController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const data = await getSubscriptionRadarService(userId);

    return res.status(HTTPSTATUS.OK).json({
      message: "Subscription and EMI radar calculated",
      data,
    });
  }
);

export const getWeeklyDigestController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const digest = await generateWeeklyDigestService(userId);

    return res.status(HTTPSTATUS.OK).json({
      message: "Weekly digest generated",
      data: {
        ...digest,
        htmlPreview: formatWeeklyDigestHtml(digest),
      },
    });
  }
);

export const sendWeeklyDigestController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const result = await sendWeeklyDigestToTelegramService(userId);

    return res.status(HTTPSTATUS.OK).json({
      message: result.sent
        ? "Weekly digest dispatched to your Telegram Copilot"
        : result.reason,
      ...result,
    });
  }
);
