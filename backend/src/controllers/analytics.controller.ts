import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middlerware";
import { HTTPSTATUS } from "../config/http.config";
import { DateRangePreset } from "../enums/date-range.enum";
import {
  chartAnalyticsService,
  expensePieChartBreakdownService,
  summaryAnalyticsService,
  generateAiInsightsService,
  chatWithAiFinancialAdvisorService,
} from "../services/analytics.service";
import { processVoiceCommandService } from "../services/voice-terminal.service";

export const summaryAnalyticsController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;

    const { preset, from, to } = req.query;

    const filter = {
      dateRangePreset: preset as DateRangePreset,
      customFrom: from ? new Date(from as string) : undefined,
      customTo: to ? new Date(to as string) : undefined,
    };
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
    const userId = req.user?._id;
    const { preset, from, to } = req.query;

    const filter = {
      dateRangePreset: preset as DateRangePreset,
      customFrom: from ? new Date(from as string) : undefined,
      customTo: to ? new Date(to as string) : undefined,
    };

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
    const userId = req.user?._id;
    const { preset, from, to } = req.query;

    const filter = {
      dateRangePreset: preset as DateRangePreset,
      customFrom: from ? new Date(from as string) : undefined,
      customTo: to ? new Date(to as string) : undefined,
    };
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
    const userId = req.user?._id;
    if (!userId) {
      return res.status(HTTPSTATUS.UNAUTHORIZED).json({ message: "Unauthorized" });
    }

    const { preset, from, to } = req.query;
    const dateRangePreset = preset as DateRangePreset | undefined;
    const customFrom = from ? new Date(from as string) : undefined;
    const customTo = to ? new Date(to as string) : undefined;

    const insight = await generateAiInsightsService(
      userId as string,
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
    const userId = req.user?._id;
    if (!userId) {
      return res.status(HTTPSTATUS.UNAUTHORIZED).json({ message: "Unauthorized" });
    }

    const { message, history, currentRange } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(HTTPSTATUS.BAD_REQUEST).json({ message: "A message string is required" });
    }

    const result = await chatWithAiFinancialAdvisorService(
      userId as string,
      message,
      Array.isArray(history) ? history : [],
      currentRange
    );

    return res.status(HTTPSTATUS.OK).json({
      message: "AI Advisor response generated",
      ...result,
    });
  }
);

export const voiceTerminalCommandController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id?.toString();
    const transcript = req.body?.transcript;

    const result = await processVoiceCommandService(userId, transcript);

    return res.status(HTTPSTATUS.OK).json({
      message: "Voice command processed successfully",
      data: result,
    });
  }
);


