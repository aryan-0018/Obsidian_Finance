import { format } from "date-fns";
import UserModel from "../../models/user.model";
import {
  formatWeeklyDigestHtml,
  generateWeeklyDigestService,
  getSubscriptionRadarService,
} from "../../services/radar-digest.service";
import { getTelegramBotInstance } from "../../services/telegram.service";
import { escapeHtml } from "../../utils/security";

let isProcessingRenewals = false;
let isProcessingDigests = false;
const sentRenewalKeys = new Set<string>();

/**
 * Daily job: notifies Telegram-paired users about subscriptions/EMIs due within 24h.
 */
export const processRenewalRemindersJob = async () => {
  if (isProcessingRenewals) return { success: true, sentCount: 0 };
  isProcessingRenewals = true;

  let sentCount = 0;
  try {
    const bot = getTelegramBotInstance();
    if (!bot) return { success: true, sentCount: 0 };

    const todayKey = format(new Date(), "yyyy-MM-dd");
    const users = await UserModel.find({
      telegramChatId: { $nin: [null, ""] },
    })
      .select("_id telegramChatId currency")
      .lean();

    for (const user of users) {
      const userId = user._id.toString();
      try {
        const radar = await getSubscriptionRadarService(userId);
        const dueSoon = radar.subscriptions.filter(
          (s) => s.daysUntilDue >= 0 && s.daysUntilDue <= 1
        );

        for (const sub of dueSoon) {
          const dedupKey = `${todayKey}:${userId}:${sub.id}`;
          if (sentRenewalKeys.has(dedupKey)) continue;

          const currency = user.currency || "INR";
          const formattedAmt = new Intl.NumberFormat(
            currency === "INR" ? "en-IN" : "en-US",
            { style: "currency", currency }
          ).format(sub.amount);

          const whenStr = sub.daysUntilDue === 0 ? "today" : "tomorrow";
          const msg =
            `⏰ <b>Upcoming Recurring Charge (${whenStr})</b>\n\n` +
            `📌 <b>Item:</b> ${escapeHtml(sub.title)}\n` +
            `💰 <b>Amount:</b> ${escapeHtml(formattedAmt)}\n` +
            `🔄 <b>Cycle:</b> ${escapeHtml(sub.interval)}\n\n` +
            `<i>Use /subscriptions to review all active EMIs &amp; subscriptions.</i>`;

          await bot.telegram
            .sendMessage(user.telegramChatId!, msg, { parse_mode: "HTML" })
            .catch(() => {});

          sentRenewalKeys.add(dedupKey);
          sentCount++;
        }
      } catch {
        // Isolate failures per user
      }
    }

    return { success: true, sentCount };
  } finally {
    isProcessingRenewals = false;
  }
};

/**
 * Weekly Sunday digest job: pushes personalized 7-day summary to Telegram.
 */
export const processWeeklyDigestJob = async () => {
  if (isProcessingDigests) return { success: true, sentCount: 0 };
  isProcessingDigests = true;

  let sentCount = 0;
  try {
    const bot = getTelegramBotInstance();
    if (!bot) return { success: true, sentCount: 0 };

    const users = await UserModel.find({
      telegramChatId: { $nin: [null, ""] },
    })
      .select("_id telegramChatId")
      .lean();

    for (const user of users) {
      try {
        const digest = await generateWeeklyDigestService(user._id.toString());
        const html = formatWeeklyDigestHtml(digest);
        await bot.telegram
          .sendMessage(user.telegramChatId!, html, { parse_mode: "HTML" })
          .catch(() => {});
        sentCount++;
      } catch {
        // Isolate failures per user
      }
    }

    return { success: true, sentCount };
  } finally {
    isProcessingDigests = false;
  }
};
