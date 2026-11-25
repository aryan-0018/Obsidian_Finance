import dns from "node:dns";
import "dotenv/config";
import "./config/passport.config";
import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import passport from "passport";
import helmet from "helmet";
import mongoose from "mongoose";
import { Env } from "./config/env.config";
import { HTTPSTATUS } from "./config/http.config";
import { errorHandler } from "./middlewares/errorHandler.middleware";
import { asyncHandler } from "./middlewares/asyncHandler.middlerware";
import connctDatabase from "./config/database.config";
import authRoutes from "./routes/auth.route";
import { passportAuthenticateJwt } from "./config/passport.config";
import userRoutes from "./routes/user.route";
import transactionRoutes from "./routes/transaction.route";
import { initializeCrons } from "./cron";
import reportRoutes from "./routes/report.route";
import analyticsRoutes from "./routes/analytics.route";
import budgetRoutes from "./routes/budget.route";
import smsRoutes from "./routes/sms.route";
import accountRoutes from "./routes/account.route";
import goalRoutes from "./routes/goal.route";
import splitRoutes from "./routes/split.route";
import { initTelegramBot } from "./services/telegram.service";
import {
  authLimiter,
  smsWebhookLimiter,
} from "./middlewares/rateLimiter.middleware";

if (Env.USE_GOOGLE_DNS) {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
}

const app = express();
const BASE_PATH = Env.BASE_PATH;

app.set("trust proxy", 1);
app.disable("x-powered-by");

// Enterprise security headers with cross-origin asset allowance
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

app.use(passport.initialize());

const allowedOrigins = Env.FRONTEND_ORIGIN.split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser clients (no Origin header) and configured origins
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS origin not allowed"));
    },
    credentials: true,
  })
);

app.get(
  "/",
  asyncHandler(async (_req: Request, res: Response) => {
    res.status(HTTPSTATUS.OK).json({
      status: "OK",
      message: "Obsidian Finance Backend is running",
    });
  })
);

const healthCheckHandler = asyncHandler(async (_req: Request, res: Response) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  res.status(HTTPSTATUS.OK).json({
    status: isDbConnected ? "healthy" : "degraded",
    message: "Obsidian Finance API is online",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: isDbConnected ? "connected" : "disconnected",
  });
});

app.get("/health", healthCheckHandler);
app.get(`${BASE_PATH}/health`, healthCheckHandler);

app.use(`${BASE_PATH}/auth`, authLimiter, authRoutes);
app.use(`${BASE_PATH}/user`, passportAuthenticateJwt, userRoutes);
app.use(`${BASE_PATH}/transaction`, passportAuthenticateJwt, transactionRoutes);
app.use(`${BASE_PATH}/report`, passportAuthenticateJwt, reportRoutes);
app.use(`${BASE_PATH}/analytics`, passportAuthenticateJwt, analyticsRoutes);
app.use(`${BASE_PATH}/budget`, passportAuthenticateJwt, budgetRoutes);
app.use(`${BASE_PATH}/account`, passportAuthenticateJwt, accountRoutes);
app.use(`${BASE_PATH}/goal`, passportAuthenticateJwt, goalRoutes);
app.use(`${BASE_PATH}/split`, passportAuthenticateJwt, splitRoutes);
app.use(`${BASE_PATH}/sms`, smsWebhookLimiter, smsRoutes);

app.use(errorHandler);

const startServer = async () => {
  try {
    await connctDatabase();

    if (!Env.DISABLE_CRONS) {
      await initializeCrons();
    }

    await initTelegramBot();

    app.listen(Env.PORT, () => {
      console.log(`Server is running on port ${Env.PORT} in ${Env.NODE_ENV} mode`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

void startServer();
