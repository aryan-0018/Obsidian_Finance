import { Router } from "express";
import {
    getBudgetController,
    updateBudgetController,
} from "../controllers/budget.controller";

const budgetRoutes = Router();

budgetRoutes.get("/", getBudgetController);
budgetRoutes.put("/", updateBudgetController);

export default budgetRoutes;
