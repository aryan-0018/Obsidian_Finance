import { Router } from "express";
import {
  chartAnalyticsController,
  expensePieChartBreakdownController,
  summaryAnalyticsController,
  generateAiInsightsController,
  chatAiAdvisorController,
  voiceTerminalCommandController,
  getFreedomMetricsController,
  simulatePurchaseController,
  getLiquidityRadarController,
} from "../controllers/analytics.controller";

const analyticsRoutes = Router();

analyticsRoutes.get("/summary", summaryAnalyticsController);
analyticsRoutes.get("/chart", chartAnalyticsController);
analyticsRoutes.get("/expense-breakdown", expensePieChartBreakdownController);
analyticsRoutes.get("/ai-insights", generateAiInsightsController);
analyticsRoutes.get("/freedom-clock", getFreedomMetricsController);
analyticsRoutes.get("/liquidity-radar", getLiquidityRadarController);
analyticsRoutes.post("/simulate-purchase", simulatePurchaseController);
analyticsRoutes.post("/ai-chat", chatAiAdvisorController);
analyticsRoutes.post("/voice-command", voiceTerminalCommandController);

export default analyticsRoutes;
