import mongoose from "mongoose";
import UserModel from "../models/user.model";
import { NotFoundException, UnauthorizedException } from "../utils/app-error";
import {
  LoginSchemaType,
  RegisterSchemaType,
} from "../validators/auth.validator";
import ReportSettingModel, {
  ReportFrequencyEnum,
} from "../models/report-setting.model";
import { calulateNextReportDate } from "../utils/helper";
import BudgetModel from "../models/budget.model";
import { signJwtToken } from "../utils/jwt";
import { Env } from "../config/env.config";
import crypto from "crypto";
import axios from "axios";

export const registerService = async (body: RegisterSchemaType) => {
  const { email } = body;

  const session = await mongoose.startSession();

  try {
    return await session.withTransaction(async () => {
      const existingUser = await UserModel.findOne({ email }).session(session);
      if (existingUser) throw new UnauthorizedException("User already exists");

      const newUser = new UserModel({
        ...body,
      });

      await newUser.save({ session });

      const reportSetting = new ReportSettingModel({
        userId: newUser._id,
        frequency: ReportFrequencyEnum.MONTHLY,
        isEnabled: true,
        nextReportDate: calulateNextReportDate(),
        lastSentDate: null,
      });
      await reportSetting.save({ session });

      const defaultBudget = new BudgetModel({
        userId: newUser._id,
        limit: 0,
        currency: "INR",
      });
      await defaultBudget.save({ session });

      return { user: newUser.omitPassword() };
    });
  } catch (error) {
    throw error;
  } finally {
    await session.endSession();
  }
};

export const loginService = async (body: LoginSchemaType) => {
  const { email, password } = body;
  const user = await UserModel.findOne({ email });
  if (!user) throw new NotFoundException("Email/password not found");

  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid)
    throw new UnauthorizedException("Invalid email/password");

  const { token, expiresAt } = signJwtToken({ userId: user.id });

  const reportSetting = await ReportSettingModel.findOne(
    {
      userId: user.id,
    },
    { _id: 1, frequency: 1, isEnabled: 1 }
  ).lean();

  return {
    user: user.omitPassword(),
    accessToken: token,
    expiresAt,
    reportSetting,
  };
};

export const googleLoginService = async (tokenString: string) => {
  let payload: any;
  try {
    const response = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenString}` },
    });
    payload = response.data;
  } catch (error) {
    throw new UnauthorizedException("Invalid Google token payload");
  }
  if (!payload || !payload.email) {
    throw new UnauthorizedException("Invalid Google token payload");
  }

  const email = payload.email.toLowerCase();
  let user = await UserModel.findOne({ email });

  if (!user) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        user = new UserModel({
          name: payload.name || "Google User",
          email,
          password: crypto.randomBytes(16).toString("hex"),
          profilePicture: payload.picture || null,
        });

        await user.save({ session });

        const reportSetting = new ReportSettingModel({
          userId: user._id,
          frequency: ReportFrequencyEnum.MONTHLY,
          isEnabled: true,
          nextReportDate: calulateNextReportDate(),
          lastSentDate: null,
        });
        await reportSetting.save({ session });

        const defaultBudget = new BudgetModel({
          userId: user._id,
          limit: 0,
          currency: "INR",
        });
        await defaultBudget.save({ session });
      });
    } finally {
      await session.endSession();
    }
  }

  const { token, expiresAt } = signJwtToken({ userId: user!.id });
  const reportSetting = await ReportSettingModel.findOne(
    { userId: user!.id },
    { _id: 1, frequency: 1, isEnabled: 1 }
  ).lean();

  return {
    user: user!.omitPassword(),
    accessToken: token,
    expiresAt,
    reportSetting,
  };
};
