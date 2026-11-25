import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middlerware";
import { HTTPSTATUS } from "../config/http.config";
import { objectIdSchema } from "../validators/transaction.validator";
import {
  contributeGoalSchema,
  contributeToGoalService,
  createGoalSchema,
  createGoalService,
  deleteGoalService,
  getAllGoalsService,
  updateGoalSchema,
  updateGoalService,
} from "../services/goal.service";

export const getAllGoalsController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const result = await getAllGoalsService(userId);
    return res.status(HTTPSTATUS.OK).json({
      message: "Savings goals fetched successfully",
      ...result,
    });
  }
);

export const createGoalController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const body = createGoalSchema.parse(req.body);
    const goal = await createGoalService(userId, body);
    return res.status(HTTPSTATUS.CREATED).json({
      message: "Savings goal created successfully",
      goal,
    });
  }
);

export const updateGoalController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const goalId = objectIdSchema.parse(req.params.id);
    const body = updateGoalSchema.parse(req.body);
    const goal = await updateGoalService(userId, goalId, body);
    return res.status(HTTPSTATUS.OK).json({
      message: "Savings goal updated successfully",
      goal,
    });
  }
);

export const contributeGoalController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const goalId = objectIdSchema.parse(req.params.id);
    const body = contributeGoalSchema.parse(req.body);
    const goal = await contributeToGoalService(userId, goalId, body);
    return res.status(HTTPSTATUS.OK).json({
      message: "Savings goal updated successfully",
      goal,
    });
  }
);

export const deleteGoalController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const goalId = objectIdSchema.parse(req.params.id);
    await deleteGoalService(userId, goalId);
    return res.status(HTTPSTATUS.OK).json({
      message: "Savings goal deleted successfully",
    });
  }
);
