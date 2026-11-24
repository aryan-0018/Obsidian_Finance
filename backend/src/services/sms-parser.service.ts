import {
  TransactionTypeEnum,
  PaymentMethodEnum,
} from "../models/transaction.model";
import TransactionModel from "../models/transaction.model";
import { parseBankDate, detectIndianMerchantAndCategory, normalizeMerchantBrand } from "../utils/nlp-parser";
import { generateContentWithRetry } from "../config/google-ai.config";

export interface ParsedSmsResult {
  isTransaction: boolean;
  type: TransactionTypeEnum;
  amount: number;
  title: string;
  category: string;
  paymentMethod: PaymentMethodEnum;
  date: Date;
  accountMask?: string;
  externalRef?: string;
  balanceAfter?: number;
  bankName?: string;
  rawMessage: string;
  isDuplicate?: boolean;
  duplicateId?: string;
}

/**
 * Identify sender bank from SMS header (e.g. "VM-HDFCBK", "AX-ICICIB", "BZ-SBIUPI", "VK-AXISBK")
 */
export const identifyBankFromSender = (sender?: string): string => {
  if (!sender) return "Bank";
  const s = sender.toUpperCase();
  if (s.includes("HDFC")) return "HDFC Bank";
  if (s.includes("ICICI")) return "ICICI Bank";
  if (s.includes("SBI")) return "State Bank of India";
  if (s.includes("AXIS")) return "Axis Bank";
  if (s.includes("KOTAK")) return "Kotak Mahindra Bank";
  if (s.includes("PNB")) return "Punjab National Bank";
  if (s.includes("BOB") || s.includes("BARODA")) return "Bank of Baroda";
  if (s.includes("IDFC")) return "IDFC FIRST Bank";
  if (s.includes("YES")) return "Yes Bank";
  if (s.includes("INDUS")) return "IndusInd Bank";
  if (s.includes("PAYTM")) return "Paytm Payments Bank";
  if (s.includes("CRED")) return "CRED";
  return "Bank";
};

/**
 * Deterministic Zero-Latency Indian Bank SMS Parser
 */
export const parseDeterministicIndianSms = (
  text: string,
  sender?: string
): ParsedSmsResult | null => {
  if (!text || text.trim().length < 15) return null;

  const raw = text.trim();
  const lower = raw.toLowerCase();

  // Reject OTP / 2FA verification messages (they must never be logged as completed transactions)
  if (
    /\b(?:otp|one[- ]time[- ]password|verification code|secret code|security code|use otp|is your otp)\b/i.test(
      lower
    )
  ) {
    return null;
  }

  // 1. Transaction Intent Detection & Directional Ownership Analysis
  const hasDebit =
    /\b(debited|paid|spent|sent|transferred|withdrawn|purchase|purchased|deducted|debit|dr|dr\.|used for|used at|was used)\b/i.test(
      lower
    );
  const hasCredit =
    /\b(credited|received|deposit|deposited|refund|refunded|cashback|cr|cr\.)\b/i.test(
      lower
    ) || /\bcredit\b(?!\s+(?:card|limit))/i.test(lower);

  // If neither intent is present, ignore
  if (!hasDebit && !hasCredit) return null;

  // Resolve type: Check directional grammar relative to user's Account / Card
  let type: TransactionTypeEnum = TransactionTypeEnum.EXPENSE;

  // Case A: Clear Debit from user's account (e.g. "Dr. from A/C", "debited from a/c", "A/C ... Dr", "spent on card", "Card ... was used")
  const isDebitFromUser =
    /\b(?:dr\.?|debited|spent|paid|withdrawn|used)\s+(?:from|on|by|at|for)?\s*(?:a\/c|acct|card)\b/i.test(
      lower
    ) ||
    /\b(?:a\/c|acct|card)\s*[^.]*?\b(?:dr\.?|debited|used for|used at|was used)\b/i.test(
      lower
    ) ||
    /\bdr\.?\s+from\b/i.test(lower);

  // Case B: Clear Credit to user's account (e.g. "Cr. to A/C", "credited to a/c", "A/C ... Cr", "deposited in a/c")
  const isCreditToUser =
    /\b(?:cr\.?|credited|deposited|received|refunded)\s+(?:to|in|into)?\s*(?:a\/c|acct|card)\b/i.test(
      lower
    ) ||
    /\b(?:a\/c|acct|card)\s*[^.]*?\b(?:cr\.?|credited)\b/i.test(lower) ||
    /\bcr\.?\s+to\s+(?:a\/c|acct)\b/i.test(lower);

  if (isDebitFromUser && !isCreditToUser) {
    type = TransactionTypeEnum.EXPENSE;
  } else if (isCreditToUser && !isDebitFromUser) {
    type = TransactionTypeEnum.INCOME;
  } else if (hasCredit && !hasDebit) {
    type = TransactionTypeEnum.INCOME;
  } else {
    // If both exist (e.g. "Dr. from A/C ... and Cr. to VPA"), look at the first action attached to the account
    if (/\bdr\.?\s+from\b/i.test(lower) || /\bdebited\s+from\b/i.test(lower)) {
      type = TransactionTypeEnum.EXPENSE;
    } else if (/\bcr\.?\s+to\s+a\/c\b/i.test(lower) || /\bcredited\s+to\s+a\/c\b/i.test(lower)) {
      type = TransactionTypeEnum.INCOME;
    } else {
      type = hasCredit && !hasDebit ? TransactionTypeEnum.INCOME : TransactionTypeEnum.EXPENSE;
    }
  }

  // 2. Amount Extraction
  // Matches: "Rs 450.00", "Rs. 1,250", "INR 350.00", "₹ 99.50", "debited by 500.00", "with INR 1,200.00"
  let amount: number | null = null;
  const amtRegexes = [
    /(?:rs\.?|inr|₹)\s*[:.-]?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /(?:debited|credited|paid|spent|transferred|withdrawn)\s+(?:by|with|of)?\s*(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:rs\.?|inr|₹)/i,
  ];

  for (const regex of amtRegexes) {
    const m = raw.match(regex);
    if (m && m[1]) {
      const num = parseFloat(m[1].replace(/,/g, ""));
      if (!isNaN(num) && num > 0) {
        amount = num;
        break;
      }
    }
  }

  if (!amount || amount <= 0) return null;

  // 3. Extract Reference / UTR / Transaction ID (12-digit standard or tagged)
  let externalRef: string | undefined;
  const refMatch =
    raw.match(/\b(?:upi\s*ref(?:\s*no)?|ref(?:\s*no)?|rrn|txn\s*(?:id)?|reference\s*(?:no)?|utr)\s*[:.-]?\s*([0-9a-zA-Z]{6,20})\b/i) ||
    raw.match(/\b(?:upi[:\s*]+)?([0-9]{12})\b/i);
  if (refMatch && refMatch[1]) {
    externalRef = refMatch[1].trim();
  }

  // 4. Extract Masked Account or Card
  let accountMask: string | undefined;
  const accMatch =
    raw.match(/\b(?:a\/c|acct|account|card)\s*(?:no\.?)?\s*(?:ending\s*)?([xX*]*\d{3,4})\b/i) ||
    raw.match(/\b([xX*]{2,}\d{3,4})\b/);
  if (accMatch && accMatch[1]) {
    accountMask = accMatch[1].toUpperCase();
  }

  // 5. Extract Balance After (if available)
  let balanceAfter: number | undefined;
  const balMatch = raw.match(
    /(?:avl\s*bal|available\s*balance|bal\s*is|bal)\s*[:.-]?\s*(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i
  );
  if (balMatch && balMatch[1]) {
    const balNum = parseFloat(balMatch[1].replace(/,/g, ""));
    if (!isNaN(balNum)) balanceAfter = balNum;
  }

  // 6. Extract Date
  let date = new Date();
  const dateMatch =
    raw.match(/\bon\s+(\d{1,2}[-/.][a-zA-Z0-9]{2,4}[-/.](?:\d{2,4})?)/i) ||
    raw.match(/\bon\s+(\d{1,2}[A-Za-z]{3}\d{2,4})/i) ||
    raw.match(/(\d{1,2}[-/.](?:[A-Za-z]{3}|\d{1,2})[-/.]\d{2,4})/i);
  if (dateMatch && dateMatch[1]) {
    const parsedDate = parseBankDate(dateMatch[1]);
    if (!isNaN(parsedDate.getTime())) date = parsedDate;
  }

  // 7. Merchant / Beneficiary Identification
  let rawMerchant = "";
  // Check for VPA format e.g. "to VPA swiggy@icici" or "to merchant@okaxis"
  const vpaMatch = raw.match(/\b(?:to\s+vpa|to|vpa)\s+([a-zA-Z0-9.\-_]+@[a-zA-Z0-9]+)\b/i);
  if (vpaMatch && vpaMatch[1]) {
    const vpaHandle = vpaMatch[1].split("@")[0].replace(/[0-9._-]+$/, "");
    rawMerchant = vpaHandle;
  }

  // Check for "at <Merchant>" e.g. "at SWIGGY on", "at RELIANCE RETAIL."
  if (!rawMerchant) {
    const atMatch = raw.match(/\bat\s+([A-Za-z0-9\s&.'-]+?)(?:\s+on|\s+via|\.|\,|$|\s+upi|\s+ref|\s+avl)/i);
    if (atMatch && atMatch[1]) {
      rawMerchant = atMatch[1].trim();
    }
  }

  // Check for "to <Merchant>" e.g. "to Zomato on"
  if (!rawMerchant) {
    const toMatch = raw.match(/\b(?:to|towards)\s+([A-Za-z0-9\s&.'-]+?)(?:\s+on|\s+via|\.|\,|$|\s+upi|\s+ref|\s+avl)/i);
    if (toMatch && toMatch[1]) {
      rawMerchant = toMatch[1].trim();
    }
  }

  // Check for "Info: UPI*<Merchant>*..." or "Info: <Merchant>" (ICICI/SBI format)
  if (!rawMerchant) {
    const infoMatch = raw.match(/\binfo:\s*(?:upi\*)?([A-Za-z0-9\s&.'-]+?)(?:\*|\.|\,|$)/i);
    if (infoMatch && infoMatch[1]) {
      rawMerchant = infoMatch[1].trim();
    }
  }

  // Fallback to searching the whole SMS for known merchants/categories
  const detected = detectIndianMerchantAndCategory(rawMerchant || raw);
  let title = detected.title;
  let category = detected.category;

  if (rawMerchant && title === "Expense" && rawMerchant.length > 2) {
    title = normalizeMerchantBrand(rawMerchant);
  } else if (!title || title === "Expense") {
    title = type === TransactionTypeEnum.INCOME ? "Income Deposit" : "Bank Expense";
  }

  // Payment Method
  let paymentMethod = PaymentMethodEnum.CARD;
  if (/upi|vpa|gpay|phonepe|paytm/i.test(lower) || /@[a-zA-Z0-9.\-_]+/i.test(lower) || Boolean(vpaMatch)) {
    paymentMethod = PaymentMethodEnum.MOBILE_PAYMENT;
  } else if (/card|pos\b|visa|mastercard|rupay\s*card/i.test(lower)) {
    paymentMethod = PaymentMethodEnum.CARD;
  } else if (/auto[- ]?debit|nach|mandate|si\b/i.test(lower)) {
    paymentMethod = PaymentMethodEnum.AUTO_DEBIT;
  } else if (/neft|rtgs|imps|salary|transfer|transfer to/i.test(lower)) {
    paymentMethod = PaymentMethodEnum.BANK_TRANSFER;
  }

  return {
    isTransaction: true,
    type,
    amount,
    title,
    category,
    paymentMethod,
    date,
    accountMask,
    externalRef,
    balanceAfter,
    bankName: identifyBankFromSender(sender),
    rawMessage: raw,
  };
};

/**
 * AI-assisted SMS Parser for complex, colloquial, or non-standard SMS formats
 */
export const parseSmsWithAi = async (
  text: string,
  sender?: string
): Promise<ParsedSmsResult> => {
  const prompt = `
You are an expert Indian Banking & UPI SMS parser.
Analyze this financial SMS:
Sender: "${sender || "Unknown"}"
Message: "${text}"
Current Date: ${new Date().toISOString().split("T")[0]}

Strictly extract and format as JSON:
{
  "isTransaction": boolean,
  "type": "INCOME" | "EXPENSE",
  "amount": number (positive float in INR),
  "title": string (clean merchant or entity name, e.g. "Swiggy", "Uber", "Salary", "Amazon"),
  "category": "groceries" | "dining" | "transportation" | "utilities" | "entertainment" | "shopping" | "healthcare" | "travel" | "housing" | "income" | "investments" | "other",
  "paymentMethod": "CARD" | "BANK_TRANSFER" | "MOBILE_PAYMENT" | "AUTO_DEBIT" | "CASH" | "OTHER",
  "date": "YYYY-MM-DD",
  "accountMask": string or null (e.g. "XX1234"),
  "externalRef": string or null (e.g. 12-digit UPI UTR or reference number),
  "balanceAfter": number or null
}

If this is an OTP, promotional alert, or contains no completed monetary debit/credit transaction, return {"isTransaction": false}.
`;

  try {
    const aiRes = await generateContentWithRetry({
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    const rawJson = aiRes.text || "{}";
    const parsed = JSON.parse(rawJson.replace(/```(?:json)?\n?/g, "").trim());

    if (!parsed.isTransaction || !parsed.amount || Number(parsed.amount) <= 0) {
      return {
        isTransaction: false,
        type: TransactionTypeEnum.EXPENSE,
        amount: 0,
        title: "Non-transaction SMS",
        category: "other",
        paymentMethod: PaymentMethodEnum.OTHER,
        date: new Date(),
        rawMessage: text,
      };
    }

    let parsedDate = new Date();
    if (parsed.date) {
      const d = new Date(parsed.date);
      if (!isNaN(d.getTime())) parsedDate = d;
    }

    return {
      isTransaction: true,
      type: parsed.type === "INCOME" ? TransactionTypeEnum.INCOME : TransactionTypeEnum.EXPENSE,
      amount: Math.abs(Number(parsed.amount)),
      title: parsed.title || "Transaction",
      category: parsed.category?.toLowerCase() || "other",
      paymentMethod: Object.values(PaymentMethodEnum).includes(parsed.paymentMethod)
        ? parsed.paymentMethod
        : PaymentMethodEnum.MOBILE_PAYMENT,
      date: parsedDate,
      accountMask: parsed.accountMask || undefined,
      externalRef: parsed.externalRef || undefined,
      balanceAfter: parsed.balanceAfter ? Number(parsed.balanceAfter) : undefined,
      bankName: identifyBankFromSender(sender),
      rawMessage: text,
    };
  } catch (error) {
    console.error("[SMS Parser] AI fallback failed:", error);
    return {
      isTransaction: false,
      type: TransactionTypeEnum.EXPENSE,
      amount: 0,
      title: "Parse Error",
      category: "other",
      paymentMethod: PaymentMethodEnum.OTHER,
      date: new Date(),
      rawMessage: text,
    };
  }
};

/**
 * Universal Unified SMS Parse Pipeline:
 * 1. Executes deterministic zero-latency regex parser.
 * 2. If inconclusive, falls back to AI engine.
 */
export const parseBankSms = async (
  text: string,
  sender?: string
): Promise<ParsedSmsResult> => {
  const deterministic = parseDeterministicIndianSms(text, sender);
  if (deterministic && deterministic.isTransaction && deterministic.amount > 0) {
    return deterministic;
  }
  return await parseSmsWithAi(text, sender);
};

/**
 * Check if a transaction is already recorded to prevent double-counting
 */
export const checkDuplicateSmsTransaction = async (
  userId: string,
  parsed: ParsedSmsResult
): Promise<{ isDuplicate: boolean; duplicateId?: string; reason?: string }> => {
  // 1. Check exact external reference / UTR
  if (parsed.externalRef) {
    const existing = await TransactionModel.findOne({
      userId,
      externalRef: parsed.externalRef,
    }).select("_id title amount date");

    if (existing) {
      return {
        isDuplicate: true,
        duplicateId: existing._id.toString(),
        reason: `Transaction with UTR/Ref ${parsed.externalRef} was already logged on ${new Date(existing.date).toLocaleDateString("en-IN")}.`,
      };
    }
  }

  // 2. Window check: Same amount, same type, within same 30-minute window
  const windowStart = new Date(parsed.date.getTime() - 30 * 60 * 1000);
  const windowEnd = new Date(parsed.date.getTime() + 30 * 60 * 1000);

  // Convert to smallest unit (paise) for exact integer query comparison
  const paiseAmount = Math.round(parsed.amount * 100);

  const existingInWindow = await TransactionModel.findOne({
    userId,
    type: parsed.type,
    amount: paiseAmount,
    date: { $gte: windowStart, $lte: windowEnd },
  }).select("_id title amount date");

  if (existingInWindow) {
    return {
      isDuplicate: true,
      duplicateId: existingInWindow._id.toString(),
      reason: `Identical ${parsed.type.toLowerCase()} of ₹${parsed.amount.toFixed(2)} was already logged at ${new Date(existingInWindow.date).toLocaleTimeString("en-IN")}.`,
    };
  }

  return { isDuplicate: false };
};
