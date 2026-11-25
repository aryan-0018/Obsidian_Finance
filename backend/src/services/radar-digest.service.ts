import mongoose from "mongoose";
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInDays,
  endOfDay,
  startOfDay,
  subDays,
  subMonths,
} from "date-fns";
import TransactionModel, {
  RecurringIntervalEnum,
  TransactionTypeEnum,
} from "../models/transaction.model";
import UserModel from "../models/user.model";
import { convertToUnit } from "../utils/format-currency";
import { getTelegramBotInstance } from "./telegram.service";
import { escapeHtml } from "../utils/security";
import { getAllGoalsService } from "./goal.service";
import { getAllSplitsService } from "./split.service";
import { getAllAccountsService } from "./account.service";

export interface DetectedSubscription {
  id: string;
  title: string;
  amount: number;
  category: string;
  interval: keyof typeof RecurringIntervalEnum;
  nextDueDate: string;
  daysUntilDue: number;
  monthlyEquivalent: number;
  source: "EXPLICIT" | "DETECTED";
  occurrences: number;
}

const normalizeMerchantKey = (title: string): string => {
  return String(title || "")
    .toLowerCase()
    .replace(/\b(auto[- ]?debit|emi|subscription|bill|payment|upi|nach)\b/gi, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const advanceDateByInterval = (
  date: Date,
  interval: keyof typeof RecurringIntervalEnum
): Date => {
  switch (interval) {
    case RecurringIntervalEnum.DAILY:
      return addDays(date, 1);
    case RecurringIntervalEnum.WEEKLY:
      return addWeeks(date, 1);
    case RecurringIntervalEnum.YEARLY:
      return addYears(date, 1);
    case RecurringIntervalEnum.MONTHLY:
    default:
      return addMonths(date, 1);
  }
};

const toMonthlyEquivalent = (
  amount: number,
  interval: keyof typeof RecurringIntervalEnum
): number => {
  switch (interval) {
    case RecurringIntervalEnum.DAILY:
      return amount * 30;
    case RecurringIntervalEnum.WEEKLY:
      return amount * 4.33;
    case RecurringIntervalEnum.YEARLY:
      return amount / 12;
    case RecurringIntervalEnum.MONTHLY:
    default:
      return amount;
  }
};

export const getSubscriptionRadarService = async (userId: string) => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const sixMonthsAgo = subMonths(now, 6);

  const [explicitRecurring, recentExpenses] = await Promise.all([
    TransactionModel.find({
      userId,
      isRecurring: true,
      type: TransactionTypeEnum.EXPENSE,
    }).lean(),
    TransactionModel.find({
      userId,
      type: TransactionTypeEnum.EXPENSE,
      date: { $gte: sixMonthsAgo },
    })
      .sort({ date: 1 })
      .lean(),
  ]);

  const subscriptions: DetectedSubscription[] = [];
  const seenKeys = new Set<string>();

  // 1. Explicit recurring transactions / EMIs
  for (const tx of explicitRecurring) {
    const amount = convertToUnit(Math.abs(Number(tx.amount) || 0));
    if (amount <= 0) continue;

    const interval = (tx.recurringInterval ||
      RecurringIntervalEnum.MONTHLY) as keyof typeof RecurringIntervalEnum;
    let nextDue = tx.nextRecurringDate
      ? new Date(tx.nextRecurringDate)
      : advanceDateByInterval(new Date(tx.date), interval);

    let guard = 0;
    while (nextDue < todayStart && guard < 24) {
      nextDue = advanceDateByInterval(nextDue, interval);
      guard++;
    }

    const daysUntilDue = differenceInDays(startOfDay(nextDue), todayStart);
    const normKey = normalizeMerchantKey(tx.title);
    if (normKey) seenKeys.add(normKey);

    subscriptions.push({
      id: tx._id.toString(),
      title: tx.title,
      amount: Math.round(amount * 100) / 100,
      category: tx.category || "subscription",
      interval,
      nextDueDate: nextDue.toISOString(),
      daysUntilDue,
      monthlyEquivalent: Math.round(toMonthlyEquivalent(amount, interval) * 100) / 100,
      source: "EXPLICIT",
      occurrences: 1,
    });
  }

  // 2. Pattern-detected recurring charges from historical expenses
  const grouped = new Map<
    string,
    Array<{ title: string; amount: number; category: string; date: Date; id: string }>
  >();

  for (const tx of recentExpenses) {
    const key = normalizeMerchantKey(tx.title);
    if (!key || key.length < 3 || seenKeys.has(key)) continue;

    const amt = convertToUnit(Math.abs(Number(tx.amount) || 0));
    if (amt <= 0) continue;

    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push({
      id: tx._id.toString(),
      title: tx.title,
      amount: amt,
      category: tx.category || "subscription",
      date: new Date(tx.date),
    });
  }

  for (const [, items] of grouped.entries()) {
    if (items.length < 2) continue;

    // Require similar amount across occurrences (within 20% tolerance)
    const amounts = items.map((i) => i.amount);
    const avgAmt = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const consistentAmt = amounts.every(
      (a) => Math.abs(a - avgAmt) / Math.max(avgAmt, 1) <= 0.2
    );
    if (!consistentAmt) continue;

    // Compute median gap in days between sorted occurrences
    const gaps: number[] = [];
    for (let i = 1; i < items.length; i++) {
      const gap = differenceInDays(items[i].date, items[i - 1].date);
      if (gap >= 4) gaps.push(gap);
    }
    if (gaps.length === 0) continue;

    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    let detectedInterval: keyof typeof RecurringIntervalEnum | null = null;
    if (avgGap >= 5 && avgGap <= 9) {
      detectedInterval = RecurringIntervalEnum.WEEKLY;
    } else if (avgGap >= 24 && avgGap <= 36) {
      detectedInterval = RecurringIntervalEnum.MONTHLY;
    } else if (avgGap >= 350 && avgGap <= 380) {
      detectedInterval = RecurringIntervalEnum.YEARLY;
    }
    if (!detectedInterval) continue;

    const latest = items[items.length - 1];
    let nextDue = advanceDateByInterval(latest.date, detectedInterval);
    let guard = 0;
    while (nextDue < todayStart && guard < 12) {
      nextDue = advanceDateByInterval(nextDue, detectedInterval);
      guard++;
    }

    const daysUntilDue = differenceInDays(startOfDay(nextDue), todayStart);
    const roundedAmt = Math.round(latest.amount * 100) / 100;

    subscriptions.push({
      id: `detected-${latest.id}`,
      title: latest.title,
      amount: roundedAmt,
      category: latest.category,
      interval: detectedInterval,
      nextDueDate: nextDue.toISOString(),
      daysUntilDue,
      monthlyEquivalent:
        Math.round(toMonthlyEquivalent(roundedAmt, detectedInterval) * 100) / 100,
      source: "DETECTED",
      occurrences: items.length,
    });
  }

  subscriptions.sort((a, b) => a.daysUntilDue - b.daysUntilDue);

  const totalMonthlyRecurring =
    Math.round(
      subscriptions.reduce((acc, s) => acc + s.monthlyEquivalent, 0) * 100
    ) / 100;
  const upcoming7Days = subscriptions.filter((s) => s.daysUntilDue <= 7);

  return {
    subscriptions,
    summary: {
      count: subscriptions.length,
      totalMonthlyRecurring,
      upcoming7DaysCount: upcoming7Days.length,
      upcoming7DaysTotal:
        Math.round(upcoming7Days.reduce((acc, s) => acc + s.amount, 0) * 100) /
        100,
    },
  };
};

export const generateWeeklyDigestService = async (userId: string) => {
  const now = new Date();
  const thisWeekStart = startOfDay(subDays(now, 6));
  const thisWeekEnd = endOfDay(now);
  const lastWeekStart = startOfDay(subDays(now, 13));
  const lastWeekEnd = endOfDay(subDays(now, 7));

  const userObjId = new mongoose.Types.ObjectId(userId);

  const [user, thisWeekRows, lastWeekRows, radar, goalsData, splitsData, accountsData] =
    await Promise.all([
      UserModel.findById(userId).select("name currency telegramChatId").lean(),
      TransactionModel.aggregate([
        {
          $match: {
            userId: userObjId,
            date: { $gte: thisWeekStart, $lte: thisWeekEnd },
            type: { $in: [TransactionTypeEnum.INCOME, TransactionTypeEnum.EXPENSE] },
          },
        },
        {
          $group: {
            _id: {
              type: "$type",
              category: { $toLower: "$category" },
            },
            totalSmallest: { $sum: { $abs: "$amount" } },
          },
        },
      ]),
      TransactionModel.aggregate([
        {
          $match: {
            userId: userObjId,
            date: { $gte: lastWeekStart, $lte: lastWeekEnd },
            type: TransactionTypeEnum.EXPENSE,
          },
        },
        {
          $group: {
            _id: null,
            totalSmallest: { $sum: { $abs: "$amount" } },
          },
        },
      ]),
      getSubscriptionRadarService(userId),
      getAllGoalsService(userId),
      getAllSplitsService(userId),
      getAllAccountsService(userId),
    ]);

  let thisWeekExpenses = 0;
  let thisWeekIncome = 0;
  const categoryTotals: Record<string, number> = {};

  for (const row of thisWeekRows) {
    const amt = convertToUnit(row.totalSmallest || 0);
    if (row._id.type === TransactionTypeEnum.INCOME) {
      thisWeekIncome += amt;
    } else if (row._id.type === TransactionTypeEnum.EXPENSE) {
      thisWeekExpenses += amt;
      const cat = row._id.category || "other";
      categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
    }
  }

  const lastWeekExpenses = convertToUnit(lastWeekRows[0]?.totalSmallest || 0);
  const deltaPercent =
    lastWeekExpenses > 0
      ? Math.round(
          ((thisWeekExpenses - lastWeekExpenses) / lastWeekExpenses) * 1000
        ) / 10
      : 0;

  const topCategories = Object.entries(categoryTotals)
    .map(([category, amount]) => ({
      category,
      amount: Math.round(amount * 100) / 100,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  const upcomingRenewals = radar.subscriptions
    .filter((s) => s.daysUntilDue >= 0 && s.daysUntilDue <= 7)
    .slice(0, 4);

  const digest = {
    userName: user?.name || "Client",
    currency: user?.currency || "INR",
    thisWeekExpenses: Math.round(thisWeekExpenses * 100) / 100,
    lastWeekExpenses: Math.round(lastWeekExpenses * 100) / 100,
    thisWeekIncome: Math.round(thisWeekIncome * 100) / 100,
    deltaPercent,
    topCategories,
    upcomingRenewals,
    goalsSummary: goalsData.summary,
    splitsSummary: splitsData.summary,
    accountsSummary: accountsData.summary,
  };

  return digest;
};

export const formatWeeklyDigestHtml = (
  digest: Awaited<ReturnType<typeof generateWeeklyDigestService>>
) => {
  const fmt = (val: number) =>
    new Intl.NumberFormat(digest.currency === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency: digest.currency || "INR",
      maximumFractionDigits: 0,
    }).format(val);

  const trendIcon = digest.deltaPercent > 0 ? "📈" : "📉";
  const trendText =
    digest.lastWeekExpenses > 0
      ? `${digest.deltaPercent > 0 ? "+" : ""}${digest.deltaPercent}% vs last week`
      : "First week tracked";

  let msg =
    `📊 <b>Weekly Summary</b>\n` +
    `Hello, <b>${escapeHtml(digest.userName)}</b>. Here is your 7-day overview:\n\n` +
    `💸 <b>7-Day Spending:</b> ${escapeHtml(fmt(digest.thisWeekExpenses))} (${trendIcon} ${escapeHtml(trendText)})\n` +
    `💰 <b>7-Day Income:</b> ${escapeHtml(fmt(digest.thisWeekIncome))}\n`;

  if (digest.accountsSummary.accountCount > 0) {
    msg += `🏦 <b>Net Account Balance:</b> ${escapeHtml(fmt(digest.accountsSummary.netBalance))}\n`;
  }

  if (digest.topCategories.length > 0) {
    msg += `\n📌 <b>Top Categories:</b>\n`;
    for (const c of digest.topCategories) {
      msg += `  • ${escapeHtml(c.category.toUpperCase())}: ${escapeHtml(fmt(c.amount))}\n`;
    }
  }

  if (digest.upcomingRenewals.length > 0) {
    msg += `\n⏰ <b>Upcoming Bills (Next 7 Days):</b>\n`;
    for (const sub of digest.upcomingRenewals) {
      const dueStr =
        sub.daysUntilDue === 0
          ? "Today"
          : sub.daysUntilDue === 1
            ? "Tomorrow"
            : `In ${sub.daysUntilDue}d`;
      msg += `  • ${escapeHtml(sub.title)} — ${escapeHtml(fmt(sub.amount))} (${dueStr})\n`;
    }
  }

  if (digest.splitsSummary.totalOwedToMe > 0 || digest.splitsSummary.totalIOwe > 0) {
    msg +=
      `\n🤝 <b>Pending IOUs:</b> Owed to you ${escapeHtml(fmt(digest.splitsSummary.totalOwedToMe))} | ` +
      `You owe ${escapeHtml(fmt(digest.splitsSummary.totalIOwe))}\n`;
  }

  if (digest.goalsSummary.totalGoals > 0) {
    msg += `\n🎯 <b>Savings Goals Progress:</b> ${digest.goalsSummary.overallPercent}% (${escapeHtml(fmt(digest.goalsSummary.totalSaved))} / ${escapeHtml(fmt(digest.goalsSummary.totalTarget))})\n`;
  }

  return msg;
};

export const sendWeeklyDigestToTelegramService = async (userId: string) => {
  const user = await UserModel.findById(userId).select("telegramChatId").lean();
  if (!user?.telegramChatId) {
    return { sent: false, reason: "Telegram Copilot is not paired yet." };
  }

  const bot = getTelegramBotInstance();
  if (!bot) {
    return { sent: false, reason: "Telegram bot service is currently offline." };
  }

  const digest = await generateWeeklyDigestService(userId);
  const html = formatWeeklyDigestHtml(digest);

  await bot.telegram.sendMessage(user.telegramChatId, html, {
    parse_mode: "HTML",
  });

  return { sent: true, digest };
};
