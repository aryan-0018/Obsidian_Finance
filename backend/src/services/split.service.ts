import { z } from "zod";
import SplitModel, {
  SplitDirectionEnum,
  SplitStatusEnum,
} from "../models/split.model";
import AccountModel from "../models/account.model";
import TransactionModel, {
  PaymentMethodEnum,
  TransactionTypeEnum,
} from "../models/transaction.model";
import { BadRequestException, NotFoundException } from "../utils/app-error";
import { objectIdSchema } from "../validators/transaction.validator";
import { createTransactionService } from "./transaction.service";

export const createSplitSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(160),
  direction: z
    .enum([SplitDirectionEnum.OWED_TO_ME, SplitDirectionEnum.I_OWE])
    .default(SplitDirectionEnum.OWED_TO_ME),
  counterpartyName: z
    .string()
    .trim()
    .min(1, "Person / friend name is required")
    .max(100),
  counterpartyContact: z.string().trim().max(120).optional().default(""),
  totalAmount: z.coerce.number().finite().min(0.01).max(1_000_000_000),
  counterpartyShare: z.coerce.number().finite().min(0.01).max(1_000_000_000),
  category: z.string().trim().max(60).optional().default("split"),
  transactionId: objectIdSchema.nullable().optional(),
  accountId: objectIdSchema.nullable().optional(),
  dueDate: z
    .union([
      z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid due date"),
      z.date(),
    ])
    .transform((v) => new Date(v))
    .nullable()
    .optional(),
  notes: z.string().trim().max(500).optional().default(""),
});

export const settleSplitSchema = z.object({
  amount: z.coerce.number().finite().min(0.01).max(1_000_000_000).optional(),
  accountId: objectIdSchema.nullable().optional(),
  logTransaction: z.boolean().optional().default(true),
});

export const getAllSplitsService = async (userId: string) => {
  const splits = await SplitModel.find({ userId })
    .populate("accountId", "name type accountMask color")
    .sort({ status: 1, createdAt: -1 });

  let totalOwedToMe = 0;
  let totalIOwe = 0;
  let pendingCount = 0;

  for (const s of splits) {
    if (s.status === SplitStatusEnum.SETTLED) continue;
    const remaining = Math.max(
      0,
      Number(s.counterpartyShare) - Number(s.settledAmount || 0)
    );
    if (remaining <= 0) continue;

    pendingCount++;
    if (s.direction === SplitDirectionEnum.OWED_TO_ME) {
      totalOwedToMe += remaining;
    } else {
      totalIOwe += remaining;
    }
  }

  return {
    splits,
    summary: {
      totalOwedToMe: Math.round(totalOwedToMe * 100) / 100,
      totalIOwe: Math.round(totalIOwe * 100) / 100,
      netReceivable: Math.round((totalOwedToMe - totalIOwe) * 100) / 100,
      pendingCount,
      totalCount: splits.length,
    },
  };
};

export const createSplitService = async (
  userId: string,
  body: z.infer<typeof createSplitSchema>
) => {
  if (body.counterpartyShare > body.totalAmount) {
    throw new BadRequestException(
      "Owed share cannot exceed the total bill amount"
    );
  }

  if (body.accountId) {
    const accExists = await AccountModel.exists({ _id: body.accountId, userId });
    if (!accExists) throw new NotFoundException("Account not found");
  }
  if (body.transactionId) {
    const txExists = await TransactionModel.exists({
      _id: body.transactionId,
      userId,
    });
    if (!txExists) throw new NotFoundException("Transaction not found");
  }

  return SplitModel.create({
    ...body,
    userId,
    settledAmount: 0,
    status: SplitStatusEnum.PENDING,
  });
};

export const settleSplitService = async (
  userId: string,
  splitId: string,
  body: z.infer<typeof settleSplitSchema>
) => {
  const split = await SplitModel.findOne({ _id: splitId, userId });
  if (!split) throw new NotFoundException("Split / IOU record not found");

  if (split.status === SplitStatusEnum.SETTLED) {
    throw new BadRequestException("This split is already fully settled");
  }

  const remaining = Math.max(
    0,
    Number(split.counterpartyShare) - Number(split.settledAmount || 0)
  );
  const settleAmt =
    body.amount !== undefined ? Math.min(Number(body.amount), remaining) : remaining;

  if (settleAmt <= 0) {
    throw new BadRequestException("Settlement amount must be greater than zero");
  }

  const targetAccountId = body.accountId || split.accountId?.toString() || null;
  if (targetAccountId) {
    const accExists = await AccountModel.exists({ _id: targetAccountId, userId });
    if (!accExists) throw new NotFoundException("Settlement account not found");
  }

  const nextSettled = Math.round((Number(split.settledAmount || 0) + settleAmt) * 100) / 100;
  const isFullySettled = nextSettled >= Number(split.counterpartyShare) - 0.009;

  split.settledAmount = isFullySettled ? Number(split.counterpartyShare) : nextSettled;
  split.status = isFullySettled
    ? SplitStatusEnum.SETTLED
    : SplitStatusEnum.PARTIAL;
  if (isFullySettled) {
    split.settledAt = new Date();
  }

  await split.save();

  let ledgerTransaction = null;
  if (body.logTransaction) {
    const isInflow = split.direction === SplitDirectionEnum.OWED_TO_ME;
    ledgerTransaction = await createTransactionService(
      {
        title: isInflow
          ? `Settlement from ${split.counterpartyName}`
          : `Settled IOU to ${split.counterpartyName}`,
        amount: settleAmt,
        type: isInflow
          ? TransactionTypeEnum.INCOME
          : TransactionTypeEnum.EXPENSE,
        category: "settlement",
        paymentMethod: PaymentMethodEnum.MOBILE_PAYMENT,
        date: new Date(),
        description: `Split settlement for "${split.title}"`,
        accountId: targetAccountId,
        isRecurring: false,
      },
      userId
    );
  }

  return {
    split,
    settledAmount: settleAmt,
    ledgerTransaction,
  };
};

export const deleteSplitService = async (userId: string, splitId: string) => {
  const deleted = await SplitModel.findOneAndDelete({ _id: splitId, userId });
  if (!deleted) throw new NotFoundException("Split / IOU record not found");
  return { deleted: true };
};
