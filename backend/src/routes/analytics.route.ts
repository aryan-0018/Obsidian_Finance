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
import { aiLimiter } from "../middlewares/rateLimiter.middleware";

const analyticsRoutes = Router();

analyticsRoutes.get("/summary", summaryAnalyticsController);
analyticsRoutes.get("/chart", chartAnalyticsController);
analyticsRoutes.get("/expense-breakdown", expensePieChartBreakdownController);
analyticsRoutes.get("/ai-insights", aiLimiter, generateAiInsightsController);
analyticsRoutes.get("/freedom-clock", getFreedomMetricsController);
analyticsRoutes.get("/liquidity-radar", getLiquidityRadarController);
analyticsRoutes.post("/simulate-purchase", simulatePurchaseController);
analyticsRoutes.post("/ai-chat", aiLimiter, chatAiAdvisorController);
analyticsRoutes.post("/voice-command", aiLimiter, voiceTerminalCommandController);

export default analyticsRoutes;
