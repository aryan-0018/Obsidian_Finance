import { Request, Response } from "express";
import { HTTPSTATUS } from "../config/http.config";
import { asyncHandler } from "../middlewares/asyncHandler.middlerware";
import { loginSchema, registerSchema } from "../validators/auth.validator";
import { loginService, registerService, googleLoginService } from "../services/auth.service";
import { UnauthorizedException } from "../utils/app-error";

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
    const body = loginSchema.parse({
      ...req.body,
    });
    const { user, accessToken, expiresAt, reportSetting } =
      await loginService(body);

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
    const { token } = req.body;
    if (!token) return res.status(HTTPSTATUS.BAD_REQUEST).json({ message: "Token is required" });

    const { user, accessToken, expiresAt, reportSetting } =
      await googleLoginService(token);

    return res.status(HTTPSTATUS.OK).json({
      message: "User logged in with Google successfully",
      user,
      accessToken,
      expiresAt,
      reportSetting,
    });
  }
);
