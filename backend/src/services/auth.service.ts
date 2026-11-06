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
import { OAuth2Client } from "google-auth-library";

const googleClient = new OAuth2Client(Env.GOOGLE_CLIENT_ID);

export const registerService = async (body: RegisterSchemaType) => {
  const email = body.email.trim().toLowerCase();
  const password = body.password.trim();

  const existingUser = await UserModel.findOne({ email });
  if (existingUser) throw new UnauthorizedException("User already exists");

  const session = await mongoose.startSession();

  try {
    return await session.withTransaction(async () => {
      const newUser = new UserModel({
        ...body,
        email,
        password,
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
  } catch (error: any) {
    // If running on standalone MongoDB without replica set, fallback without transaction
    if (error?.message?.includes("standalone") || error?.message?.includes("replica set")) {
      const newUser = new UserModel({
        ...body,
      });
      await newUser.save();

      await ReportSettingModel.create({
        userId: newUser._id,
        frequency: ReportFrequencyEnum.MONTHLY,
        isEnabled: true,
        nextReportDate: calulateNextReportDate(),
        lastSentDate: null,
      });

      await BudgetModel.create({
        userId: newUser._id,
        limit: 0,
        currency: "INR",
      });

      return { user: newUser.omitPassword() };
    }
    throw error;
  } finally {
    await session.endSession();
  }
};

export const loginService = async (body: LoginSchemaType) => {
  const email = body.email.trim().toLowerCase();
  const password = body.password.trim();
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

  // 1. First try official Google OAuth2Client verifyIdToken
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: tokenString,
      audience: Env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (err1: any) {
    console.error("verifyIdToken failed:", err1?.message);
    // 2. Second fallback: direct Google tokeninfo endpoint
    try {
      const tokenInfoRes = await axios.get(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${tokenString}`
      );
      payload = tokenInfoRes.data;
    } catch (err2: any) {
      console.error("tokeninfo endpoint failed:", err2?.response?.data || err2?.message);
      // 3. Third fallback: userinfo endpoint with access token
      try {
        const userInfoRes = await axios.get(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: { Authorization: `Bearer ${tokenString}` },
          }
        );
        payload = userInfoRes.data;
      } catch (err3: any) {
        console.error("userinfo endpoint failed:", err3?.response?.data || err3?.message);
        throw new UnauthorizedException("Invalid Google token payload");
      }
    }
  }

  if (!payload || !payload.email) {
    throw new UnauthorizedException("Invalid Google token payload: email missing");
  }

  const email = payload.email.toLowerCase();
  let user = await UserModel.findOne({ email });

  if (!user) {
    try {
      user = new UserModel({
        name: payload.name || "Google User",
        email,
        password: crypto.randomBytes(16).toString("hex"),
        profilePicture: payload.picture || null,
      });
      await user.save();

      await ReportSettingModel.create({
        userId: user._id,
        frequency: ReportFrequencyEnum.MONTHLY,
        isEnabled: true,
        nextReportDate: calulateNextReportDate(),
        lastSentDate: null,
      });

      await BudgetModel.create({
        userId: user._id,
        limit: 0,
        currency: "INR",
      });
    } catch (createErr) {
      throw createErr;
    }
  }

  const { token, expiresAt } = signJwtToken({ userId: user.id });
  const reportSetting = await ReportSettingModel.findOne(
    { userId: user.id },
    { _id: 1, frequency: 1, isEnabled: 1 }
  ).lean();

  return {
    user: user.omitPassword(),
    accessToken: token,
    expiresAt,
    reportSetting,
  };
};

export const refreshTokenService = async (userId: string) => {
  const user = await UserModel.findById(userId);
  if (!user) throw new UnauthorizedException("User not found");

  const { token, expiresAt } = signJwtToken({ userId: user.id });
  const reportSetting = await ReportSettingModel.findOne(
    { userId: user.id },
    { _id: 1, frequency: 1, isEnabled: 1 }
  ).lean();

  return {
    user: user.omitPassword(),
    accessToken: token,
    expiresAt,
    reportSetting,
  };
};
