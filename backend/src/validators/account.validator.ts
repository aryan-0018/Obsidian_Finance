import { z } from "zod";
import { AccountTypeEnum } from "../models/account.model";
import { objectIdSchema } from "./transaction.validator";

export const createAccountSchema = z.object({
  name: z.string().trim().min(1, "Account name is required").max(80),
  type: z
    .enum([
      AccountTypeEnum.BANK,
      AccountTypeEnum.CREDIT_CARD,
      AccountTypeEnum.CASH,
      AccountTypeEnum.WALLET,
      AccountTypeEnum.INVESTMENT,
    ])
    .default(AccountTypeEnum.BANK),
  institution: z.string().trim().max(80).optional().default(""),
  accountMask: z
    .string()
    .trim()
    .max(12)
    .nullable()
    .optional(),
  balance: z.coerce
    .number()
    .finite("Balance must be a valid number")
    .min(-1_000_000_000)
    .max(1_000_000_000)
    .default(0),
  creditLimit: z.coerce
    .number()
    .finite("Credit limit must be a valid number")
    .min(0)
    .max(1_000_000_000)
    .optional()
    .default(0),
  currency: z.string().trim().min(3).max(6).default("INR"),
  isDefault: z.boolean().optional().default(false),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a 6-digit hex code")
    .optional()
    .default("#e5c158"),
});

export const updateAccountSchema = createAccountSchema.partial();

export const accountIdParamSchema = objectIdSchema;

export const transferAccountsSchema = z
  .object({
    fromAccountId: objectIdSchema,
    toAccountId: objectIdSchema,
    amount: z.coerce
      .number()
      .finite("Amount must be valid")
      .min(0.01, "Transfer amount must be at least 0.01")
      .max(1_000_000_000),
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(1000).optional(),
    date: z
      .union([
        z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
          message: "Invalid date string",
        }),
        z.date(),
      ])
      .transform((val) => new Date(val))
      .optional(),
  })
  .refine((data) => data.fromAccountId !== data.toAccountId, {
    message: "Source and destination accounts must be different",
    path: ["toAccountId"],
  });

export type CreateAccountType = z.infer<typeof createAccountSchema>;
export type UpdateAccountType = z.infer<typeof updateAccountSchema>;
export type TransferAccountsType = z.infer<typeof transferAccountsSchema>;
