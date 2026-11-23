import mongoose from "mongoose";
import crypto from "crypto";
import axios from "axios";
import { OAuth2Client } from "google-auth-library";
import UserModel from "../models/user.model";
import {
  BadRequestException,
  UnauthorizedException,
} from "../utils/app-error";
import {
  LoginSchemaType,
  RegisterSchemaType,
} from "../validators/auth.validator";
import ReportSettingModel, {
  ReportFrequencyEnum,
} from "../models/report-setting.model";
import { calulateNextReportDate } from "../utils/helper";
import BudgetModel from "../models/budget.model";
import {
  hashToken,
  signJwtToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt";
import { Env } from "../config/env.config";

const googleClient = Env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(Env.GOOGLE_CLIENT_ID)
  : null;

const createUserDefaults = async (
  userId: mongoose.Types.ObjectId,
  session?: mongoose.ClientSession
) => {
  const reportSetting = new ReportSettingModel({
    userId,
    frequency: ReportFrequencyEnum.MONTHLY,
    isEnabled: true,
    nextReportDate: calulateNextReportDate(),
    lastSentDate: null,
  });

  const defaultBudget = new BudgetModel({
    userId,
    limit: 0,
    currency: "INR",
  });

  if (session) {
    await reportSetting.save({ session });
    await defaultBudget.save({ session });
  } else {
    await reportSetting.save();
    await defaultBudget.save();
  }
};

export const registerService = async (body: RegisterSchemaType) => {
  const email = body.email.trim().toLowerCase();
  const password = body.password;

  const existingUser = await UserModel.findOne({ email });
  if (existingUser) {
    throw new BadRequestException("An account with this email already exists");
  }

  const session = await mongoose.startSession();

  try {
    return await session.withTransaction(async () => {
      const newUser = new UserModel({
        ...body,
        email,
        password,
      });
      await newUser.save({ session });
      await createUserDefaults(newUser._id as mongoose.Types.ObjectId, session);

      return { user: newUser.omitPassword() };
    });
  } catch (error: any) {
    // Fallback for standalone MongoDB without replica set
    if (
      error?.message?.includes("standalone") ||
      error?.message?.includes("replica set") ||
      error?.message?.includes("Transaction numbers") ||
      error?.code === 20
    ) {
      const newUser = new UserModel({
        ...body,
        email,
        password,
      });
      await newUser.save();
      await createUserDefaults(newUser._id as mongoose.Types.ObjectId);

      return { user: newUser.omitPassword() };
    }
    throw error;
  } finally {
    await session.endSession();
  }
};

export const loginService = async (body: LoginSchemaType) => {
  const email = body.email.trim().toLowerCase();
  const password = body.password;

  const user = await UserModel.findOne({ email });
  if (!user) {
    throw new UnauthorizedException("Invalid email or password");
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new UnauthorizedException("Invalid email or password");
  }

  const { token, expiresAt } = signJwtToken({ userId: user.id });
  const { token: refreshToken, hash: refreshTokenHash } = signRefreshToken(
    user.id
  );

  user.refreshTokenHash = refreshTokenHash;
  await user.save();

  const reportSetting = await ReportSettingModel.findOne(
    { userId: user.id },
    { _id: 1, frequency: 1, isEnabled: 1 }
  ).lean();

  return {
    user: user.omitPassword(),
    accessToken: token,
    expiresAt,
    refreshToken,
    reportSetting,
  };
};

export const googleLoginService = async (tokenString: string) => {
  if (!Env.GOOGLE_CLIENT_ID || !googleClient) {
    throw new UnauthorizedException("Google OAuth is not configured on this server");
  }

  let payload: any = null;

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: tokenString,
      audience: Env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    // Fallback to Google tokeninfo endpoint for ID tokens, strictly enforcing aud and email_verified
    try {
      const tokenInfoRes = await axios.get(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenString)}`,
        { timeout: 5000 }
      );
      payload = tokenInfoRes.data;
    } catch {
      throw new UnauthorizedException("Invalid Google ID token");
    }
  }

  const isEmailVerified =
    payload?.email_verified === true || payload?.email_verified === "true";

  if (
    !payload ||
    !payload.email ||
    !isEmailVerified ||
    payload.aud !== Env.GOOGLE_CLIENT_ID
  ) {
    throw new UnauthorizedException(
      "Google token failed audience or email verification"
    );
  }

  const email = String(payload.email).trim().toLowerCase();
  let user = await UserModel.findOne({ email });

  if (!user) {
    user = new UserModel({
      name: payload.name || "Google User",
      email,
      password: crypto.randomBytes(24).toString("hex"),
      profilePicture: payload.picture || null,
    });
    await user.save();
    await createUserDefaults(user._id as mongoose.Types.ObjectId);
  }

  const { token, expiresAt } = signJwtToken({ userId: user.id });
  const { token: refreshToken, hash: refreshTokenHash } = signRefreshToken(
    user.id
  );

  user.refreshTokenHash = refreshTokenHash;
  await user.save();

  const reportSetting = await ReportSettingModel.findOne(
    { userId: user.id },
    { _id: 1, frequency: 1, isEnabled: 1 }
  ).lean();

  return {
    user: user.omitPassword(),
    accessToken: token,
    expiresAt,
    refreshToken,
    reportSetting,
  };
};

export const refreshTokenService = async (rawRefreshToken: string) => {
  let decoded;
  try {
    decoded = verifyRefreshToken(rawRefreshToken);
  } catch {
    throw new UnauthorizedException("Invalid or expired refresh token");
  }

  const user = await UserModel.findById(decoded.userId).select(
    "+refreshTokenHash"
  );
  if (!user || !user.refreshTokenHash) {
    throw new UnauthorizedException("Refresh session is invalid or revoked");
  }

  const incomingHash = hashToken(rawRefreshToken);
  const storedBuf = Buffer.from(user.refreshTokenHash, "hex");
  const incomingBuf = Buffer.from(incomingHash, "hex");

  if (
    storedBuf.length !== incomingBuf.length ||
    !crypto.timingSafeEqual(storedBuf, incomingBuf)
  ) {
    // Possible refresh token reuse — revoke active session
    user.refreshTokenHash = null;
    await user.save();
    throw new UnauthorizedException("Refresh token revoked");
  }

  const { token, expiresAt } = signJwtToken({ userId: user.id });
  const { token: newRefreshToken, hash: newRefreshHash } = signRefreshToken(
    user.id
  );

  user.refreshTokenHash = newRefreshHash;
  await user.save();

  const reportSetting = await ReportSettingModel.findOne(
    { userId: user.id },
    { _id: 1, frequency: 1, isEnabled: 1 }
  ).lean();

  return {
    user: user.omitPassword(),
    accessToken: token,
    expiresAt,
    refreshToken: newRefreshToken,
    reportSetting,
  };
};

export const logoutService = async (rawRefreshToken?: string) => {
  if (!rawRefreshToken) return;
  try {
    const decoded = verifyRefreshToken(rawRefreshToken);
    await UserModel.findByIdAndUpdate(decoded.userId, {
      refreshTokenHash: null,
    });
  } catch {
    // Even if expired/malformed, clear matching hash if present
    const hash = hashToken(rawRefreshToken);
    await UserModel.updateOne(
      { refreshTokenHash: hash },
      { $set: { refreshTokenHash: null } }
    );
  }
};
