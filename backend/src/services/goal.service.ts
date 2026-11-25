import { z } from "zod";
import SavingsGoalModel, {
  SavingsGoalStatusEnum,
} from "../models/savings-goal.model";
import AccountModel from "../models/account.model";
import { BadRequestException, NotFoundException } from "../utils/app-error";
import { objectIdSchema } from "../validators/transaction.validator";
import { applyAccountBalanceDelta } from "./account.service";
import { TransactionTypeEnum } from "../models/transaction.model";

export const createGoalSchema = z.object({
  title: z.string().trim().min(1, "Goal title is required").max(120),
  targetAmount: z.coerce
    .number()
    .finite()
    .min(1, "Target amount must be at least 1")
    .max(1_000_000_000),
  currentAmount: z.coerce.number().finite().min(0).max(1_000_000_000).default(0),
  deadline: z
    .union([
      z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid deadline"),
      z.date(),
    ])
    .transform((v) => new Date(v))
    .nullable()
    .optional(),
  category: z.string().trim().max(60).optional().default("Savings"),
  accountId: objectIdSchema.nullable().optional(),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .default("#e5c158"),
});

export const updateGoalSchema = createGoalSchema.partial();

export const contributeGoalSchema = z.object({
  amount: z.coerce
    .number()
    .finite()
    .min(0.01, "Contribution amount must be positive")
    .max(1_000_000_000),
  action: z.enum(["DEPOSIT", "WITHDRAW"]).default("DEPOSIT"),
  accountId: objectIdSchema.nullable().optional(),
});

export const getAllGoalsService = async (userId: string) => {
  const goals = await SavingsGoalModel.find({ userId })
    .populate("accountId", "name type accountMask color")
    .sort({ status: 1, createdAt: -1 });

  let totalTarget = 0;
  let totalSaved = 0;

  for (const g of goals) {
    totalTarget += Number(g.targetAmount) || 0;
    totalSaved += Number(g.currentAmount) || 0;
  }

  return {
    goals,
    summary: {
      totalGoals: goals.length,
      completedGoals: goals.filter(
        (g) => g.status === SavingsGoalStatusEnum.COMPLETED
      ).length,
      totalTarget: Math.round(totalTarget * 100) / 100,
      totalSaved: Math.round(totalSaved * 100) / 100,
      overallPercent:
        totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 1000) / 10 : 0,
    },
  };
};

export const createGoalService = async (
  userId: string,
  rawBody: z.infer<typeof createGoalSchema>
) => {
  if (rawBody.accountId) {
    const exists = await AccountModel.exists({
      _id: rawBody.accountId,
      userId,
    });
    if (!exists) throw new NotFoundException("Linked account not found");
  }

  const status =
    rawBody.currentAmount >= rawBody.targetAmount
      ? SavingsGoalStatusEnum.COMPLETED
      : SavingsGoalStatusEnum.ACTIVE;

  return SavingsGoalModel.create({
    ...rawBody,
    userId,
    status,
  });
};

export const updateGoalService = async (
  userId: string,
  goalId: string,
  rawBody: z.infer<typeof updateGoalSchema>
) => {
  const goal = await SavingsGoalModel.findOne({ _id: goalId, userId });
  if (!goal) throw new NotFoundException("Savings goal not found");

  if (rawBody.accountId) {
    const exists = await AccountModel.exists({
      _id: rawBody.accountId,
      userId,
    });
    if (!exists) throw new NotFoundException("Linked account not found");
  }

  goal.set(rawBody);
  goal.status =
    goal.currentAmount >= goal.targetAmount
      ? SavingsGoalStatusEnum.COMPLETED
      : SavingsGoalStatusEnum.ACTIVE;

  await goal.save();
  return goal;
};

export const contributeToGoalService = async (
  userId: string,
  goalId: string,
  rawBody: z.infer<typeof contributeGoalSchema>
) => {
  const goal = await SavingsGoalModel.findOne({ _id: goalId, userId });
  if (!goal) throw new NotFoundException("Savings goal not found");

  const current = Number(goal.currentAmount) || 0;
  const delta = Number(rawBody.amount);

  if (rawBody.action === "WITHDRAW" && delta > current) {
    throw new BadRequestException("Cannot withdraw more than current saved amount");
  }

  const linkedAccountId = rawBody.accountId || goal.accountId?.toString() || null;
  if (linkedAccountId) {
    const accExists = await AccountModel.exists({ _id: linkedAccountId, userId });
    if (!accExists) throw new NotFoundException("Account not found");
  }

  goal.currentAmount =
    rawBody.action === "DEPOSIT" ? current + delta : current - delta;
  goal.status =
    goal.currentAmount >= goal.targetAmount
      ? SavingsGoalStatusEnum.COMPLETED
      : SavingsGoalStatusEnum.ACTIVE;

  await goal.save();

  if (linkedAccountId) {
    await applyAccountBalanceDelta(userId, {
      type:
        rawBody.action === "DEPOSIT"
          ? TransactionTypeEnum.EXPENSE
          : TransactionTypeEnum.INCOME,
      amount: delta,
      accountId: linkedAccountId,
    });
  }

  return goal;
};

export const deleteGoalService = async (userId: string, goalId: string) => {
  const deleted = await SavingsGoalModel.findOneAndDelete({
    _id: goalId,
    userId,
  });
  if (!deleted) throw new NotFoundException("Savings goal not found");
  return { deleted: true };
};
