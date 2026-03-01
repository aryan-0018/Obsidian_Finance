import { Request, Response } from "express";
import { HTTPSTATUS } from "../config/http.config";
import { asyncHandler } from "../middlewares/asyncHandler.middlerware";
import { getBudgetService, updateBudgetService } from "../services/budget.service";

export const getBudgetController = asyncHandler(
    async (req: Request, res: Response) => {
        const userId = req.user?._id;
        const budget = await getBudgetService(userId);

        return res.status(HTTPSTATUS.OK).json({
            message: "Budget retrieved successfully",
            data: budget,
        });
    }
);

export const updateBudgetController = asyncHandler(
    async (req: Request, res: Response) => {
        const userId = req.user?._id;
        const { limit } = req.body;

        if (typeof limit !== "number") {
            return res.status(HTTPSTATUS.BAD_REQUEST).json({
                message: "Invalid budget limit provided",
            });
        }

        const budget = await updateBudgetService(userId, limit);

        return res.status(HTTPSTATUS.OK).json({
            message: "Budget updated successfully",
            data: budget,
        });
    }
);
