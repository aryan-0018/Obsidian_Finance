import mongoose from "mongoose";
import TransactionModel, {
  TransactionTypeEnum,
  PaymentMethodEnum,
} from "../models/transaction.model";
import { BadRequestException, NotFoundException } from "../utils/app-error";
import { calculateNextOccurrence } from "../utils/helper";
import {
  CreateTransactionType,
  UpdateTransactionType,
} from "../validators/transaction.validator";
import { generateContentWithRetry } from "../config/google-ai.config";
import { createPartFromBase64, createUserContent } from "@google/genai";
import { sendEmail } from "../mailers/mailer";
import { receiptPrompt } from "../utils/prompt";
import UserModel from "../models/user.model";
import { convertToSmallestUnit } from "../utils/format-currency";
import {
  computeTransactionBlockHash,
  getGenesisHash,
  recomputeUserLedgerChainUnlocked,
} from "./ledger-audit.service";
import { PDFParse } from "pdf-parse";
import {
  parseBankDate,
  detectIndianMerchantAndCategory,
  parseIndianCurrencyExpression,
  normalizeMerchantBrand,
} from "../utils/nlp-parser";
import { uploadBufferToCloudinary } from "../config/cloudinary.config";
import { assertValidReceiptFile } from "../utils/file-validation";
import { withUserLedgerLock } from "../utils/ledger-lock";
import { escapeHtml, escapeRegex, sanitizeCsvCell } from "../utils/security";
import AccountModel from "../models/account.model";
import {
  applyAccountBalanceDelta,
  resolveAccountForSmsService,
} from "./account.service";
import { checkAndNotifyBudgetThresholds } from "./budget.service";

const assertOwnedAccounts = async (
  userId: string,
  accountId?: string | null,
  toAccountId?: string | null,
  type?: string
) => {
  if (type === TransactionTypeEnum.TRANSFER) {
    if (!accountId || !toAccountId) {
      throw new BadRequestException(
        "Transfer requires both source and destination accounts"
      );
    }
    if (String(accountId) === String(toAccountId)) {
      throw new BadRequestException(
        "Source and destination accounts must be different"
      );
    }
  }
  if (accountId) {
    const exists = await AccountModel.exists({ _id: accountId, userId });
    if (!exists) throw new NotFoundException("Source account not found");
  }
  if (toAccountId) {
    const exists = await AccountModel.exists({ _id: toAccountId, userId });
    if (!exists) throw new NotFoundException("Destination account not found");
  }
};

export const createTransactionService = async (
  body: CreateTransactionType,
  userId: string
) => {
  return withUserLedgerLock(userId, async () => {
    let resolvedAccountId = body.accountId;
    if (
      resolvedAccountId === undefined &&
      body.type !== TransactionTypeEnum.TRANSFER
    ) {
      const defaultAcc = await resolveAccountForSmsService(userId);
      resolvedAccountId = defaultAcc?._id?.toString() || null;
    }

    await assertOwnedAccounts(
      userId,
      resolvedAccountId,
      body.toAccountId,
      body.type
    );

    let nextRecurringDate: Date | null = null;
    const currentDate = new Date();

    if (body.isRecurring && body.recurringInterval) {
      const calulatedDate = calculateNextOccurrence(
        body.date,
        body.recurringInterval
      );

      nextRecurringDate =
        calulatedDate < currentDate
          ? calculateNextOccurrence(currentDate, body.recurringInterval)
          : calulatedDate;
    }

    // Find previous transaction for Merkle hash chain continuity
    const lastTx = await TransactionModel.findOne({ userId })
      .sort({ createdAt: -1, _id: -1 })
      .select("ledgerHash")
      .lean();

    const prevLedgerHash = lastTx?.ledgerHash || getGenesisHash();

    const transaction = await TransactionModel.create({
      ...body,
      accountId: resolvedAccountId ?? null,
      userId,
      category: body.category,
      amount: Number(body.amount),
      isRecurring: body.isRecurring || false,
      recurringInterval: body.isRecurring ? body.recurringInterval || null : null,
      nextRecurringDate,
      lastProcessed: null,
      prevLedgerHash,
    });

    // Calculate and commit cryptographic block hash for tamper-proof ledger
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
      type: transaction.type,
      amount: Number(body.amount),
      accountId: transaction.accountId,
      toAccountId: transaction.toAccountId,
    });

    if (transaction.type === TransactionTypeEnum.EXPENSE) {
      void checkAndNotifyBudgetThresholds(userId, transaction.category);
    }

    return transaction;
  });
};

export const getAllTransactionService = async (
  userId: string,
  filters: {
    keyword?: string;
    type?: keyof typeof TransactionTypeEnum;
    category?: string;
    fromDate?: Date;
    toDate?: Date;
    recurringStatus?: "RECURRING" | "NON_RECURRING";
    accountId?: string;
  },
  pagination: {
    pageSize: number;
    pageNumber: number;
  }
) => {
  const { keyword, type, category, fromDate, toDate, recurringStatus, accountId } = filters;

  const filterConditions: Record<string, any> = {
    userId,
  };

  if (accountId) {
    filterConditions.$and = [
      ...(filterConditions.$and || []),
      { $or: [{ accountId }, { toAccountId: accountId }] },
    ];
  }

  if (keyword) {
    const safeKeyword = escapeRegex(keyword);
    filterConditions.$or = [
      { title: { $regex: safeKeyword, $options: "i" } },
      { category: { $regex: safeKeyword, $options: "i" } },
    ];
  }

  if (type) {
    filterConditions.type = type;
  }

  if (category && category.toLowerCase() !== "all") {
    filterConditions.category = {
      $regex: new RegExp(`^${escapeRegex(category)}$`, "i"),
    };
  }

  if (fromDate || toDate) {
    filterConditions.date = {};
    if (fromDate) filterConditions.date.$gte = fromDate;
    if (toDate) filterConditions.date.$lte = toDate;
  }

  if (recurringStatus) {
    if (recurringStatus === "RECURRING") {
      filterConditions.isRecurring = true;
    } else if (recurringStatus === "NON_RECURRING") {
      filterConditions.isRecurring = false;
    }
  }

  const { pageSize, pageNumber } = pagination;
  const skip = (pageNumber - 1) * pageSize;

  const [transations, totalCount] = await Promise.all([
    TransactionModel.find(filterConditions)
      .populate("accountId", "name type accountMask color")
      .populate("toAccountId", "name type accountMask color")
      .skip(skip)
      .limit(pageSize)
      .sort({ date: -1, createdAt: -1 }),
    TransactionModel.countDocuments(filterConditions),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    transations,
    pagination: {
      pageSize,
      pageNumber,
      totalCount,
      totalPages,
      skip,
    },
  };
};

export const getTransactionByIdService = async (
  userId: string,
  transactionId: string
) => {
  const transaction = await TransactionModel.findOne({
    _id: transactionId,
    userId,
  });
  if (!transaction) throw new NotFoundException("Transaction not found");

  return transaction;
};

export const duplicateTransactionService = async (
  userId: string,
  transactionId: string
) => {
  return withUserLedgerLock(userId, async () => {
    const transaction = await TransactionModel.findOne({
      _id: transactionId,
      userId,
    });
    if (!transaction) throw new NotFoundException("Transaction not found");

    const lastTx = await TransactionModel.findOne({ userId })
      .sort({ createdAt: -1, _id: -1 })
      .select("ledgerHash")
      .lean();

    const prevLedgerHash = lastTx?.ledgerHash || getGenesisHash();
    const newTxId = new mongoose.Types.ObjectId();
    const title = `Duplicate - ${transaction.title}`;
    const now = new Date();
    const rawAmt = Number(transaction.amount);

    const blockHash = computeTransactionBlockHash(prevLedgerHash, {
      _id: newTxId,
      date: now,
      amount: convertToSmallestUnit(rawAmt),
      type: transaction.type,
      title,
    });

    const txObj = transaction.toObject();
    delete (txObj as any)._id;
    delete (txObj as any).id;
    delete (txObj as any).externalRef;
    delete (txObj as any).ledgerHash;
    delete (txObj as any).prevLedgerHash;
    delete (txObj as any).createdAt;
    delete (txObj as any).updatedAt;

    const duplicated = await TransactionModel.create({
      ...txObj,
      _id: newTxId,
      title,
      date: now,
      description: transaction.description
        ? `${transaction.description} (Duplicate)`
        : "Duplicated transaction",
      isRecurring: false,
      recurringInterval: null,
      nextRecurringDate: null,
      externalRef: null,
      prevLedgerHash,
      ledgerHash: blockHash,
    });

    await duplicated.save();
    await applyAccountBalanceDelta(userId, {
      type: duplicated.type,
      amount: Number(duplicated.amount),
      accountId: duplicated.accountId,
      toAccountId: duplicated.toAccountId,
    });
    await recomputeUserLedgerChainUnlocked(userId);

    return duplicated;
  });
};

export const updateTransactionService = async (
  userId: string,
  transactionId: string,
  body: UpdateTransactionType
) => {
  return withUserLedgerLock(userId, async () => {
    const existingTransaction = await TransactionModel.findOne({
      _id: transactionId,
      userId,
    });
    if (!existingTransaction)
      throw new NotFoundException("Transaction not found");

    const oldType = existingTransaction.type;
    const oldAmount = Number(existingTransaction.amount);
    const oldAccountId = existingTransaction.accountId;
    const oldToAccountId = existingTransaction.toAccountId;

    const nextType = body.type ?? oldType;
    const nextAccountId =
      body.accountId !== undefined ? body.accountId : oldAccountId?.toString() || null;
    const nextToAccountId =
      body.toAccountId !== undefined
        ? body.toAccountId
        : oldToAccountId?.toString() || null;

    await assertOwnedAccounts(userId, nextAccountId, nextToAccountId, nextType);

    const now = new Date();
    const isRecurring = body.isRecurring ?? existingTransaction.isRecurring;

    const date =
      body.date !== undefined ? new Date(body.date) : existingTransaction.date;

    const recurringInterval = isRecurring
      ? body.recurringInterval ?? existingTransaction.recurringInterval ?? null
      : null;

    let nextRecurringDate: Date | null = null;

    if (isRecurring && recurringInterval) {
      const calulatedDate = calculateNextOccurrence(date, recurringInterval);

      nextRecurringDate =
        calulatedDate < now
          ? calculateNextOccurrence(now, recurringInterval)
          : calulatedDate;
    }

    existingTransaction.set({
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.type !== undefined && { type: body.type }),
      ...(body.paymentMethod !== undefined && {
        paymentMethod: body.paymentMethod,
      }),
      ...(body.amount !== undefined && { amount: Number(body.amount) }),
      ...(body.receiptUrl !== undefined && { receiptUrl: body.receiptUrl }),
      ...(body.accountId !== undefined && { accountId: body.accountId }),
      ...(body.toAccountId !== undefined && { toAccountId: body.toAccountId }),
      date,
      isRecurring,
      recurringInterval,
      nextRecurringDate,
    });

    const prevHash = existingTransaction.prevLedgerHash || getGenesisHash();
    const rawUnitAmount =
      body.amount !== undefined
        ? Number(body.amount)
        : Number(existingTransaction.amount);
    existingTransaction.ledgerHash = computeTransactionBlockHash(prevHash, {
      _id: existingTransaction._id,
      date,
      amount: convertToSmallestUnit(rawUnitAmount),
      type: existingTransaction.type,
      title: existingTransaction.title,
    });

    await existingTransaction.save();
    await applyAccountBalanceDelta(
      userId,
      {
        type: oldType,
        amount: oldAmount,
        accountId: oldAccountId,
        toAccountId: oldToAccountId,
      },
      true
    );
    await applyAccountBalanceDelta(userId, {
      type: existingTransaction.type,
      amount: Number(existingTransaction.amount),
      accountId: existingTransaction.accountId,
      toAccountId: existingTransaction.toAccountId,
    });
    await recomputeUserLedgerChainUnlocked(userId);

    return;
  });
};

export const deleteTransactionService = async (
  userId: string,
  transactionId: string
) => {
  return withUserLedgerLock(userId, async () => {
    const deleted = await TransactionModel.findOneAndDelete({
      _id: transactionId,
      userId,
    });
    if (!deleted) throw new NotFoundException("Transaction not found");

    await applyAccountBalanceDelta(
      userId,
      {
        type: deleted.type,
        amount: Number(deleted.amount),
        accountId: deleted.accountId,
        toAccountId: deleted.toAccountId,
      },
      true
    );

    await recomputeUserLedgerChainUnlocked(userId);

    return;
  });
};

export const bulkDeleteTransactionService = async (
  userId: string,
  transactionIds: string[]
) => {
  return withUserLedgerLock(userId, async () => {
    const toDelete = await TransactionModel.find({
      _id: { $in: transactionIds },
      userId,
    }).select("type amount accountId toAccountId");

    if (toDelete.length === 0)
      throw new NotFoundException("No transations found");

    const result = await TransactionModel.deleteMany({
      _id: { $in: transactionIds },
      userId,
    });

    for (const tx of toDelete) {
      await applyAccountBalanceDelta(
        userId,
        {
          type: tx.type,
          amount: Number(tx.amount),
          accountId: tx.accountId,
          toAccountId: tx.toAccountId,
        },
        true
      );
    }

    await recomputeUserLedgerChainUnlocked(userId);

    return {
      sucess: true,
      success: true,
      deletedCount: result.deletedCount,
    };
  });
};

export const bulkTransactionService = async (
  userId: string,
  transactions: CreateTransactionType[]
) => {
  return withUserLedgerLock(userId, async () => {
    const defaultAccount = await resolveAccountForSmsService(userId);
    const defaultAccountId = defaultAccount?._id?.toString() || null;

    const lastTx = await TransactionModel.findOne({ userId })
      .sort({ createdAt: -1, _id: -1 })
      .select("ledgerHash")
      .lean();
    let runningHash = lastTx?.ledgerHash || getGenesisHash();
    const baseTime = Date.now();

    const bulkOps = transactions.map((tx, idx) => {
      const smallestAmount = convertToSmallestUnit(tx.amount);
      const txDate = tx.date ? new Date(tx.date) : new Date();
      const tempId = new mongoose.Types.ObjectId();
      const resolvedAccountId =
        tx.accountId !== undefined ? tx.accountId : defaultAccountId;
      const prev = runningHash;
      runningHash = computeTransactionBlockHash(prev, {
        _id: tempId,
        date: txDate,
        amount: smallestAmount,
        type: tx.type,
        title: tx.title,
      });
      const stamp = new Date(baseTime + idx);

      return {
        insertOne: {
          document: {
            ...tx,
            _id: tempId,
            amount: smallestAmount,
            accountId: resolvedAccountId,
            userId,
            date: txDate,
            isRecurring: false,
            nextRecurringDate: null,
            recurringInterval: null,
            lastProcessed: null,
            prevLedgerHash: prev,
            ledgerHash: runningHash,
            createdAt: stamp,
            updatedAt: stamp,
          },
        },
      };
    });

    const result = await TransactionModel.bulkWrite(bulkOps, {
      ordered: true,
    });

    for (const tx of transactions) {
      const targetAccountId =
        tx.accountId !== undefined ? tx.accountId : defaultAccountId;
      if (targetAccountId) {
        await applyAccountBalanceDelta(userId, {
          type: tx.type,
          amount: Number(tx.amount),
          accountId: targetAccountId,
          toAccountId: tx.toAccountId,
        });
      }
    }

    return {
      insertedCount: result.insertedCount,
      success: true,
    };
  });
};

export const scanReceiptService = async (
  file: Express.Multer.File | undefined
) => {
  if (!file || !file.buffer || file.buffer.length === 0) {
    throw new BadRequestException("No receipt file provided");
  }

  const isPdf =
    file.mimetype === "application/pdf" ||
    file.originalname.toLowerCase().endsWith(".pdf");

  assertValidReceiptFile(file.buffer, isPdf);

  try {
    let base64String = file.buffer.toString("base64");
    let extractedPdfText = "";

    if (!base64String) {
      throw new BadRequestException("Could not read receipt file content");
    }

    // Clean data URL prefix if present
    base64String = base64String.replace(/^data:[a-z0-9/+-]+;base64,/i, "").trim();

    // If PDF, also extract text using pdf-parse for zero-failure redundancy
    if (isPdf) {
      let pdfParser: PDFParse | null = null;
      try {
        pdfParser = new PDFParse({ data: file.buffer });
        const textResult = await pdfParser.getText();
        extractedPdfText = textResult?.text?.trim() || "";
      } catch (pdfErr) {
        console.warn("[Receipt Scanner] PDF text extraction notice:", pdfErr);
      } finally {
        await pdfParser?.destroy().catch(() => {});
      }
    }

    let parsedData: any = null;

    // Strategy A: If PDF text was cleanly extracted, run high-speed text prompt first
    if (extractedPdfText && extractedPdfText.length > 20) {
      try {
        const textPrompt = `
Analyze this receipt text and extract transaction details matching this exact JSON format:
{
  "title": "Clean merchant or business name",
  "amount": 0.00,
  "date": "YYYY-MM-DD",
  "description": "Itemized overview or summary (max 60 words)",
  "category": "groceries | dining | transportation | utilities | entertainment | shopping | healthcare | travel | housing | other",
  "paymentMethod": "CARD | CASH | BANK_TRANSFER | AUTO_DEBIT | MOBILE_PAYMENT | OTHER",
  "subtotal": 0.00,
  "tax": 0.00,
  "discount": 0.00,
  "confidence": "HIGH",
  "items": [
    { "name": "Item name", "quantity": 1, "price": 0.00 }
  ]
}

Receipt text:
${extractedPdfText.slice(0, 15000)}
`;
        const result = await generateContentWithRetry({
          contents: textPrompt,
          config: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        });
        const cleaned = result.text?.replace(/```(?:json)?\n?/g, "").trim();
        if (cleaned) {
          try {
            const json = JSON.parse(cleaned);
            parsedData = Array.isArray(json) ? json[0] : json;
          } catch (jsonErr) {
            console.warn("[Receipt Scanner] Text JSON parse notice:", jsonErr);
          }
        }
      } catch (textErr) {
        console.warn("[Receipt Scanner] Text prompt fallback to vision multimodal:", textErr);
      }
    }

    // Strategy B: Multimodal Vision OCR (primary for image photos, or fallback for PDFs)
    if (!parsedData || !parsedData.amount) {
      let mimeType = "image/jpeg";
      if (isPdf) {
        mimeType = "application/pdf";
      } else if (file.mimetype && file.mimetype.startsWith("image/")) {
        mimeType = file.mimetype;
      } else if (file.originalname.match(/\.png$/i)) {
        mimeType = "image/png";
      } else if (file.originalname.match(/\.webp$/i)) {
        mimeType = "image/webp";
      } else if (file.originalname.match(/\.heic$/i)) {
        mimeType = "image/heic";
      }

      try {
        const result = await generateContentWithRetry({
          contents: [
            createUserContent([
              receiptPrompt,
              createPartFromBase64(base64String, mimeType),
            ]),
          ],
          config: {
            temperature: 0.1,
            topP: 0.95,
            responseMimeType: "application/json",
          },
        });

        const response = result.text;
        const cleanedText = response?.replace(/```(?:json)?\n?/g, "").trim();
        if (cleanedText) {
          try {
            const json = JSON.parse(cleanedText);
            parsedData = Array.isArray(json) ? json[0] : json;
          } catch (jsonErr) {
            console.warn("[Receipt Scanner] Vision JSON parse notice:", jsonErr);
          }
        }
      } catch (geminiErr: any) {
        console.error("[Receipt Scanner] Gemini Vision error:", geminiErr?.message || geminiErr);
        if (!extractedPdfText) {
          throw new BadRequestException(
            geminiErr?.message || "Could not analyze receipt image. Please ensure image is clear and try again."
          );
        }
      }
    }

    // Strategy C: Deterministic Local Extraction Fallback (Zero crash even if Gemini times out on text PDF)
    if (!parsedData && extractedPdfText) {
      const detectedAmount = parseIndianCurrencyExpression(extractedPdfText) || 0;
      const { title, category, paymentMethod } = detectIndianMerchantAndCategory(extractedPdfText);
      parsedData = {
        title,
        amount: detectedAmount,
        date: new Date().toISOString().split("T")[0],
        category,
        paymentMethod,
        subtotal: detectedAmount,
        tax: 0,
        discount: 0,
        confidence: "MEDIUM",
        items: [],
      };
    }

    if (!parsedData) {
      throw new BadRequestException("Could not extract readable details from this receipt. Please enter manually.");
    }

    // Upload receipt to Cloudinary for permanent viewing
    let permanentReceiptUrl = "";
    if (file.buffer && file.buffer.length > 0) {
      try {
        permanentReceiptUrl = await uploadBufferToCloudinary(
          file.buffer,
          "receipts"
        );
      } catch (uploadErr) {
        console.warn("[Receipt Scanner] Cloudinary upload notice:", uploadErr);
      }
    }

    // Sanitize amount
    let rawAmount = parsedData.amount;
    if (typeof rawAmount === "string") {
      if (/^\s*[₹$€£]?\s*\d+,\d{2}\s*$/.test(rawAmount)) {
        rawAmount = rawAmount.replace(",", ".");
      }
      rawAmount = Number(rawAmount.replace(/[^0-9.-]+/g, ""));
    }
    let amount =
      Number.isFinite(Number(rawAmount)) && Number(rawAmount) > 0
        ? Math.abs(Number(rawAmount))
        : 0;

    const items = Array.isArray(parsedData.items)
      ? parsedData.items
          .filter((i: any) => i && i.name)
          .map((i: any) => ({
            name: String(i.name).trim(),
            quantity: Math.max(1, Number(i.quantity) || 1),
            price: Math.max(0, Number(i.price) || 0),
          }))
      : [];

    let itemsSum = 0;
    if (items.length > 0) {
      itemsSum = items.reduce(
        (acc: number, item: any) =>
          acc + (Number(item.price) || 0) * (Number(item.quantity) || 1),
        0
      );
    }

    let rawSubtotal = parsedData.subtotal;
    if (typeof rawSubtotal === "string") {
      rawSubtotal = Number(rawSubtotal.replace(/[^0-9.-]+/g, ""));
    }
    let subtotal =
      Number.isFinite(Number(rawSubtotal)) && Number(rawSubtotal) > 0
        ? Math.abs(Number(rawSubtotal))
        : 0;

    let rawTax = parsedData.tax;
    if (typeof rawTax === "string") {
      rawTax = Number(rawTax.replace(/[^0-9.-]+/g, ""));
    }
    const tax =
      Number.isFinite(Number(rawTax)) && Number(rawTax) >= 0
        ? Math.abs(Number(rawTax))
        : 0;

    let rawDiscount = parsedData.discount;
    if (typeof rawDiscount === "string") {
      rawDiscount = Number(rawDiscount.replace(/[^0-9.-]+/g, ""));
    }
    const discount =
      Number.isFinite(Number(rawDiscount)) && Number(rawDiscount) >= 0
        ? Math.abs(Number(rawDiscount))
        : 0;

    // Mathematical reconciliation: Missing decimal dot in OCR (e.g. read 24500 when items sum to 245.00)
    if (
      itemsSum >= 1 &&
      subtotal === 0 &&
      Math.abs(amount - itemsSum * 100) < 0.05
    ) {
      amount = itemsSum;
    }

    // Mathematical reconciliation: If amount is missing or zero, derive from subtotal + tax - discount
    if (!amount && subtotal > 0) {
      amount = Math.max(0, subtotal + tax - discount);
    }

    // Mathematical reconciliation: If amount is still missing, derive from sum of line items
    if (!amount && itemsSum > 0) {
      amount = itemsSum;
    }

    if (!amount || amount <= 0) {
      throw new BadRequestException(
        "Could not detect total amount on this receipt. Please enter manually."
      );
    }

    if (!subtotal) {
      subtotal = itemsSum > 0 ? itemsSum : amount;
    }

    // Sanitize date using robust multi-format parseBankDate & clamp future dates caused by OCR misreads
    let parsedDateObj = parseBankDate(parsedData.date);
    const now = new Date();
    const futureLimit = new Date();
    futureLimit.setDate(now.getDate() + 1);
    if (parsedDateObj > futureLimit || isNaN(parsedDateObj.getTime())) {
      parsedDateObj = now;
    }
    const dateStr = parsedDateObj.toISOString().split("T")[0];

    // Refine category & merchant normalization using legal-to-brand dictionary
    const normalizedBrand = normalizeMerchantBrand(parsedData.title || "");
    const detectedMerchant = detectIndianMerchantAndCategory(normalizedBrand || parsedData.title || "");
    const finalTitle =
      normalizedBrand ||
      (parsedData.title && parsedData.title.trim() && parsedData.title !== "Scanned Receipt"
        ? parsedData.title.trim()
        : detectedMerchant.title || "Scanned Receipt");

    const validCategories = [
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

    let category = (parsedData.category || "").toLowerCase();
    if (!validCategories.includes(category) || category === "other" || category === "shopping") {
      if (detectedMerchant.category && detectedMerchant.category !== "other") {
        category = detectedMerchant.category;
      } else if (!validCategories.includes(category)) {
        category = "shopping";
      }
    }

    const validMethods = Object.values(PaymentMethodEnum);
    const paymentMethod = validMethods.includes(parsedData.paymentMethod)
      ? parsedData.paymentMethod
      : (detectedMerchant.paymentMethod || PaymentMethodEnum.CARD);

    const confidence = ["HIGH", "MEDIUM", "LOW"].includes(parsedData.confidence) ? parsedData.confidence : "HIGH";

    return {
      title: finalTitle,
      amount,
      date: dateStr,
      description: parsedData.description || "Scanned via Gemini Vision OCR",
      category,
      paymentMethod,
      type: "EXPENSE",
      receiptUrl: permanentReceiptUrl || "",
      subtotal,
      tax,
      discount,
      currency: parsedData.currency || "INR",
      confidence,
      items,
    };
  } catch (error: any) {
    if (error instanceof BadRequestException) throw error;
    throw new BadRequestException(error?.message || "Receipt scanning service unavailable");
  }
};
export const exportTransactionsEmailService = async (
  userId: string,
  userEmail?: string,
  filters: {
    keyword?: string;
    type?: keyof typeof TransactionTypeEnum;
    category?: string;
    fromDate?: Date;
    toDate?: Date;
  } = {}
) => {
  const user = await UserModel.findById(userId)
    .select("email currency")
    .lean();
  const targetEmail = userEmail || user?.email;
  const userCurrency = user?.currency || "INR";

  if (!targetEmail) {
    throw new BadRequestException(
      "No registered email address found on file to export transactions."
    );
  }

  const { keyword, type, category, fromDate, toDate } = filters;

  const filterConditions: Record<string, any> = {
    userId,
  };

  if (keyword) {
    const safeKeyword = escapeRegex(keyword);
    filterConditions.$or = [
      { title: { $regex: safeKeyword, $options: "i" } },
      { category: { $regex: safeKeyword, $options: "i" } },
    ];
  }

  if (type) {
    filterConditions.type = type;
  }

  if (category && category.toLowerCase() !== "all") {
    filterConditions.category = {
      $regex: new RegExp(`^${escapeRegex(category)}$`, "i"),
    };
  }

  if (fromDate || toDate) {
    filterConditions.date = {};
    if (fromDate) filterConditions.date.$gte = fromDate;
    if (toDate) filterConditions.date.$lte = toDate;
  }

  const transactions = await TransactionModel.find(filterConditions)
    .populate("accountId", "name")
    .populate("toAccountId", "name")
    .sort({
      date: -1,
    });

  if (transactions.length === 0) {
    throw new BadRequestException(
      "No transactions found matching the selected filters to export."
    );
  }

  const headers = [
    "Date",
    "Title",
    "Type",
    "Category",
    `Amount (${userCurrency})`,
    "Payment Method",
    "Account",
    "Description",
  ];

  const rows = transactions.map((t) => {
    const fromAcc =
      t.accountId && typeof t.accountId === "object"
        ? (t.accountId as any).name
        : "";
    const toAcc =
      t.toAccountId && typeof t.toAccountId === "object"
        ? (t.toAccountId as any).name
        : "";
    const accLabel = fromAcc && toAcc ? `${fromAcc} -> ${toAcc}` : fromAcc || "";

    return [
      sanitizeCsvCell(new Date(t.date).toISOString().split("T")[0]),
      sanitizeCsvCell(t.title),
      sanitizeCsvCell(t.type),
      sanitizeCsvCell(
        t.category
          ? t.category.charAt(0).toUpperCase() + t.category.slice(1)
          : "Other"
      ),
      sanitizeCsvCell(Math.abs(t.amount)),
      sanitizeCsvCell(t.paymentMethod || "CARD"),
      sanitizeCsvCell(accLabel),
      sanitizeCsvCell(t.description || ""),
    ];
  });

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join(
    "\r\n"
  );

  const todayStr = new Date().toISOString().split("T")[0];

  await sendEmail({
    to: targetEmail,
    subject: `Your Requested Transaction Export - Obsidian Finance (${todayStr})`,
    text: `Please find your requested transaction export (${transactions.length} records) attached as a CSV spreadsheet.`,
    html: `<p>Hello,</p><p>Please find attached your requested Obsidian Finance transaction export (<strong>${escapeHtml(transactions.length)}</strong> records).</p><p>Best regards,<br>The Obsidian Finance Team</p>`,
    attachments: [
      {
        filename: `Obsidian_Transactions_${todayStr}.csv`,
        content: csvContent,
        contentType: "text/csv",
      },
    ],
  });

  return { success: true };
};
