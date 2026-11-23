import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middlerware";
import { HTTPSTATUS } from "../config/http.config";
import {
  generateReportService,
  getAllReportsService,
  updateReportSettingService,
  resendReportService,
  createInstantReportService,
} from "../services/report.service";
import {
  generateReportQuerySchema,
  instantReportBodySchema,
  reportIdParamSchema,
  reportPaginationQuerySchema,
  updateReportSettingSchema,
} from "../validators/report.validator";

export const getAllReportsController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const pagination = reportPaginationQuerySchema.parse(req.query);

    const result = await getAllReportsService(userId, pagination);

    return res.status(HTTPSTATUS.OK).json({
      message: "Reports history fetched successfully",
      ...result,
    });
  }
);

export const updateReportSettingController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const body = updateReportSettingSchema.parse(req.body);

    await updateReportSettingService(userId, body);

    return res.status(HTTPSTATUS.OK).json({
      message: "Reports setting updated successfully",
    });
  }
);

export const generateReportController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const { from, to } = generateReportQuerySchema.parse(req.query);
    const fromDate = new Date(from);
    const toDate = new Date(to);

    const result = await generateReportService(userId, fromDate, toDate);

    return res.status(HTTPSTATUS.OK).json({
      message: "Report generated successfully",
      ...result,
    });
  }
);

export const resendReportController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const reportId = reportIdParamSchema.parse(req.params.id);

    const result = await resendReportService(userId, reportId);

    return res.status(HTTPSTATUS.OK).json({
      message: "Report resent successfully to registered email",
      report: result,
    });
  }
);

export const createInstantReportController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const { from, to, sendEmail } = instantReportBodySchema.parse(req.body);
    const toDate = to ? new Date(to) : new Date();
    const fromDate = from
      ? new Date(from)
      : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const shouldSendEmail = sendEmail === true || sendEmail === "true";

    const result = await createInstantReportService(
      userId,
      fromDate,
      toDate,
      shouldSendEmail
    );

    return res.status(HTTPSTATUS.CREATED).json({
      message: shouldSendEmail
        ? "Instant report generated and emailed successfully"
        : "Instant report generated successfully",
      data: result,
    });
  }
);
