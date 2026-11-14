import mongoose from "mongoose";
import axios from "axios";
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
import { genAI, genAIModel, generateContentWithRetry } from "../config/google-ai.config";
import { createPartFromBase64, createUserContent } from "@google/genai";
import { sendEmail } from "../mailers/mailer";
import { receiptPrompt } from "../utils/prompt";
import UserModel from "../models/user.model";
import { convertToSmallestUnit } from "../utils/format-currency";
import {
  computeTransactionBlockHash,
  getGenesisHash,
  recomputeUserLedgerChain,
} from "./ledger-audit.service";
import { PDFParse } from "pdf-parse";
import {
  parseBankDate,
  detectIndianMerchantAndCategory,
  parseIndianCurrencyExpression,
  normalizeMerchantBrand,
} from "../utils/nlp-parser";
import { uploadBufferToCloudinary } from "../config/cloudinary.config";

export const createTransactionService = async (
  body: CreateTransactionType,
  userId: string
) => {
  let nextRecurringDate: Date | undefined;
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
    .select("ledgerHash");

  const prevLedgerHash = lastTx?.ledgerHash || getGenesisHash();

  const transaction = await TransactionModel.create({
    ...body,
    userId,
    category: body.category,
    amount: Number(body.amount),
    isRecurring: body.isRecurring || false,
    recurringInterval: body.recurringInterval || null,
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

  return transaction;
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
  },
  pagination: {
    pageSize: number;
    pageNumber: number;
  }
) => {
  const { keyword, type, category, fromDate, toDate, recurringStatus } = filters;

  const filterConditions: Record<string, any> = {
    userId,
  };

  if (keyword) {
    filterConditions.$or = [
      { title: { $regex: keyword, $options: "i" } },
      { category: { $regex: keyword, $options: "i" } },
    ];
  }

  if (type) {
    filterConditions.type = type;
  }

  if (category) {
    filterConditions.category = { $regex: new RegExp(`^${category}$`, "i") };
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
  const transaction = await TransactionModel.findOne({
    _id: transactionId,
    userId,
  });
  if (!transaction) throw new NotFoundException("Transaction not found");

  const duplicated = await TransactionModel.create({
    ...transaction.toObject(),
    _id: undefined,
    title: `Duplicate - ${transaction.title}`,
    description: transaction.description
      ? `${transaction.description} (Duplicate)`
      : "Duplicated transaction",
    isRecurring: false,
    recurringInterval: undefined,
    nextRecurringDate: undefined,
    createdAt: undefined,
    updatedAt: undefined,
  });

  return duplicated;
};

export const updateTransactionService = async (
  userId: string,
  transactionId: string,
  body: UpdateTransactionType
) => {
  const existingTransaction = await TransactionModel.findOne({
    _id: transactionId,
    userId,
  });
  if (!existingTransaction)
    throw new NotFoundException("Transaction not found");

  const now = new Date();
  const isRecurring = body.isRecurring ?? existingTransaction.isRecurring;

  const date =
    body.date !== undefined ? new Date(body.date) : existingTransaction.date;

  const recurringInterval =
    body.recurringInterval || existingTransaction.recurringInterval;

  let nextRecurringDate: Date | undefined;

  if (isRecurring && recurringInterval) {
    const calulatedDate = calculateNextOccurrence(date, recurringInterval);

    nextRecurringDate =
      calulatedDate < now
        ? calculateNextOccurrence(now, recurringInterval)
        : calulatedDate;
  }

  existingTransaction.set({
    ...(body.title && { title: body.title }),
    ...(body.description && { description: body.description }),
    ...(body.category && { category: body.category }),
    ...(body.type && { type: body.type }),
    ...(body.paymentMethod && { paymentMethod: body.paymentMethod }),
    ...(body.amount !== undefined && { amount: Number(body.amount) }),
    date,
    isRecurring,
    recurringInterval,
    nextRecurringDate,
  });

  const prevHash = existingTransaction.prevLedgerHash || getGenesisHash();
  const rawUnitAmount = body.amount !== undefined ? Number(body.amount) : Number(existingTransaction.amount);
  existingTransaction.ledgerHash = computeTransactionBlockHash(prevHash, {
    _id: existingTransaction._id,
    date,
    amount: convertToSmallestUnit(rawUnitAmount),
    type: existingTransaction.type,
    title: existingTransaction.title,
  });

  await existingTransaction.save();
  await recomputeUserLedgerChain(userId);

  return;
};

export const deleteTransactionService = async (
  userId: string,
  transactionId: string
) => {
  const deleted = await TransactionModel.findOneAndDelete({
    _id: transactionId,
    userId,
  });
  if (!deleted) throw new NotFoundException("Transaction not found");

  await recomputeUserLedgerChain(userId);

  return;
};

export const bulkDeleteTransactionService = async (
  userId: string,
  transactionIds: string[]
) => {
  const result = await TransactionModel.deleteMany({
    _id: { $in: transactionIds },
    userId,
  });

  if (result.deletedCount === 0)
    throw new NotFoundException("No transations found");

  await recomputeUserLedgerChain(userId);

  return {
    sucess: true,
    deletedCount: result.deletedCount,
  };
};

export const bulkTransactionService = async (
  userId: string,
  transactions: CreateTransactionType[]
) => {
  try {
    const lastTx = await TransactionModel.findOne({ userId })
      .sort({ createdAt: -1, _id: -1 })
      .select("ledgerHash");
    let runningHash = lastTx?.ledgerHash || getGenesisHash();

    const bulkOps = transactions.map((tx) => {
      const smallestAmount = convertToSmallestUnit(tx.amount);
      const txDate = tx.date ? new Date(tx.date) : new Date();
      const tempId = new mongoose.Types.ObjectId();
      const prev = runningHash;
      runningHash = computeTransactionBlockHash(prev, {
        _id: tempId,
        date: txDate,
        amount: smallestAmount,
        type: tx.type,
        title: tx.title,
      });

      return {
        insertOne: {
          document: {
            ...tx,
            _id: tempId,
            amount: smallestAmount,
            userId,
            date: txDate,
            isRecurring: false,
            nextRecurringDate: null,
            recurringInterval: null,
            lastProcessed: null,
            prevLedgerHash: prev,
            ledgerHash: runningHash,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      };
    });

    const result = await TransactionModel.bulkWrite(bulkOps, {
      ordered: true,
    });

    return {
      insertedCount: result.insertedCount,
      success: true,
    };
  } catch (error) {
    throw error;
  }
};

export const scanReceiptService = async (
  file: Express.Multer.File | undefined
) => {
  if (!file) throw new BadRequestException("No receipt file provided");

  const isPdf =
    file.mimetype === "application/pdf" ||
    file.originalname.toLowerCase().endsWith(".pdf");

  try {
    let base64String = "";
    let extractedPdfText = "";

    if (file.buffer && file.buffer.length > 0) {
      base64String = file.buffer.toString("base64");
    } else if (file.path) {
      if (file.path.startsWith("http://") || file.path.startsWith("https://")) {
        const responseData = await axios.get(file.path, {
          responseType: "arraybuffer",
        });
        base64String = Buffer.from(responseData.data).toString("base64");
      } else {
        const fs = await import("fs");
        base64String = fs.readFileSync(file.path).toString("base64");
      }
    }

    if (!base64String) {
      throw new BadRequestException("Could not read receipt file content");
    }

    // Clean data URL prefix if present
    base64String = base64String.replace(/^data:[a-z0-9/+-]+;base64,/i, "").trim();

    // If PDF, also extract text using pdf-parse for zero-failure redundancy
    if (isPdf && file.buffer && file.buffer.length > 0) {
      try {
        const pdfParser = new PDFParse({ data: file.buffer });
        const textResult = await pdfParser.getText();
        extractedPdfText = textResult?.text?.trim() || "";
        await pdfParser.destroy();
      } catch (pdfErr) {
        console.warn("[Receipt Scanner] PDF text extraction notice:", pdfErr);
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
        if (cleaned) parsedData = JSON.parse(cleaned);
      } catch (textErr) {
        console.warn("[Receipt Scanner] Text prompt fallback to vision multimodal:", textErr);
      }
    }

    // Strategy B: Multimodal Vision OCR (primary for image photos, or fallback for PDFs)
    if (!parsedData || !parsedData.amount) {
      const mimeType = isPdf ? "application/pdf" : (file.mimetype || "image/jpeg");
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
        parsedData = JSON.parse(cleanedText);
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

    // Upload receipt to Cloudinary asynchronously for permanent viewing
    let permanentReceiptUrl = file.path || "";
    if (file.buffer && file.buffer.length > 0) {
      try {
        permanentReceiptUrl = await uploadBufferToCloudinary(file.buffer, "receipts");
      } catch (uploadErr) {
        console.warn("[Receipt Scanner] Cloudinary upload notice:", uploadErr);
      }
    }

    // Sanitize amount
    let rawAmount = parsedData.amount;
    if (typeof rawAmount === "string") {
      rawAmount = Number(rawAmount.replace(/[^0-9.-]+/g, ""));
    }
    let amount = !isNaN(Number(rawAmount)) && Number(rawAmount) > 0 ? Math.abs(Number(rawAmount)) : 0;

    const items = Array.isArray(parsedData.items)
      ? parsedData.items
          .filter((i: any) => i && i.name)
          .map((i: any) => ({
            name: String(i.name).trim(),
            quantity: Number(i.quantity) || 1,
            price: Number(i.price) || 0,
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

    let subtotal = Number(parsedData.subtotal) > 0 ? Number(parsedData.subtotal) : 0;
    const tax = Number(parsedData.tax) >= 0 ? Number(parsedData.tax) : 0;
    const discount = Number(parsedData.discount) >= 0 ? Number(parsedData.discount) : 0;

    // Mathematical reconciliation: Missing decimal dot in OCR (e.g. read 24500 when items sum to 245.00)
    if (itemsSum > 0 && Math.abs(amount - itemsSum * 100) < 5) {
      amount = itemsSum;
    }

    // Mathematical reconciliation: If amount is missing or zero, derive from subtotal + tax - discount
    if (!amount && subtotal > 0) {
      amount = subtotal + tax - discount;
    }

    // Mathematical reconciliation: If amount is still missing, derive from sum of line items
    if (!amount && itemsSum > 0) {
      amount = itemsSum;
    }

    if (!amount) {
      throw new BadRequestException("Could not detect total amount on this receipt. Please enter manually.");
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
      receiptUrl: permanentReceiptUrl || file.path || "",
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
  let targetEmail = userEmail;
  if (!targetEmail) {
    const user = await UserModel.findById(userId);
    targetEmail = user?.email;
  }

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
    filterConditions.$or = [
      { title: { $regex: keyword, $options: "i" } },
      { category: { $regex: keyword, $options: "i" } },
    ];
  }

  if (type) {
    filterConditions.type = type;
  }

  if (category && category.toLowerCase() !== "all") {
    filterConditions.category = { $regex: new RegExp(`^${category}$`, "i") };
  }

  if (fromDate || toDate) {
    filterConditions.date = {};
    if (fromDate) filterConditions.date.$gte = fromDate;
    if (toDate) filterConditions.date.$lte = toDate;
  }

  const transactions = await TransactionModel.find(filterConditions).sort({
    date: -1,
  });

  if (transactions.length === 0) {
    throw new BadRequestException(
      "No transactions found matching the selected filters to export."
    );
  }

  const escapeCsv = (val: any) => {
    const str = String(val ?? "");
    if (
      str.includes(",") ||
      str.includes('"') ||
      str.includes("\n") ||
      str.includes("\r")
    ) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headers = [
    "Date",
    "Title",
    "Type",
    "Category",
    "Amount (INR)",
    "Payment Method",
    "Description",
  ];

  const rows = transactions.map((t) => [
    escapeCsv(new Date(t.date).toISOString().split("T")[0]),
    escapeCsv(t.title),
    escapeCsv(t.type),
    escapeCsv(
      t.category
        ? t.category.charAt(0).toUpperCase() + t.category.slice(1)
        : "Other"
    ),
    escapeCsv(Math.abs(t.amount)),
    escapeCsv(t.paymentMethod || "CARD"),
    escapeCsv(t.description || ""),
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join(
    "\r\n"
  );

  const todayStr = new Date().toISOString().split("T")[0];

  await sendEmail({
    to: targetEmail,
    subject: `Your Requested Transaction Export - Obsidian Finance (${todayStr})`,
    text: `Please find your requested transaction export (${transactions.length} records) attached as a CSV spreadsheet.`,
    html: `<p>Hello,</p><p>Please find attached your requested Obsidian Finance transaction export (<strong>${transactions.length}</strong> records).</p><p>Best regards,<br>The Obsidian Finance Team</p>`,
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
