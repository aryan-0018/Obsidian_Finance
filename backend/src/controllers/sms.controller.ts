import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middlerware";
import { HTTPSTATUS } from "../config/http.config";
import { BadRequestException } from "../utils/app-error";
import { authenticateApiKey } from "../services/api-key.service";
import { parseBankSms, checkDuplicateSmsTransaction } from "../services/sms-parser.service";
import { createTransactionService } from "../services/transaction.service";
import { getTelegramBotInstance } from "../services/telegram.service";

export const ingestSmsController = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Authenticate via private API Key header
    const rawApiKey = (req.headers["x-api-key"] || req.headers["authorization"]?.replace(/^Bearer\s+/i, "")) as string | undefined;
    const user = await authenticateApiKey(rawApiKey);

    // 2. Extract and validate incoming payload
    const { message, sender } = req.body;
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      throw new BadRequestException("Field 'message' is required and must be non-empty text");
    }

    const cleanMessage = message.trim();
    const cleanSender = typeof sender === "string" ? sender.trim() : undefined;

    // 3. Parse SMS with zero-latency deterministic regex + AI fallback
    const parsed = await parseBankSms(cleanMessage, cleanSender);

    if (!parsed.isTransaction || parsed.amount <= 0) {
      return res.status(HTTPSTATUS.OK).json({
        success: false,
        isTransaction: false,
        message: "SMS does not contain a recognized financial debit or credit alert.",
      });
    }

    // 4. Duplicate transaction safeguard (UTR / time-window matching)
    const duplicateCheck = await checkDuplicateSmsTransaction(
      user._id.toString(),
      parsed
    );

    if (duplicateCheck.isDuplicate) {
      return res.status(HTTPSTATUS.OK).json({
        success: true,
        isDuplicate: true,
        message: duplicateCheck.reason,
        transactionId: duplicateCheck.duplicateId,
      });
    }

    // 5. Commit clean transaction to ledger and balance (only essential fields)
    const transaction = await createTransactionService(
      {
        title: parsed.title,
        amount: parsed.amount,
        type: parsed.type,
        category: parsed.category,
        paymentMethod: parsed.paymentMethod,
        date: new Date(),
        description: `Automated SMS Ingest: ${parsed.title}`,
        isRecurring: false,
      },
      user._id.toString()
    );

    // 6. Proactive sync alert to Telegram if user has Telegram Copilot paired
    if (user.telegramChatId) {
      try {
        const bot = getTelegramBotInstance();
        if (bot) {
          const typeIcon = parsed.type === "INCOME" ? "📈" : "📉";
          const formattedAmt = new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
          }).format(parsed.amount);

          const alertMsg =
            `📲 *SMS Auto-Logged*\n\n` +
            `${typeIcon} *${parsed.title}*\n` +
            `💰 *Amount:* ${formattedAmt}\n` +
            `🏷️ *Category:* ${parsed.category.toUpperCase()}\n\n` +
            `_Synced dynamically with your Obsidian ledger._`;

          bot.telegram.sendMessage(user.telegramChatId, alertMsg, {
            parse_mode: "Markdown",
          }).catch(() => {});
        }
      } catch {
        // Silently continue if Telegram ping fails
      }
    }

    return res.status(HTTPSTATUS.CREATED).json({
      success: true,
      isDuplicate: false,
      message: "Transaction successfully parsed and committed to ledger",
      data: {
        id: transaction._id,
        title: transaction.title,
        amount: transaction.amount,
        type: transaction.type,
        category: transaction.category,
        paymentMethod: transaction.paymentMethod,
        date: transaction.date,
        externalRef: transaction.externalRef,
        ledgerHash: transaction.ledgerHash,
      },
    });
  }
);
