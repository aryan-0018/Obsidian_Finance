import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middlerware";
import { HTTPSTATUS } from "../config/http.config";
import { Env } from "../config/env.config";
import { BadRequestException } from "../utils/app-error";
import {
  bulkCommitBankTransactionsSchema,
  bulkDeleteTransactionSchema,
  bulkTransactionSchema,
  createTransactionSchema,
  transactionIdSchema,
  transactionQuerySchema,
  updateTransactionSchema,
} from "../validators/transaction.validator";
import {
  bulkDeleteTransactionService,
  bulkTransactionService,
  createTransactionService,
  deleteTransactionService,
  duplicateTransactionService,
  getAllTransactionService,
  getTransactionByIdService,
  scanReceiptService,
  updateTransactionService,
  exportTransactionsEmailService,
} from "../services/transaction.service";
import {
  parseBankStatementService,
  bulkCommitBankTransactionsService,
} from "../services/bank-statement.service";
import { verifyLedgerIntegrityService } from "../services/ledger-audit.service";
import { TransactionTypeEnum } from "../models/transaction.model";

const parseOptionalDate = (raw: unknown, fieldName: string): Date | undefined => {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const parsed = new Date(String(raw));
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`Invalid '${fieldName}' date`);
  }
  return parsed;
};

export const createTransactionController = asyncHandler(
  async (req: Request, res: Response) => {
    const body = createTransactionSchema.parse(req.body);
    const userId = String(req.user?._id);

    const transaction = await createTransactionService(body, userId);

    return res.status(HTTPSTATUS.CREATED).json({
      message: "Transacton created successfully",
      transaction,
    });
  }
);

export const getAllTransactionController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const query = transactionQuerySchema.parse(req.query);

    const filters = {
      keyword: query.keyword,
      type: query.type as keyof typeof TransactionTypeEnum | undefined,
      category: query.category,
      fromDate: parseOptionalDate(req.query.from, "from"),
      toDate: parseOptionalDate(req.query.to, "to"),
      recurringStatus: query.recurringStatus,
      accountId: query.accountId,
    };

    const pagination = {
      pageSize: query.pageSize,
      pageNumber: query.pageNumber,
    };

    const result = await getAllTransactionService(userId, filters, pagination);

    return res.status(HTTPSTATUS.OK).json({
      message: "Transaction fetched successfully",
      ...result,
    });
  }
);

export const getTransactionByIdController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const transactionId = transactionIdSchema.parse(req.params.id);

    const transaction = await getTransactionByIdService(userId, transactionId);

    return res.status(HTTPSTATUS.OK).json({
      message: "Transaction fetched successfully",
      transaction,
    });
  }
);

export const duplicateTransactionController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const transactionId = transactionIdSchema.parse(req.params.id);

    const transaction = await duplicateTransactionService(
      userId,
      transactionId
    );

    return res.status(HTTPSTATUS.OK).json({
      message: "Transaction duplicated successfully",
      data: transaction,
    });
  }
);

export const updateTransactionController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const transactionId = transactionIdSchema.parse(req.params.id);
    const body = updateTransactionSchema.parse(req.body);

    await updateTransactionService(userId, transactionId, body);

    return res.status(HTTPSTATUS.OK).json({
      message: "Transaction updated successfully",
    });
  }
);

export const deleteTransactionController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const transactionId = transactionIdSchema.parse(req.params.id);

    await deleteTransactionService(userId, transactionId);

    return res.status(HTTPSTATUS.OK).json({
      message: "Transaction deleted successfully",
    });
  }
);

export const bulkDeleteTransactionController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const { transactionIds } = bulkDeleteTransactionSchema.parse(req.body);

    const result = await bulkDeleteTransactionService(userId, transactionIds);

    return res.status(HTTPSTATUS.OK).json({
      message: "Transaction deleted successfully",
      ...result,
    });
  }
);

export const bulkTransactionController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const { transactions } = bulkTransactionSchema.parse(req.body);

    const result = await bulkTransactionService(userId, transactions);

    return res.status(HTTPSTATUS.OK).json({
      message: "Bulk transaction inserted successfully",
      ...result,
    });
  }
);

export const scanReceiptController = asyncHandler(
  async (req: Request, res: Response) => {
    const file = req?.file;

    const result = await scanReceiptService(file);

    return res.status(HTTPSTATUS.OK).json({
      message: "Reciept scanned successfully",
      data: result,
    });
  }
);

export const exportTransactionsEmailController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const userEmail = req.user?.email;
    const query = transactionQuerySchema.partial().parse(req.query);

    const filters = {
      keyword: query.keyword,
      type: query.type as keyof typeof TransactionTypeEnum | undefined,
      category: query.category,
      fromDate: parseOptionalDate(req.query.from, "from"),
      toDate: parseOptionalDate(req.query.to, "to"),
    };

    await exportTransactionsEmailService(userId, userEmail as string, filters);

    return res.status(HTTPSTATUS.OK).json({
      message: "Export report has been emailed to your registered address",
    });
  }
);

export const parseBankStatementController = asyncHandler(
  async (req: Request, res: Response) => {
    const file = req.file;
    const password =
      typeof req.body?.password === "string" ? req.body.password : undefined;
    const userId = String(req.user?._id);

    const result = await parseBankStatementService(file, password, userId);

    return res.status(HTTPSTATUS.OK).json({
      message: "Bank statement parsed successfully",
      data: result,
    });
  }
);

export const bulkCommitBankTransactionsController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const { transactions } = bulkCommitBankTransactionsSchema.parse(req.body);

    const result = await bulkCommitBankTransactionsService(
      userId,
      transactions
    );

    return res.status(HTTPSTATUS.OK).json({
      message: `Successfully imported ${result.importedCount} transactions`,
      data: result,
    });
  }
);

export const ledgerAuditController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    let simulateTamper: number | undefined;

    if (req.query.simulateTamper !== undefined) {
      if (Env.NODE_ENV === "production") {
        throw new BadRequestException(
          "Tamper simulation is disabled in production"
        );
      }
      const parsed = Number(req.query.simulateTamper);
      if (!Number.isInteger(parsed) || parsed < 0) {
        throw new BadRequestException(
          "simulateTamper must be a non-negative integer"
        );
      }
      simulateTamper = parsed;
    }

    const result = await verifyLedgerIntegrityService(userId, simulateTamper);

    return res.status(HTTPSTATUS.OK).json({
      message: "Ledger verification completed",
      data: result,
    });
  }
);
