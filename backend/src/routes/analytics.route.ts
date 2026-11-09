import { Router } from "express";
import {
  chartAnalyticsController,
  expensePieChartBreakdownController,
  summaryAnalyticsController,
  generateAiInsightsController,
  chatAiAdvisorController,
  voiceTerminalCommandController,
} from "../controllers/analytics.controller";

const analyticsRoutes = Router();

analyticsRoutes.get("/summary", summaryAnalyticsController);
analyticsRoutes.get("/chart", chartAnalyticsController);
analyticsRoutes.get("/expense-breakdown", expensePieChartBreakdownController);
analyticsRoutes.get("/ai-insights", generateAiInsightsController);
analyticsRoutes.post("/ai-chat", chatAiAdvisorController);
analyticsRoutes.post("/voice-command", voiceTerminalCommandController);

export default analyticsRoutes;
