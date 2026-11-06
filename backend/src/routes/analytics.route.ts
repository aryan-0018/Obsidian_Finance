import { Router } from "express";
import {
  chartAnalyticsController,
  expensePieChartBreakdownController,
  summaryAnalyticsController,
  generateAiInsightsController,
  chatAiAdvisorController,
} from "../controllers/analytics.controller";

const analyticsRoutes = Router();

analyticsRoutes.get("/summary", summaryAnalyticsController);
analyticsRoutes.get("/chart", chartAnalyticsController);
analyticsRoutes.get("/expense-breakdown", expensePieChartBreakdownController);
analyticsRoutes.get("/ai-insights", generateAiInsightsController);
analyticsRoutes.post("/ai-chat", chatAiAdvisorController);

export default analyticsRoutes;
