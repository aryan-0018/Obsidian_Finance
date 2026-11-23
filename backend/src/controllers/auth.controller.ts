import { CookieOptions, Request, Response } from "express";
import { HTTPSTATUS } from "../config/http.config";
import { asyncHandler } from "../middlewares/asyncHandler.middlerware";
import {
  googleLoginSchema,
  loginSchema,
  registerSchema,
} from "../validators/auth.validator";
import {
  loginService,
  registerService,
  googleLoginService,
  refreshTokenService,
  logoutService,
} from "../services/auth.service";
import { UnauthorizedException } from "../utils/app-error";
import { Env } from "../config/env.config";

const REFRESH_COOKIE_NAME = "refreshToken";

const getRefreshCookieOptions = (): CookieOptions => {
  const isProd = Env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
};

export const registerController = asyncHandler(
  async (req: Request, res: Response) => {
    const body = registerSchema.parse(req.body);
    const result = await registerService(body);

    return res.status(HTTPSTATUS.CREATED).json({
      message: "User registered successfully",
      data: result,
    });
  }
);

export const loginController = asyncHandler(
  async (req: Request, res: Response) => {
    const body = loginSchema.parse(req.body);
    const { user, accessToken, expiresAt, refreshToken, reportSetting } =
      await loginService(body);

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());

    return res.status(HTTPSTATUS.OK).json({
      message: "User logged in successfully",
      user,
      accessToken,
      expiresAt,
      reportSetting,
    });
  }
);

export const googleLoginController = asyncHandler(
  async (req: Request, res: Response) => {
    const { token } = googleLoginSchema.parse(req.body);
    const { user, accessToken, expiresAt, refreshToken, reportSetting } =
      await googleLoginService(token);

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());

    return res.status(HTTPSTATUS.OK).json({
      message: "User logged in with Google successfully",
      user,
      accessToken,
      expiresAt,
      reportSetting,
    });
  }
);

export const refreshTokenController = asyncHandler(
  async (req: Request, res: Response) => {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME] as
      | string
      | undefined;

    if (!rawRefreshToken) {
      throw new UnauthorizedException("Refresh token cookie missing");
    }

    const { user, accessToken, expiresAt, refreshToken, reportSetting } =
      await refreshTokenService(rawRefreshToken);

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());

    return res.status(HTTPSTATUS.OK).json({
      message: "Token refreshed successfully",
      user,
      accessToken,
      expiresAt,
      reportSetting,
    });
  }
);

export const logoutController = asyncHandler(
  async (req: Request, res: Response) => {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME] as
      | string
      | undefined;
    await logoutService(rawRefreshToken);

    const { maxAge: _maxAge, ...clearOpts } = getRefreshCookieOptions();
    res.clearCookie(REFRESH_COOKIE_NAME, clearOpts);

    return res.status(HTTPSTATUS.OK).json({
      message: "Logged out successfully",
    });
  }
);
