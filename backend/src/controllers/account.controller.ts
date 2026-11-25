import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middlerware";
import { HTTPSTATUS } from "../config/http.config";
import {
  accountIdParamSchema,
  createAccountSchema,
  transferAccountsSchema,
  updateAccountSchema,
} from "../validators/account.validator";
import {
  createAccountService,
  deleteAccountService,
  getAllAccountsService,
  transferBetweenAccountsService,
  updateAccountService,
} from "../services/account.service";

export const getAllAccountsController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const result = await getAllAccountsService(userId);

    return res.status(HTTPSTATUS.OK).json({
      message: "Accounts fetched successfully",
      ...result,
    });
  }
);

export const createAccountController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const body = createAccountSchema.parse(req.body);
    const account = await createAccountService(userId, body);

    return res.status(HTTPSTATUS.CREATED).json({
      message: "Account created successfully",
      account,
    });
  }
);

export const updateAccountController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const accountId = accountIdParamSchema.parse(req.params.id);
    const body = updateAccountSchema.parse(req.body);

    const account = await updateAccountService(userId, accountId, body);

    return res.status(HTTPSTATUS.OK).json({
      message: "Account updated successfully",
      account,
    });
  }
);

export const deleteAccountController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const accountId = accountIdParamSchema.parse(req.params.id);

    await deleteAccountService(userId, accountId);

    return res.status(HTTPSTATUS.OK).json({
      message: "Account deleted successfully",
    });
  }
);

export const transferAccountsController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const body = transferAccountsSchema.parse(req.body);

    const result = await transferBetweenAccountsService(userId, body);

    return res.status(HTTPSTATUS.CREATED).json({
      message: "Internal transfer completed successfully",
      ...result,
    });
  }
);
