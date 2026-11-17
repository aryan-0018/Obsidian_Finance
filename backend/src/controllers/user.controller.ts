import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middlerware";
import {
  findByIdUserService,
  updateUserService,
} from "../services/user.service";
import {
  getTelegramStatusService,
  generateTelegramPairingCodeService,
  unlinkTelegramService,
} from "../services/telegram.service";
import {
  getUserApiKeyStatusService,
  generateUserApiKeyService,
  revokeUserApiKeyService,
} from "../services/api-key.service";
import { HTTPSTATUS } from "../config/http.config";
import { updateUserSchema } from "../validators/user.validator";

export const getCurrentUserController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;

    const user = await findByIdUserService(userId);
    return res.status(HTTPSTATUS.OK).json({
      message: "User fetched successfully",
      user,
    });
  }
);

export const updateUserController = asyncHandler(
  async (req: Request, res: Response) => {
    const body = updateUserSchema.parse(req.body);
    const userId = req.user?._id;
    const profilePic = req.file;

    const user = await updateUserService(userId, body, profilePic);

    return res.status(HTTPSTATUS.OK).json({
      message: "User profile updated successfully",
      data: user,
    });
  }
);

export const getTelegramStatusController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const status = await getTelegramStatusService(userId);
    return res.status(HTTPSTATUS.OK).json({
      message: "Telegram status retrieved",
      data: status,
    });
  }
);

export const generateTelegramPairCodeController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const pairing = await generateTelegramPairingCodeService(userId);
    return res.status(HTTPSTATUS.OK).json({
      message: "Pairing code generated",
      data: pairing,
    });
  }
);

export const unlinkTelegramController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const result = await unlinkTelegramService(userId);
    return res.status(HTTPSTATUS.OK).json({
      message: "Telegram unlinked successfully",
      data: result,
    });
  }
);

export const getUserApiKeyStatusController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const status = await getUserApiKeyStatusService(userId);
    return res.status(HTTPSTATUS.OK).json({
      message: "API key status retrieved",
      data: status,
    });
  }
);

export const generateUserApiKeyController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const keyData = await generateUserApiKeyService(userId);
    return res.status(HTTPSTATUS.CREATED).json({
      message: "API key successfully generated. Copy and store it securely.",
      data: keyData,
    });
  }
);

export const revokeUserApiKeyController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const result = await revokeUserApiKeyService(userId);
    return res.status(HTTPSTATUS.OK).json({
      message: "API key revoked successfully",
      data: result,
    });
  }
);

