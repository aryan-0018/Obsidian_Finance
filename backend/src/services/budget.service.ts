import mongoose from "mongoose";
import { startOfMonth, endOfMonth, format } from "date-fns";
import BudgetModel, { CategoryBudgetLimit } from "../models/budget.model";
import TransactionModel, {
  TransactionTypeEnum,
} from "../models/transaction.model";
import UserModel from "../models/user.model";
import { convertToUnit } from "../utils/format-currency";
import { getTelegramBotInstance } from "./telegram.service";
import { escapeHtml } from "../utils/security";

export const getCurrentMonthSpendingByCategory = async (userId: string) => {
  const now = new Date();
  const from = startOfMonth(now);
  const to = endOfMonth(now);

  const rows = await TransactionModel.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        type: TransactionTypeEnum.EXPENSE,
        date: { $gte: from, $lte: to },
      },
    },
    {
      $group: {
        _id: { $toLower: "$category" },
        totalSmallest: { $sum: { $abs: "$amount" } },
      },
    },
  ]);

  const byCategory: Record<string, number> = {};
  let totalSpent = 0;

  for (const row of rows) {
    const cat = String(row._id || "other").toLowerCase();
    const amt = convertToUnit(row.totalSmallest || 0);
    byCategory[cat] = (byCategory[cat] || 0) + amt;
    totalSpent += amt;
  }

  return {
    byCategory,
    totalSpent: Math.round(totalSpent * 100) / 100,
  };
};

export const getBudgetService = async (userId: string) => {
  let budget = await BudgetModel.findOne({ userId });

  if (!budget) {
    budget = await BudgetModel.create({
      userId,
      limit: 0,
      categoryLimits: [],
    });
  }

  const { byCategory, totalSpent } =
    await getCurrentMonthSpendingByCategory(userId);

  const categoryProgress = (budget.categoryLimits || []).map((cl) => {
    const catKey = cl.category.toLowerCase();
    const spent = Math.round((byCategory[catKey] || 0) * 100) / 100;
    const limit = Number(cl.limit) || 0;
    const percentUsed =
      limit > 0 ? Math.round((spent / limit) * 1000) / 10 : 0;
    const status =
      limit <= 0
        ? "NO_LIMIT"
        : percentUsed >= 100
          ? "EXCEEDED"
          : percentUsed >= 80
            ? "WARNING"
            : "SAFE";

    return {
      category: catKey,
      limit,
      spent,
      remaining: Math.round((limit - spent) * 100) / 100,
      percentUsed,
      status,
    };
  });

  const budgetedSet = new Set(categoryProgress.map((c) => c.category));
  const unbudgetedSpending = Object.entries(byCategory)
    .filter(([cat, amt]) => !budgetedSet.has(cat) && amt > 0)
    .map(([category, spent]) => ({ category, spent }))
    .sort((a, b) => b.spent - a.spent);

  const globalLimit = Number(budget.limit) || 0;
  const globalPercentUsed =
    globalLimit > 0 ? Math.round((totalSpent / globalLimit) * 1000) / 10 : 0;

  return {
    _id: budget._id,
    userId: budget.userId,
    limit: globalLimit,
    currency: budget.currency,
    totalSpent,
    remaining: Math.round((globalLimit - totalSpent) * 100) / 100,
    percentUsed: globalPercentUsed,
    categoryLimits: budget.categoryLimits || [],
    categoryProgress,
    unbudgetedSpending,
    createdAt: budget.createdAt,
    updatedAt: budget.updatedAt,
  };
};

export const updateBudgetService = async (
  userId: string,
  limitOrPayload:
    | number
    | { limit?: number; categoryLimits?: CategoryBudgetLimit[] }
) => {
  const updateFields: Record<string, any> = {};

  if (typeof limitOrPayload === "number") {
    updateFields.limit = limitOrPayload;
  } else {
    if (limitOrPayload.limit !== undefined) {
      updateFields.limit = limitOrPayload.limit;
    }
    if (limitOrPayload.categoryLimits !== undefined) {
      // Deduplicate categories cleanly
      const deduped = new Map<string, number>();
      for (const item of limitOrPayload.categoryLimits) {
        const key = String(item.category || "").trim().toLowerCase();
        if (key && Number(item.limit) >= 0) {
          deduped.set(key, Number(item.limit));
        }
      }
      updateFields.categoryLimits = Array.from(deduped.entries()).map(
        ([category, limit]) => ({ category, limit })
      );
    }
  }

  await BudgetModel.findOneAndUpdate(
    { userId },
    { $set: updateFields },
    { new: true, upsert: true }
  );

  return getBudgetService(userId);
};

/**
 * Evaluates global & category budget thresholds after an EXPENSE transaction
 * and sends a non-spammy Telegram notification if 80% or 100% is crossed.
 */
export const checkAndNotifyBudgetThresholds = async (
  userId: string,
  category?: string
) => {
  try {
    const user = await UserModel.findById(userId)
      .select("telegramChatId currency")
      .lean();
    if (!user?.telegramChatId) return;

    const bot = getTelegramBotInstance();
    if (!bot) return;

    const budget = await BudgetModel.findOne({ userId }).select("+alertHistory");
    if (!budget) return;

    const monthKey = format(new Date(), "yyyy-MM");
    const { byCategory, totalSpent } =
      await getCurrentMonthSpendingByCategory(userId);

    const history = (budget.alertHistory || []).filter(
      (h) => h.monthKey === monthKey
    );
    const hasAlerted = (key: string, level: "80" | "100") =>
      history.some((h) => h.key === key && h.level === level);

    const currency = user.currency || "INR";
    const fmt = (val: number) =>
      new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(val);

    const alertsToSend: Array<{
      key: string;
      label: string;
      level: "80" | "100";
      spent: number;
      limit: number;
      pct: number;
    }> = [];

    // 1. Check Global Budget
    if (budget.limit > 0) {
      const pct = (totalSpent / budget.limit) * 100;
      if (pct >= 100 && !hasAlerted("__global__", "100")) {
        alertsToSend.push({
          key: "__global__",
          label: "Monthly Global Budget",
          level: "100",
          spent: totalSpent,
          limit: budget.limit,
          pct,
        });
      } else if (pct >= 80 && pct < 100 && !hasAlerted("__global__", "80")) {
        alertsToSend.push({
          key: "__global__",
          label: "Monthly Global Budget",
          level: "80",
          spent: totalSpent,
          limit: budget.limit,
          pct,
        });
      }
    }

    // 2. Check Category Budget
    if (category) {
      const catKey = category.trim().toLowerCase();
      const catLimitObj = (budget.categoryLimits || []).find(
        (c) => c.category.toLowerCase() === catKey
      );
      if (catLimitObj && catLimitObj.limit > 0) {
        const catSpent = byCategory[catKey] || 0;
        const pct = (catSpent / catLimitObj.limit) * 100;
        if (pct >= 100 && !hasAlerted(catKey, "100")) {
          alertsToSend.push({
            key: catKey,
            label: `${catKey.charAt(0).toUpperCase() + catKey.slice(1)} Category Budget`,
            level: "100",
            spent: catSpent,
            limit: catLimitObj.limit,
            pct,
          });
        } else if (pct >= 80 && pct < 100 && !hasAlerted(catKey, "80")) {
          alertsToSend.push({
            key: catKey,
            label: `${catKey.charAt(0).toUpperCase() + catKey.slice(1)} Category Budget`,
            level: "80",
            spent: catSpent,
            limit: catLimitObj.limit,
            pct,
          });
        }
      }
    }

    if (alertsToSend.length === 0) return;

    for (const alert of alertsToSend) {
      const icon = alert.level === "100" ? "🚨" : "⚠️";
      const header =
        alert.level === "100"
          ? `${icon} <b>Budget Limit Exceeded!</b>`
          : `${icon} <b>Budget Warning (80%+ Used)</b>`;

      const msg =
        `${header}\n\n` +
        `📌 <b>Scope:</b> ${escapeHtml(alert.label)}\n` +
        `💸 <b>Spent (${monthKey}):</b> ${escapeHtml(fmt(alert.spent))}\n` +
        `🎯 <b>Limit:</b> ${escapeHtml(fmt(alert.limit))} (${Math.round(alert.pct)}%)\n\n` +
        `<i>Check your Wallets → Budgets &amp; Goals tab for breakdown.</i>`;

      await bot.telegram
        .sendMessage(user.telegramChatId, msg, { parse_mode: "HTML" })
        .catch(() => {});

      history.push({
        key: alert.key,
        monthKey,
        level: alert.level,
        sentAt: new Date(),
      });
    }

    budget.alertHistory = history;
    await budget.save();
  } catch {
    // Non-critical notification; never fail transaction creation
  }
};
