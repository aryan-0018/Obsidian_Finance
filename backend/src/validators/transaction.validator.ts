import { z } from "zod";
import {
  PaymentMethodEnum,
  RecurringIntervalEnum,
  TransactionTypeEnum,
} from "../models/transaction.model";
import { isSafeHttpUrl } from "../utils/security";

export const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format");

export const transactionIdSchema = objectIdSchema;

export const baseTransactionSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(2000).optional(),
  type: z.enum(
    [
      TransactionTypeEnum.INCOME,
      TransactionTypeEnum.EXPENSE,
      TransactionTypeEnum.TRANSFER,
    ],
    {
      errorMap: () => ({
        message: "Transaction type must be INCOME, EXPENSE, or TRANSFER",
      }),
    }
  ),
  amount: z.coerce
    .number()
    .finite("Amount must be a valid number")
    .min(0.01, "Amount must be at least 0.01")
    .max(1_000_000_000, "Amount exceeds maximum allowed limit"),
  category: z.string().trim().min(1, "Category is required").max(100),
  date: z
    .union([
      z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
        message: "Invalid date string",
      }),
      z.date(),
    ])
    .transform((val) => new Date(val)),
  isRecurring: z.boolean().default(false),
  recurringInterval: z
    .enum([
      RecurringIntervalEnum.DAILY,
      RecurringIntervalEnum.WEEKLY,
      RecurringIntervalEnum.MONTHLY,
      RecurringIntervalEnum.YEARLY,
    ])
    .nullable()
    .optional(),

  receiptUrl: z
    .string()
    .trim()
    .refine(
      (val) => val === "" || isSafeHttpUrl(val),
      "Receipt URL must be a valid http:// or https:// URL"
    )
    .optional(),
  externalRef: z.string().trim().max(255).nullable().optional(),
  accountId: objectIdSchema.nullable().optional(),
  toAccountId: objectIdSchema.nullable().optional(),
  paymentMethod: z
    .enum([
      PaymentMethodEnum.CARD,
      PaymentMethodEnum.BANK_TRANSFER,
      PaymentMethodEnum.MOBILE_PAYMENT,
      PaymentMethodEnum.AUTO_DEBIT,
      PaymentMethodEnum.CASH,
      PaymentMethodEnum.OTHER,
    ])
    .default(PaymentMethodEnum.CASH),
});

export const bulkDeleteTransactionSchema = z.object({
  transactionIds: z
    .array(transactionIdSchema)
    .min(1, "At least one transaction ID must be provided")
    .max(500, "Cannot delete more than 500 transactions at once"),
});

export const bulkTransactionSchema = z.object({
  transactions: z
    .array(baseTransactionSchema)
    .min(1, "At least one transaction is required")
    .max(300, "Must not be more than 300 transactions"),
});

export const bulkCommitBankTransactionsSchema = z.object({
  transactions: z
    .array(
      baseTransactionSchema.extend({
        date: z
          .union([
            z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
              message: "Invalid date string",
            }),
            z.date(),
          ])
          .transform((val) => new Date(val))
          .optional(),
        paymentMethod: z
          .enum([
            PaymentMethodEnum.CARD,
            PaymentMethodEnum.BANK_TRANSFER,
            PaymentMethodEnum.MOBILE_PAYMENT,
            PaymentMethodEnum.AUTO_DEBIT,
            PaymentMethodEnum.CASH,
            PaymentMethodEnum.OTHER,
          ])
          .optional()
          .default(PaymentMethodEnum.BANK_TRANSFER),
      })
    )
    .min(1, "No transactions selected to import")
    .max(500, "Cannot import more than 500 transactions at once"),
});

export const transactionQuerySchema = z.object({
  keyword: z.string().trim().max(120).optional(),
  type: z
    .enum([
      TransactionTypeEnum.INCOME,
      TransactionTypeEnum.EXPENSE,
      TransactionTypeEnum.TRANSFER,
    ])
    .optional(),
  recurringStatus: z.enum(["RECURRING", "NON_RECURRING"]).optional(),
  category: z.string().trim().max(100).optional(),
  paymentMethod: z.string().trim().max(60).optional(),
  accountId: objectIdSchema.optional(),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
  pageNumber: z.coerce.number().int().min(1).max(10000).default(1),
});

export const createTransactionSchema = baseTransactionSchema;
export const updateTransactionSchema = baseTransactionSchema.partial();

export type CreateTransactionType = z.infer<typeof createTransactionSchema>;

export type UpdateTransactionType = z.infer<typeof updateTransactionSchema>;

export type BulkDelteTransactionType = z.infer<
  typeof bulkDeleteTransactionSchema
>;
