import { Telegraf } from "telegraf";
import { Env } from "../config/env.config";
import UserModel from "../models/user.model";
import { createTransactionService } from "./transaction.service";
import { summaryAnalyticsService, chatWithAiFinancialAdvisorService } from "./analytics.service";
import { DateRangeEnum } from "../enums/date-range.enum";
import {
  TransactionTypeEnum,
  PaymentMethodEnum,
} from "../models/transaction.model";
import {
  generateContentWithRetry,
} from "../config/google-ai.config";
import { createPartFromBase64, createUserContent } from "@google/genai";
import { receiptPrompt } from "../utils/prompt";
import axios from "axios";
import {
  parseIndianCurrencyExpression,
  detectIndianMerchantAndCategory,
} from "./voice-terminal.service";
import { parseBankDate } from "../utils/nlp-parser";

let bot: Telegraf | null = null;
let botUsername: string = "";

const VALID_CATEGORIES = [
  "groceries",
  "dining",
  "transportation",
  "utilities",
  "entertainment",
  "shopping",
  "healthcare",
  "travel",
  "housing",
  "income",
  "investments",
  "other",
];

export const initTelegramBot = async () => {
  const token = Env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    console.log(
      "[Telegram Copilot] TELEGRAM_BOT_TOKEN is not configured. Telegram bot service inactive."
    );
    return;
  }

  // Gracefully stop any existing instance in memory before reinitializing
  if (bot) {
    try {
      bot.stop("RELOAD");
    } catch {
      // ignore
    }
    bot = null;
  }

  try {
    bot = new Telegraf(token);

    bot.catch((err: any) => {
      const errMsg = String(err?.message || err);
      const isRoutineTimeout =
        err?.name === "TimeoutError" ||
        errMsg.includes("timed out") ||
        errMsg.includes("ETIMEDOUT") ||
        errMsg.includes("ECONNRESET");

      const isConflict =
        err?.response?.error_code === 409 ||
        errMsg.includes("409") ||
        errMsg.includes("Conflict");

      if (isRoutineTimeout) {
        console.log("[Telegram Copilot] Polling connection cycle refreshed.");
      } else if (isConflict) {
        console.warn("[Telegram Copilot] Notice: Concurrent polling detected. Instance will retry momentarily.");
      } else {
        console.error("[Telegram Copilot] Global bot error:", err);
      }
    });

    const me = await bot.telegram.getMe();
    botUsername = me.username;
    console.log(`[Telegram Copilot] Successfully initialized as @${botUsername}`);

    // --- /start Command ---
    bot.start(async (ctx) => {
      const payload = ctx.payload?.trim();
      const chatId = ctx.chat.id.toString();
      const tgUsername = ctx.from.username || ctx.from.first_name || "Client";

      if (payload) {
        // Attempt pairing with the code
        const user = await UserModel.findOne({
          telegramPairingCode: payload.toUpperCase(),
          telegramPairingCodeExpires: { $gt: new Date() },
        });

        if (user) {
          user.telegramChatId = chatId;
          user.telegramUsername = tgUsername;
          user.telegramPairingCode = null;
          user.telegramPairingCodeExpires = null;
          await user.save();

          return ctx.reply(
            `✨ *Obsidian Copilot Activated!*\n\nWelcome, *${user.name}*! Your Telegram account is now securely linked to your Obsidian Finance portfolio.\n\n` +
              `💬 *How to use Obsidian Copilot:*\n` +
              `• *Quick Expenses:* Text _"Spent 450 on lunch with card"_ or _"Paid 15000 rent via bank transfer"_\n` +
              `• *Quick Income:* Text _"Got 45000 salary"_ or _"Received 5000 dividend"_\n` +
              `• *Instant Receipt OCR:* Snap & send any bill or receipt photo 🧾\n` +
              `• *Live Stats:* Type /balance or /stats\n` +
              `• *AI Queries:* Ask _"How much did I spend this month?"_ or _"Can I afford dinner tonight?"_\n\n` +
              `Your Obsidian web dashboard will synchronize in real time! ⚡`,
            { parse_mode: "Markdown" }
          );
        } else {
          return ctx.reply(
            `❌ *Invalid or Expired Link Code*\n\n` +
              `Please open your Obsidian Finance web application, go to Settings, and generate a new connection link.`,
            { parse_mode: "Markdown" }
          );
        }
      }

      // If no payload, check if already paired
      const existingUser = await UserModel.findOne({ telegramChatId: chatId });
      if (existingUser) {
        return ctx.reply(
          `💼 *Obsidian Copilot Active*\n\nConnected Account: *${existingUser.name}* (${existingUser.email})\n\n` +
            `Type /balance for your current portfolio stats or send any transaction or receipt to log it instantly!`,
          { parse_mode: "Markdown" }
        );
      }

      return ctx.reply(
        `🔒 *Obsidian Finance Copilot*\n\n` +
          `To link your Obsidian portfolio, open the Obsidian Finance web app, navigate to Settings / Copilot, and click *"Connect Telegram"* to generate your instant link code.\n\n` +
          `Once linked, you can log expenses, scan receipts with your camera, and query your finances directly from Telegram!`,
        { parse_mode: "Markdown" }
      );
    });

    // --- /balance, /portfolio, /stats, /summary, /budget, /spending Command ---
    bot.command(["balance", "stats", "summary", "budget", "portfolio", "spending", "networth"], async (ctx) => {
      const chatId = ctx.chat.id.toString();
      const user = await UserModel.findOne({ telegramChatId: chatId });
      if (!user) {
        return ctx.reply(
          `⚠️ Your Telegram account is not yet paired with Obsidian Finance.\nUse /start with your pairing code from the web app.`
        );
      }

      try {
        const text = (ctx.message.text || "").toLowerCase();
        let targetPreset = DateRangeEnum.THIS_MONTH;
        let periodName = "This Month";

        if (text.includes("last month") || text.includes("last_month")) {
          targetPreset = DateRangeEnum.LAST_MONTH;
          periodName = "Last Month";
        } else if (text.includes("this year") || text.includes("this_year") || text.includes("ytd")) {
          targetPreset = DateRangeEnum.THIS_YEAR;
          periodName = "This Year";
        } else if (text.includes("last year") || text.includes("last_year")) {
          targetPreset = DateRangeEnum.LAST_YEAR;
          periodName = "Last Year";
        } else if (text.includes("all time") || text.includes("all_time") || text.includes("overall")) {
          targetPreset = DateRangeEnum.ALL_TIME;
          periodName = "All Time";
        } else if (text.includes("30 days") || text.includes("last 30")) {
          targetPreset = DateRangeEnum.LAST_30_DAYS;
          periodName = "Last 30 Days";
        }

        const periodSummary = await summaryAnalyticsService(
          user._id.toString(),
          targetPreset
        );
        const allTime = await summaryAnalyticsService(
          user._id.toString(),
          DateRangeEnum.ALL_TIME
        );
        const baseWealth = Number(user.portfolioBalance) || 0;
        const totalPortfolioBalance = baseWealth + allTime.availableBalance;
        const accrualSign = allTime.availableBalance >= 0 ? "+" : "";

        return ctx.reply(
          `📊 *Obsidian Portfolio Snapshot*\n\n` +
            `💼 *Total Portfolio Balance:* ₹${Math.round(totalPortfolioBalance).toLocaleString("en-IN")}\n` +
            `_(Base: ₹${Math.round(baseWealth).toLocaleString("en-IN")} • Accrual: ${accrualSign}₹${Math.round(allTime.availableBalance).toLocaleString("en-IN")})_\n\n` +
            `📅 *${periodName}'s Activity:*\n` +
            `• 📈 *Income:* ₹${Math.round(periodSummary.totalIncome).toLocaleString("en-IN")}\n` +
            `• 📉 *Expenses:* ₹${Math.round(periodSummary.totalExpenses).toLocaleString("en-IN")}\n` +
            `• 💵 *Net Cash Flow:* ${periodSummary.availableBalance >= 0 ? "+" : ""}₹${Math.round(periodSummary.availableBalance).toLocaleString("en-IN")}\n` +
            `• 🎯 *Savings Rate:* ${periodSummary.savingRate?.percentage || 0}%\n` +
            `• 💳 *Budget Remaining:* ${periodSummary.budgetLimit > 0 ? `₹${Math.round(periodSummary.remainingBudget).toLocaleString("en-IN")} / ₹${Math.round(periodSummary.budgetLimit).toLocaleString("en-IN")}` : "No limit set"}\n` +
            `• 🧾 *Transactions:* ${periodSummary.transactionCount}\n\n` +
            `_Synced with your Obsidian Portfolio._`,
          { parse_mode: "Markdown" }
        );
      } catch (err: any) {
        return ctx.reply(`Failed to fetch portfolio snapshot: ${err.message}`);
      }
    });

    // --- /unlink Command ---
    bot.command("unlink", async (ctx) => {
      const chatId = ctx.chat.id.toString();
      const user = await UserModel.findOne({ telegramChatId: chatId });
      if (!user) {
        return ctx.reply("Account is not paired.");
      }

      user.telegramChatId = null;
      user.telegramUsername = null;
      await user.save();

      return ctx.reply(
        "🔓 *Obsidian Copilot Disconnected*\nYour Telegram account has been unlinked from Obsidian Finance.",
        { parse_mode: "Markdown" }
      );
    });

    // --- Photo / Bill Receipt Handler ---
    bot.on("photo", async (ctx) => {
      const chatId = ctx.chat.id.toString();
      const user = await UserModel.findOne({ telegramChatId: chatId });
      if (!user) {
        return ctx.reply(
          `⚠️ Please link your Obsidian account first by getting a pairing code from the web dashboard!`
        );
      }

      await ctx.reply("🔍 *Analyzing receipt image with Gemini Vision...*", {
        parse_mode: "Markdown",
      });

      try {
        const photos = ctx.message.photo;
        const highestResPhoto = photos[photos.length - 1];
        const fileLink = await ctx.telegram.getFileLink(highestResPhoto.file_id);

        const response = await axios.get(fileLink.href, {
          responseType: "arraybuffer",
        });
        const base64Image = Buffer.from(response.data).toString("base64");

        const aiResponse = await generateContentWithRetry({
          contents: [
            createUserContent([
              receiptPrompt,
              createPartFromBase64(base64Image, "image/jpeg"),
            ]),
          ],
        });

        const rawText = aiResponse.text || "{}";
        const cleaned = rawText.replace(/```(?:json)?\n?/g, "").trim();
        const parsed = JSON.parse(cleaned);

        if (!parsed.amount || isNaN(Number(parsed.amount))) {
          return ctx.reply(
            "⚠️ Could not clearly extract total amount or merchant from this image. Please ensure the receipt is well-lit and legible."
          );
        }

        const validMethods = Object.values(PaymentMethodEnum);
        const paymentMethod = validMethods.includes(parsed.paymentMethod)
          ? parsed.paymentMethod
          : PaymentMethodEnum.CARD;

        const category = VALID_CATEGORIES.includes(parsed.category?.toLowerCase())
          ? parsed.category.toLowerCase()
          : "shopping";

        let date = parseBankDate(parsed.date);

        const tx = await createTransactionService(
          {
            title: parsed.title || "Scanned Receipt",
            amount: Math.abs(Number(parsed.amount)),
            type: TransactionTypeEnum.EXPENSE,
            category,
            paymentMethod,
            date,
            description: parsed.description || "Scanned via Telegram Copilot",
            isRecurring: false,
          },
          user._id.toString()
        );

        return ctx.reply(
          `🧾 *Receipt Processed & Logged!*\n\n` +
            `📌 *Merchant:* ${tx.title}\n` +
            `💸 *Amount:* ₹${Number(tx.amount).toLocaleString("en-IN")}\n` +
            `🏷 *Category:* ${category.charAt(0).toUpperCase() + category.slice(1)}\n` +
            `💳 *Payment Method:* ${paymentMethod}\n` +
            `📅 *Date:* ${tx.date.toISOString().split("T")[0]}\n\n` +
            `⚡ _Saved to your transactions & dashboard updated!_`,
          { parse_mode: "Markdown" }
        );
      } catch (err: any) {
        console.error("[Telegram Copilot] Receipt processing error:", err);
        return ctx.reply(
          `❌ Failed to parse receipt: ${err.message || "Unknown error"}`
        );
      }
    });

    // --- Audio and Voice Note Handler (Transcribes audio with Gemini & logs or answers) ---
    const processAudioMessage = async (
      ctx: any,
      fileId: string,
      mimeType: string = "audio/ogg"
    ) => {
      const chatId = ctx.chat.id.toString();
      const user = await UserModel.findOne({ telegramChatId: chatId });
      if (!user) {
        return ctx.reply(
          `⚠️ Please link your Obsidian account first using /start <code> from your web dashboard.`
        );
      }

      try {
        await ctx.sendChatAction("typing");
        const fileLink = await ctx.telegram.getFileLink(fileId);

        const response = await axios.get(fileLink.href, {
          responseType: "arraybuffer",
        });
        const base64Audio = Buffer.from(response.data).toString("base64");

        const voicePrompt = `
You are the Obsidian Finance Voice Intelligence Core.
Analyze this user's audio message (which may be in English, Indian English, or Hinglish).
Today's Date: ${new Date().toISOString().split("T")[0]}

Strictly extract and output valid JSON:
{
  "transcript": "Exact transcription of user's spoken words",
  "isTransaction": boolean,
  "title": "Merchant name or transaction title (e.g. Swiggy, Starbucks, Uber, Salary)",
  "amount": number,
  "type": "EXPENSE" | "INCOME",
  "category": "groceries" | "dining" | "transportation" | "utilities" | "entertainment" | "shopping" | "healthcare" | "travel" | "housing" | "income" | "investments" | "other",
  "paymentMethod": "CARD" | "CASH" | "BANK_TRANSFER" | "AUTO_DEBIT" | "MOBILE_PAYMENT" | "OTHER"
}
If the message is an analytical or advisory question (e.g., "what's my balance?"), set "isTransaction": false.
`;

        const aiRes = await generateContentWithRetry({
          contents: [
            createUserContent([
              voicePrompt,
              createPartFromBase64(base64Audio, mimeType),
            ]),
          ],
          config: {
            responseMimeType: "application/json",
            temperature: 0,
          },
        });

        const raw = aiRes.text || "{}";
        const parsed = JSON.parse(raw.replace(/```(?:json)?\n?/g, "").trim());
        const cleanAmt = typeof parsed.amount === "string"
          ? parseFloat(parsed.amount.replace(/[^0-9.]/g, ""))
          : Number(parsed.amount);

        if (parsed.isTransaction && cleanAmt && cleanAmt > 0) {
          const type =
            parsed.type === "INCOME"
              ? TransactionTypeEnum.INCOME
              : TransactionTypeEnum.EXPENSE;

          const category = VALID_CATEGORIES.includes(parsed.category?.toLowerCase())
            ? parsed.category.toLowerCase()
            : type === TransactionTypeEnum.INCOME
            ? "income"
            : "other";

          const paymentMethod = Object.values(PaymentMethodEnum).includes(parsed.paymentMethod)
            ? parsed.paymentMethod
            : PaymentMethodEnum.CARD;

          const created = await createTransactionService(
            {
              title: parsed.title || (type === TransactionTypeEnum.INCOME ? "Income" : "Expense"),
              amount: Math.abs(cleanAmt),
              type,
              category,
              paymentMethod,
              date: new Date(),
              description: `Voice Note: "${parsed.transcript || "Audio input"}"`,
              isRecurring: false,
            },
            user._id.toString()
          );

          const icon = type === TransactionTypeEnum.INCOME ? "📈" : "📉";
          return ctx.reply(
            `🎙️ *Voice Note Transcribed:*\n_${parsed.transcript || "Spoken command"}_\n\n` +
              `✅ *Transaction Logged!*\n` +
              `${icon} *${type}:* ₹${Number(created.amount).toLocaleString("en-IN")}\n` +
              `📌 *Title:* ${created.title}\n` +
              `🏷 *Category:* ${category.charAt(0).toUpperCase() + category.slice(1)}\n` +
              `💳 *Method:* ${paymentMethod}\n` +
              `📅 *Date:* ${new Date().toISOString().split("T")[0]}\n\n` +
              `⚡ _Live in your Obsidian dashboard!_`,
            { parse_mode: "Markdown" }
          );
        } else {
          // Analytical or general financial question from voice
          const spokenQuery = parsed.transcript || "What is my current portfolio standing?";
          const advisorResponse = await chatWithAiFinancialAdvisorService(
            user._id.toString(),
            spokenQuery
          );

          let replyMsg = `🎙️ *Voice Note:* _${spokenQuery}_\n\n🧠 *${
            advisorResponse.headline || "Financial Insights"
          }*\n\n${advisorResponse.summary}`;

          if (advisorResponse.keyMetrics?.length) {
            replyMsg += `\n\n📊 *Key Figures:*`;
            for (const m of advisorResponse.keyMetrics) {
              replyMsg += `\n• *${m.label}:* ${m.value}`;
            }
          }

          return ctx.reply(replyMsg, { parse_mode: "Markdown" });
        }
      } catch (voiceErr: any) {
        console.error("[Telegram Copilot] Audio note processing error:", voiceErr);
        return ctx.reply(
          `⚠️ Failed to parse audio note: ${voiceErr.message || "Audio processing unavailable"}`
        );
      }
    };

    bot.on("voice", async (ctx) => {
      await processAudioMessage(ctx, ctx.message.voice.file_id, "audio/ogg");
    });

    bot.on("audio", async (ctx) => {
      const mime = ctx.message.audio.mime_type || "audio/mp3";
      await processAudioMessage(ctx, ctx.message.audio.file_id, mime);
    });

    // --- Natural Language Text Handler ---
    bot.on("text", async (ctx) => {
      const text = ctx.message.text.trim();
      if (text.startsWith("/")) return; // Handled by command handlers

      const chatId = ctx.chat.id.toString();
      const user = await UserModel.findOne({ telegramChatId: chatId });
      if (!user) {
        return ctx.reply(
          `⚠️ Please link your Obsidian account first using /start <code> from your web dashboard.`
        );
      }

      // Check if it's a transaction logging command or a financial question/query
      const merchantList = "swiggy|zomato|uber|ola|rapido|zepto|blinkit|starbucks|biryani|chai|tea|coffee|petrol|diesel|fuel|pizza|burger|groceries|rent|gym|recharge|flight|medicine";
      const isTxIntent =
        /\b(spent|spend|paid|pay|bought|buy|cost|add\s+expense|add\s+transaction|record|log|earned|salary|stipend|freelance|credited|debited)\b/i.test(text) ||
        /(?:₹|rs\.?|inr|\$)\s*\d+/i.test(text) ||
        /\b\d+\s*(?:rupees?|rupaye|rs\.?|bucks|k\b|lakh|crore)\b/i.test(text) ||
        new RegExp(`\\b(?:${merchantList})\\s+(?:for\\s+|of\\s+)?\\d+`, "i").test(text) ||
        new RegExp(`\\b\\d+\\s+(?:for\\s+|on\\s+)?(?:${merchantList})\\b`, "i").test(text);

      if (isTxIntent) {
        try {
          const parsePrompt = `
Extract transaction details from this message: "${text}".
Current Date: ${new Date().toISOString().split("T")[0]}

Output STRICTLY JSON with these exact fields:
{
  "isTransaction": boolean,
  "title": string,
  "amount": number,
  "type": "INCOME" | "EXPENSE",
  "category": "groceries" | "dining" | "transportation" | "utilities" | "entertainment" | "shopping" | "healthcare" | "travel" | "housing" | "income" | "investments" | "other",
  "paymentMethod": "CARD" | "CASH" | "BANK_TRANSFER" | "AUTO_DEBIT" | "MOBILE_PAYMENT" | "OTHER",
  "date": "YYYY-MM-DD"
}
If this is purely an analytical question (e.g. "what did I spend?"), set "isTransaction": false.
`;

          const aiRes = await generateContentWithRetry({
            contents: parsePrompt,
            config: { responseMimeType: "application/json" },
          });

          const raw = aiRes.text || "{}";
          const parsed = JSON.parse(raw.replace(/```(?:json)?\n?/g, "").trim());
          const cleanAmt = typeof parsed.amount === "string"
            ? parseFloat(parsed.amount.replace(/[^0-9.]/g, ""))
            : Number(parsed.amount);

          if (parsed.isTransaction && cleanAmt && cleanAmt > 0) {
            const type =
              parsed.type === "INCOME"
                ? TransactionTypeEnum.INCOME
                : TransactionTypeEnum.EXPENSE;

            const category = VALID_CATEGORIES.includes(
              parsed.category?.toLowerCase()
            )
              ? parsed.category.toLowerCase()
              : type === TransactionTypeEnum.INCOME
              ? "income"
              : "other";

            const paymentMethod = Object.values(PaymentMethodEnum).includes(
              parsed.paymentMethod
            )
              ? parsed.paymentMethod
              : PaymentMethodEnum.CARD;

            let date = new Date();
            if (parsed.date) {
              const d = new Date(parsed.date);
              if (!isNaN(d.getTime())) date = d;
            }

            const created = await createTransactionService(
              {
                title: parsed.title || (type === TransactionTypeEnum.INCOME ? "Income" : "Expense"),
                amount: Math.abs(cleanAmt),
                type,
                category,
                paymentMethod,
                date,
                description: `Logged via Telegram: "${text}"`,
                isRecurring: false,
              },
              user._id.toString()
            );

            const icon = type === TransactionTypeEnum.INCOME ? "📈" : "📉";
            return ctx.reply(
              `✅ *Transaction Logged!*\n\n` +
                `${icon} *${type}:* ₹${Number(created.amount).toLocaleString(
                  "en-IN"
                )}\n` +
                `📌 *Title:* ${created.title}\n` +
                `🏷 *Category:* ${category.charAt(0).toUpperCase() + category.slice(1)}\n` +
                `💳 *Method:* ${paymentMethod}\n` +
                `📅 *Date:* ${date.toISOString().split("T")[0]}\n\n` +
                `⚡ _Live in your Obsidian dashboard!_`,
              { parse_mode: "Markdown" }
            );
          }
        } catch (err) {
          console.warn("[Telegram Copilot] AI text parse error, trying local fallback:", err);
          const localAmount = parseIndianCurrencyExpression(text);
          if (localAmount && localAmount > 0) {
            const detected = detectIndianMerchantAndCategory(text);
            const created = await createTransactionService(
              {
                title: detected.title,
                amount: localAmount,
                type: detected.type,
                category: detected.category,
                paymentMethod: detected.paymentMethod,
                date: new Date(),
                description: `Logged via Telegram: "${text}"`,
                isRecurring: false,
              },
              user._id.toString()
            );

            const icon = detected.type === TransactionTypeEnum.INCOME ? "📈" : "📉";
            return ctx.reply(
              `✅ *Transaction Logged!*\n\n` +
                `${icon} *${detected.type}:* ₹${Number(created.amount).toLocaleString("en-IN")}\n` +
                `📌 *Title:* ${created.title}\n` +
                `🏷 *Category:* ${detected.category.charAt(0).toUpperCase() + detected.category.slice(1)}\n` +
                `💳 *Method:* ${detected.paymentMethod}\n` +
                `📅 *Date:* ${new Date().toISOString().split("T")[0]}\n\n` +
                `⚡ _Live in your Obsidian dashboard!_`,
              { parse_mode: "Markdown" }
            );
          }
        }
      }

      // If not a transaction (or transaction extraction failed), answer with AI Financial Advisor
      try {
        const advisorResponse = await chatWithAiFinancialAdvisorService(
          user._id.toString(),
          text
        );

        let replyMsg = `🧠 *${advisorResponse.headline || "Financial Insights"}*\n\n${
          advisorResponse.summary
        }`;

        if (advisorResponse.keyMetrics?.length) {
          replyMsg += `\n\n📊 *Key Figures:*`;
          for (const m of advisorResponse.keyMetrics) {
            replyMsg += `\n• *${m.label}:* ${m.value}`;
          }
        }

        if (advisorResponse.bulletPoints?.length) {
          replyMsg += `\n\n📌 *Insights:*`;
          for (const b of advisorResponse.bulletPoints) {
            replyMsg += `\n• ${b}`;
          }
        }

        return ctx.reply(replyMsg, { parse_mode: "Markdown" });
      } catch (err: any) {
        return ctx.reply(`⚠️ ${err.message || "Could not process request."}`);
      }
    });

    const launchPolling = async (retries = 6, delayMs = 3500): Promise<void> => {
      if (!bot) return;

      try {
        // Clear any lingering webhook or pending updates lock before starting long-polling
        try {
          await bot.telegram.deleteWebhook({ drop_pending_updates: true });
        } catch {
          // ignore
        }

        await bot.launch({
          dropPendingUpdates: true,
        });
        console.log(`[Telegram Copilot] Bot polling running actively as @${botUsername}`);
      } catch (err: any) {
        const errMsg = String(err?.message || err);
        const isConflict =
          err?.response?.error_code === 409 ||
          errMsg.includes("409") ||
          errMsg.includes("Conflict");

        if (isConflict && retries > 0) {
          console.warn(
            `[Telegram Copilot] Notice: 409 Conflict (previous bot process is disconnecting from Telegram). Auto-retrying in ${Math.round(
              delayMs / 1000
            )}s... (${retries} attempts left)`
          );
          setTimeout(() => {
            launchPolling(retries - 1, delayMs);
          }, delayMs);
          return;
        }

        if (err?.name === "TimeoutError" || errMsg.includes("timed out")) {
          console.log("[Telegram Copilot] Launch polling cycle completed.");
        } else {
          console.error("[Telegram Copilot] Failed to initiate polling:", errMsg);
        }
      }
    };

    launchPolling();

    const cleanShutdown = (signal: string) => {
      if (bot) {
        try {
          bot.stop(signal);
        } catch {
          // ignore
        }
      }
    };

    process.once("SIGINT", () => cleanShutdown("SIGINT"));
    process.once("SIGTERM", () => cleanShutdown("SIGTERM"));
    process.once("SIGUSR2", () => cleanShutdown("SIGUSR2"));
    process.once("beforeExit", () => cleanShutdown("beforeExit"));
  } catch (err) {
    console.error("[Telegram Copilot] Failed to launch bot:", err);
  }
};

export const stopTelegramBot = async () => {
  if (bot) {
    try {
      bot.stop("SHUTDOWN");
    } catch {
      // ignore
    }
    bot = null;
  }
};

export const getTelegramBotUsername = () => botUsername;

export const generateTelegramPairingCodeService = async (userId: string) => {
  // Generate random 6-character uppercase code e.g. "OB-7842"
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  const code = `OB-${randomDigits}`;
  const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

  await UserModel.findByIdAndUpdate(userId, {
    telegramPairingCode: code,
    telegramPairingCodeExpires: expires,
  });

  const uname = botUsername || "ObsidianFinanceBot";
  const link = `https://t.me/${uname}?start=${code}`;

  return {
    code,
    expiresAt: expires,
    botUsername: uname,
    link,
  };
};

export const getTelegramStatusService = async (userId: string) => {
  const user = await UserModel.findById(userId).lean();
  return {
    isConnected: !!user?.telegramChatId,
    telegramUsername: user?.telegramUsername || null,
    botUsername: botUsername || "ObsidianFinanceBot",
  };
};

export const unlinkTelegramService = async (userId: string) => {
  await UserModel.findByIdAndUpdate(userId, {
    telegramChatId: null,
    telegramUsername: null,
    telegramPairingCode: null,
    telegramPairingCodeExpires: null,
  });

  return { success: true };
};

