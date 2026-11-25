import { Request, Response } from "express";
import { z } from "zod";
import { HTTPSTATUS } from "../config/http.config";
import { asyncHandler } from "../middlewares/asyncHandler.middlerware";
import { getBudgetService, updateBudgetService } from "../services/budget.service";

const categoryLimitItemSchema = z.object({
  category: z.string().trim().min(1).max(60),
  limit: z.coerce
    .number()
    .finite("Category limit must be a valid number")
    .min(0, "Category limit cannot be negative")
    .max(1_000_000_000_000),
});

const updateBudgetSchema = z.object({
  limit: z.coerce
    .number()
    .finite("Budget limit must be a valid number")
    .min(0, "Budget limit cannot be negative")
    .max(1_000_000_000_000, "Budget limit exceeds maximum allowed")
    .optional(),
  categoryLimits: z.array(categoryLimitItemSchema).max(40).optional(),
});

export const getBudgetController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const budget = await getBudgetService(userId);

    return res.status(HTTPSTATUS.OK).json({
      message: "Budget retrieved successfully",
      data: budget,
    });
  }
);

export const updateBudgetController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const body = updateBudgetSchema.parse(req.body);

    const budget = await updateBudgetService(userId, body);

    return res.status(HTTPSTATUS.OK).json({
      message: "Budget updated successfully",
      data: budget,
    });
  }
);
