import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middlerware";
import { HTTPSTATUS } from "../config/http.config";
import { objectIdSchema } from "../validators/transaction.validator";
import {
  createSplitSchema,
  createSplitService,
  deleteSplitService,
  getAllSplitsService,
  settleSplitSchema,
  settleSplitService,
} from "../services/split.service";

export const getAllSplitsController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const result = await getAllSplitsService(userId);
    return res.status(HTTPSTATUS.OK).json({
      message: "Splits fetched successfully",
      ...result,
    });
  }
);

export const createSplitController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const body = createSplitSchema.parse(req.body);
    const split = await createSplitService(userId, body);
    return res.status(HTTPSTATUS.CREATED).json({
      message: "Split / IOU created successfully",
      split,
    });
  }
);

export const settleSplitController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const splitId = objectIdSchema.parse(req.params.id);
    const body = settleSplitSchema.parse(req.body);
    const result = await settleSplitService(userId, splitId, body);
    return res.status(HTTPSTATUS.OK).json({
      message: "Split settled successfully",
      ...result,
    });
  }
);

export const deleteSplitController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const splitId = objectIdSchema.parse(req.params.id);
    await deleteSplitService(userId, splitId);
    return res.status(HTTPSTATUS.OK).json({
      message: "Split deleted successfully",
    });
  }
);
