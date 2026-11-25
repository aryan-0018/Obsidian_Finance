import mongoose from "mongoose";
import AccountModel, { AccountTypeEnum } from "../models/account.model";
import TransactionModel, {
  PaymentMethodEnum,
  TransactionTypeEnum,
} from "../models/transaction.model";
import { BadRequestException, NotFoundException } from "../utils/app-error";
import { convertToSmallestUnit } from "../utils/format-currency";
import {
  CreateAccountType,
  TransferAccountsType,
  UpdateAccountType,
} from "../validators/account.validator";
import { computeTransactionBlockHash, getGenesisHash } from "./ledger-audit.service";
import { withUserLedgerLock } from "../utils/ledger-lock";

/**
 * Normalizes an account mask to its last 4 alphanumeric digits (e.g., "**4521" -> "4521")
 * for reliable SMS matching.
 */
export const normalizeAccountMask = (mask?: string | null): string | null => {
  if (!mask) return null;
  const cleaned = String(mask).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (!cleaned) return null;
  return cleaned.length > 4 ? cleaned.slice(-4) : cleaned;
};

/**
 * Applies a balance delta using unit amounts; Mongoose's schema setter on
 * `AccountModel.balance` converts the `$inc` value to smallest units once.
 */
export const applyAccountBalanceDelta = async (
  userId: string,
  params: {
    type: string;
    amount: number;
    accountId?: string | mongoose.Types.ObjectId | null;
    toAccountId?: string | mongoose.Types.ObjectId | null;
  },
  invert = false
) => {
  const unitAmount = Math.abs(Number(params.amount) || 0);
  if (unitAmount <= 0) return;

  const sign = invert ? -1 : 1;

  if (params.type === TransactionTypeEnum.TRANSFER) {
    if (params.accountId) {
      await AccountModel.updateOne(
        { _id: params.accountId, userId },
        { $inc: { balance: -unitAmount * sign } }
      );
    }
    if (params.toAccountId) {
      await AccountModel.updateOne(
        { _id: params.toAccountId, userId },
        { $inc: { balance: unitAmount * sign } }
      );
    }
    return;
  }

  if (!params.accountId) return;

  if (params.type === TransactionTypeEnum.INCOME) {
    await AccountModel.updateOne(
      { _id: params.accountId, userId },
      { $inc: { balance: unitAmount * sign } }
    );
  } else if (params.type === TransactionTypeEnum.EXPENSE) {
    await AccountModel.updateOne(
      { _id: params.accountId, userId },
      { $inc: { balance: -unitAmount * sign } }
    );
  }
};

export const getAllAccountsService = async (userId: string) => {
  const accounts = await AccountModel.find({ userId }).sort({
    isDefault: -1,
    createdAt: 1,
  });

  let totalAssets = 0;
  let totalCreditDebt = 0;
  let totalCreditLimit = 0;

  for (const acc of accounts) {
    const bal = Number(acc.balance) || 0;
    if (acc.type === AccountTypeEnum.CREDIT_CARD) {
      if (bal < 0) {
        totalCreditDebt += Math.abs(bal);
      } else {
        totalAssets += bal;
      }
      totalCreditLimit += Number(acc.creditLimit) || 0;
    } else {
      totalAssets += bal;
    }
  }

  return {
    accounts,
    summary: {
      totalAssets: Math.round(totalAssets * 100) / 100,
      totalCreditDebt: Math.round(totalCreditDebt * 100) / 100,
      netBalance: Math.round((totalAssets - totalCreditDebt) * 100) / 100,
      totalCreditLimit: Math.round(totalCreditLimit * 100) / 100,
      accountCount: accounts.length,
    },
  };
};

export const createAccountService = async (
  userId: string,
  body: CreateAccountType
) => {
  const existingCount = await AccountModel.countDocuments({ userId });
  const isDefault = body.isDefault || existingCount === 0;

  if (isDefault) {
    await AccountModel.updateMany({ userId }, { $set: { isDefault: false } });
  }

  const account = await AccountModel.create({
    ...body,
    userId,
    accountMask: normalizeAccountMask(body.accountMask),
    isDefault,
  });

  return account;
};

export const updateAccountService = async (
  userId: string,
  accountId: string,
  body: UpdateAccountType
) => {
  const existing = await AccountModel.findOne({ _id: accountId, userId });
  if (!existing) {
    throw new NotFoundException("Account not found");
  }

  if (body.isDefault) {
    await AccountModel.updateMany(
      { userId, _id: { $ne: accountId } },
      { $set: { isDefault: false } }
    );
  }

  existing.set({
    ...(body.name !== undefined && { name: body.name }),
    ...(body.type !== undefined && { type: body.type }),
    ...(body.institution !== undefined && { institution: body.institution }),
    ...(body.accountMask !== undefined && {
      accountMask: normalizeAccountMask(body.accountMask),
    }),
    ...(body.balance !== undefined && { balance: body.balance }),
    ...(body.creditLimit !== undefined && { creditLimit: body.creditLimit }),
    ...(body.currency !== undefined && { currency: body.currency }),
    ...(body.isDefault !== undefined && { isDefault: body.isDefault }),
    ...(body.color !== undefined && { color: body.color }),
  });

  await existing.save();
  return existing;
};

export const deleteAccountService = async (
  userId: string,
  accountId: string
) => {
  const account = await AccountModel.findOneAndDelete({
    _id: accountId,
    userId,
  });
  if (!account) {
    throw new NotFoundException("Account not found");
  }

  // Unlink deleted account from historical transactions cleanly without erasing ledger history
  await TransactionModel.updateMany(
    { userId, accountId },
    { $set: { accountId: null } }
  );
  await TransactionModel.updateMany(
    { userId, toAccountId: accountId },
    { $set: { toAccountId: null } }
  );

  // Promote next account to default if deleted one was default
  if (account.isDefault) {
    const nextDefault = await AccountModel.findOne({ userId }).sort({
      createdAt: 1,
    });
    if (nextDefault) {
      nextDefault.isDefault = true;
      await nextDefault.save();
    }
  }

  return { deleted: true };
};

export const resolveAccountForSmsService = async (
  userId: string,
  rawMask?: string | null
) => {
  const normalized = normalizeAccountMask(rawMask);
  if (normalized) {
    const matched = await AccountModel.findOne({
      userId,
      accountMask: normalized,
    });
    if (matched) return matched;
  }

  const defaultAcc = await AccountModel.findOne({ userId }).sort({
    isDefault: -1,
    createdAt: 1,
  });
  return defaultAcc;
};

export const transferBetweenAccountsService = async (
  userId: string,
  body: TransferAccountsType
) => {
  return withUserLedgerLock(userId, async () => {
    const [fromAcc, toAcc] = await Promise.all([
      AccountModel.findOne({ _id: body.fromAccountId, userId }),
      AccountModel.findOne({ _id: body.toAccountId, userId }),
    ]);

    if (!fromAcc) {
      throw new NotFoundException("Source account not found");
    }
    if (!toAcc) {
      throw new NotFoundException("Destination account not found");
    }
    if (fromAcc._id.toString() === toAcc._id.toString()) {
      throw new BadRequestException(
        "Source and destination accounts must be different"
      );
    }

    const lastTx = await TransactionModel.findOne({ userId })
      .sort({ createdAt: -1, _id: -1 })
      .select("ledgerHash")
      .lean();

    const prevLedgerHash = lastTx?.ledgerHash || getGenesisHash();
    const txTitle =
      body.title ||
      (toAcc.type === AccountTypeEnum.CREDIT_CARD
        ? `Card Bill Payment → ${toAcc.name}`
        : `Transfer: ${fromAcc.name} → ${toAcc.name}`);

    const transaction = await TransactionModel.create({
      userId,
      title: txTitle,
      amount: Number(body.amount),
      type: TransactionTypeEnum.TRANSFER,
      category: "transfer",
      paymentMethod: PaymentMethodEnum.BANK_TRANSFER,
      date: body.date || new Date(),
      description:
        body.description ||
        `Internal transfer from ${fromAcc.name} to ${toAcc.name}`,
      accountId: fromAcc._id,
      toAccountId: toAcc._id,
      isRecurring: false,
      prevLedgerHash,
    });

    const blockHash = computeTransactionBlockHash(prevLedgerHash, {
      _id: transaction._id,
      date: transaction.date,
      amount: convertToSmallestUnit(Number(body.amount)),
      type: transaction.type,
      title: transaction.title,
    });

    transaction.ledgerHash = blockHash;
    await transaction.save();

    await applyAccountBalanceDelta(userId, {
      type: TransactionTypeEnum.TRANSFER,
      amount: Number(body.amount),
      accountId: fromAcc._id,
      toAccountId: toAcc._id,
    });

    return {
      transaction,
      fromAccountId: fromAcc._id,
      toAccountId: toAcc._id,
    };
  });
};
