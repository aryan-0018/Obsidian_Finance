import crypto from "crypto";
import { createPartFromBase64, createUserContent } from "@google/genai";
import { PDFParse, PasswordException } from "pdf-parse";
import { BadRequestException } from "../utils/app-error";
import TransactionModel, {
  TransactionTypeEnum,
  PaymentMethodEnum,
} from "../models/transaction.model";
import { generateContentWithRetry } from "../config/google-ai.config";
import { parse as csvParse } from "csv-parse/sync";
import { computeTransactionBlockHash, getGenesisHash } from "./ledger-audit.service";
import { convertToSmallestUnit } from "../utils/format-currency";
import { parseBankDate } from "../utils/nlp-parser";
import { assertValidStatementFile } from "../utils/file-validation";
import { withUserLedgerLock } from "../utils/ledger-lock";
import {
  applyAccountBalanceDelta,
  resolveAccountForSmsService,
} from "./account.service";

export { parseBankDate };

export interface ParsedBankTransaction {
  id: string;
  fingerprint: string;
  title: string;
  rawNarration: string;
  amount: number;
  type: TransactionTypeEnum;
  category: string;
  paymentMethod: PaymentMethodEnum;
  date: string;
  isDuplicate: boolean;
  duplicateReason?: string;
  selected?: boolean;
}

export interface BankStatementParseResult {
  fileName: string;
  fileType: "PDF" | "CSV" | "IMAGE";
  totalTransactions: number;
  totalIncome: number;
  totalExpense: number;
  duplicateCount: number;
  newCount: number;
  dateRange: {
    from: string | null;
    to: string | null;
  };
  transactions: ParsedBankTransaction[];
}

// Common Merchant Dictionary for rapid, zero-latency local demangling
const MERCHANT_RULES: Array<{
  pattern: RegExp;
  cleanName: string;
  category: string;
  paymentMethod?: PaymentMethodEnum;
}> = [
  // Food & Dining
  { pattern: /(swiggy|bundl)/i, cleanName: "Swiggy", category: "dining", paymentMethod: PaymentMethodEnum.MOBILE_PAYMENT },
  { pattern: /(zomato|eternal)/i, cleanName: "Zomato", category: "dining", paymentMethod: PaymentMethodEnum.MOBILE_PAYMENT },
  { pattern: /(starbucks|tata starbucks)/i, cleanName: "Starbucks", category: "dining", paymentMethod: PaymentMethodEnum.CARD },
  { pattern: /(blue tokai|third wave)/i, cleanName: "Specialty Coffee", category: "dining", paymentMethod: PaymentMethodEnum.CARD },
  { pattern: /(mcdonald|hardcastle)/i, cleanName: "McDonald's", category: "dining" },
  { pattern: /(domino|jubilant)/i, cleanName: "Domino's Pizza", category: "dining" },
  { pattern: /(pizza hut|yum restaurants)/i, cleanName: "Pizza Hut", category: "dining" },
  { pattern: /(burger king|restaurant brands)/i, cleanName: "Burger King", category: "dining" },
  { pattern: /(kfc|devyani)/i, cleanName: "KFC", category: "dining" },
  { pattern: /(subway)/i, cleanName: "Subway", category: "dining" },
  { pattern: /(behrouz|faasos|rebel foods)/i, cleanName: "Rebel Foods / Faasos", category: "dining" },
  { pattern: /(eatclub|box8|mojo pizza)/i, cleanName: "EatClub", category: "dining" },
  { pattern: /(haldiram|bikanervala)/i, cleanName: "Haldiram's / Sweets", category: "dining" },
  { pattern: /(sagar ratna|saravana bhavan)/i, cleanName: "South Indian Dining", category: "dining" },
  { pattern: /(barbeque nation)/i, cleanName: "Barbeque Nation", category: "dining" },
  { pattern: /(chai point|chaayos)/i, cleanName: "Chai Point / Chaayos", category: "dining" },
  { pattern: /(restaurant|cafe|dhaba|baker|eats|pizza|burger|biryani)/i, cleanName: "Restaurant / Cafe", category: "dining" },

  // Groceries & Supermarkets
  { pattern: /(blinkit|grofers)/i, cleanName: "Blinkit", category: "groceries", paymentMethod: PaymentMethodEnum.MOBILE_PAYMENT },
  { pattern: /(zepto)/i, cleanName: "Zepto", category: "groceries", paymentMethod: PaymentMethodEnum.MOBILE_PAYMENT },
  { pattern: /(instamart)/i, cleanName: "Swiggy Instamart", category: "groceries", paymentMethod: PaymentMethodEnum.MOBILE_PAYMENT },
  { pattern: /(bigbasket|supermarket|supermarket grocery)/i, cleanName: "BigBasket", category: "groceries" },
  { pattern: /(dmart|avenue supermarts)/i, cleanName: "DMart", category: "groceries" },
  { pattern: /(reliance fresh|smart point|reliance retail)/i, cleanName: "Reliance Smart", category: "groceries" },
  { pattern: /(country delight|milkbasket|otipy)/i, cleanName: "Dairy & Produce Delivery", category: "groceries" },
  { pattern: /(nature basket|nature's basket)/i, cleanName: "Nature's Basket", category: "groceries" },
  { pattern: /(licious|freshmenu|tendercuts)/i, cleanName: "Licious / Fresh Meats", category: "groceries" },

  // Transportation & Fuel
  { pattern: /(uber)/i, cleanName: "Uber", category: "transportation", paymentMethod: PaymentMethodEnum.MOBILE_PAYMENT },
  { pattern: /(ola|ani tech)/i, cleanName: "Ola Cabs", category: "transportation", paymentMethod: PaymentMethodEnum.MOBILE_PAYMENT },
  { pattern: /(rapido|roppen)/i, cleanName: "Rapido", category: "transportation", paymentMethod: PaymentMethodEnum.MOBILE_PAYMENT },
  { pattern: /(blusmart)/i, cleanName: "BluSmart Mobility", category: "transportation", paymentMethod: PaymentMethodEnum.MOBILE_PAYMENT },
  { pattern: /(shell|bharat petro|indianoil|hindustan petro|hpcl|bpcl|petrol|fuel|jio bp)/i, cleanName: "Fuel Station", category: "transportation" },
  { pattern: /(fastag|ihmcl|nhai|toll)/i, cleanName: "Fastag Toll Payment", category: "transportation", paymentMethod: PaymentMethodEnum.AUTO_DEBIT },
  { pattern: /(metro|dmrc|bmrc|mmrcl|transit)/i, cleanName: "Transit / Metro", category: "transportation" },
  { pattern: /(irctc|railway)/i, cleanName: "IRCTC Train Tickets", category: "transportation" },
  { pattern: /(indigo|air india|vistara|spicejet|makemytrip|goibibo|easemytrip|yatra)/i, cleanName: "Flight / Travel Booking", category: "transportation" },

  // Shopping & E-Commerce
  { pattern: /(amazon|amzn)/i, cleanName: "Amazon", category: "shopping" },
  { pattern: /(flipkart)/i, cleanName: "Flipkart", category: "shopping" },
  { pattern: /(myntra)/i, cleanName: "Myntra", category: "shopping" },
  { pattern: /(ajio|reliance retail)/i, cleanName: "Ajio Fashion", category: "shopping" },
  { pattern: /(nykaa)/i, cleanName: "Nykaa Beauty", category: "shopping" },
  { pattern: /(tata cliq)/i, cleanName: "Tata CLiQ", category: "shopping" },
  { pattern: /(meesho)/i, cleanName: "Meesho", category: "shopping" },
  { pattern: /(croma|infiniti retail)/i, cleanName: "Croma Electronics", category: "shopping" },
  { pattern: /(vijay sales|reliance digital)/i, cleanName: "Electronics Store", category: "shopping" },
  { pattern: /(decathlon)/i, cleanName: "Decathlon Sports", category: "shopping" },
  { pattern: /(lenskart)/i, cleanName: "Lenskart Eyewear", category: "shopping" },
  { pattern: /(zara|h&m|uniqlo|westside|marks and spencer)/i, cleanName: "Fashion Apparel", category: "shopping" },

  // Entertainment & Subscriptions
  { pattern: /(netflix)/i, cleanName: "Netflix", category: "entertainment", paymentMethod: PaymentMethodEnum.AUTO_DEBIT },
  { pattern: /(spotify)/i, cleanName: "Spotify", category: "entertainment", paymentMethod: PaymentMethodEnum.AUTO_DEBIT },
  { pattern: /(hotstar|disney)/i, cleanName: "Disney+ Hotstar", category: "entertainment" },
  { pattern: /(youtube|google play|google \*)/i, cleanName: "Google / YouTube", category: "entertainment" },
  { pattern: /(sonyliv|zee5|jiocinema)/i, cleanName: "Streaming Media", category: "entertainment" },
  { pattern: /(digital media|itunes)/i, cleanName: "Digital Media Services", category: "entertainment" },
  { pattern: /(bookmyshow|pvr|inox|cinepolis)/i, cleanName: "Cinema / Movies", category: "entertainment" },

  // Utilities & Recharges
  { pattern: /(jio|reliance jio)/i, cleanName: "Jio Telecom", category: "utilities" },
  { pattern: /(airtel|bharti airtel)/i, cleanName: "Airtel Telecom", category: "utilities" },
  { pattern: /(vodafone|vi telecom|idea cellular)/i, cleanName: "Vi Telecom", category: "utilities" },
  { pattern: /(bescom|tneb|mseb|electricity|power|cesc|tata power|adani elect)/i, cleanName: "Electricity Bill", category: "utilities" },
  { pattern: /(act fibernet|broadband|wifi|hathway)/i, cleanName: "Broadband Internet", category: "utilities" },
  { pattern: /(indane|hp gas|bharat gas|igl|mgl)/i, cleanName: "Gas Utility Bill", category: "utilities" },

  // Housing & Rent
  { pattern: /(rent|landlord|nobroker|mygate)/i, cleanName: "Housing Rent", category: "housing", paymentMethod: PaymentMethodEnum.BANK_TRANSFER },

  // Investments & Banking
  { pattern: /(zerodha|groww|upstox|kuvera|coin|angel one|dhan)/i, cleanName: "Investment Portfolio", category: "investments", paymentMethod: PaymentMethodEnum.BANK_TRANSFER },
  { pattern: /(mutual fund|mf|uti|nippon|hdfc amc|icici pru|mirae|parag parikh|sbi mf)/i, cleanName: "Mutual Fund SIP", category: "investments", paymentMethod: PaymentMethodEnum.AUTO_DEBIT },
  { pattern: /(lic|hdfc life|max life|sbi life|star health|care health|policybazaar)/i, cleanName: "Insurance Premium", category: "investments", paymentMethod: PaymentMethodEnum.AUTO_DEBIT },

  // Healthcare
  { pattern: /(apollo|pharmacy|medplus|1mg|pharmeasy|hospital|clinic|practo|cult)/i, cleanName: "Pharmacy / Healthcare", category: "healthcare" },

  // Credit Card & Loan Payments
  { pattern: /(cred|onecard|slice|uni cards)/i, cleanName: "Credit Card Bill Pay", category: "other", paymentMethod: PaymentMethodEnum.BANK_TRANSFER },
  { pattern: /(hdfc bank card|sbi card|icici bank card|axis bank card|kotak card)/i, cleanName: "Credit Card Payment", category: "other", paymentMethod: PaymentMethodEnum.BANK_TRANSFER },

  // Income & Salary
  { pattern: /(salary|sal cred|payroll|corp payroll|stipend)/i, cleanName: "Salary", category: "income", paymentMethod: PaymentMethodEnum.BANK_TRANSFER },
  { pattern: /(dividend|div payout)/i, cleanName: "Investment Dividend", category: "income", paymentMethod: PaymentMethodEnum.BANK_TRANSFER },
  { pattern: /(interest|int\.pd|bank interest)/i, cleanName: "Savings Interest", category: "income", paymentMethod: PaymentMethodEnum.BANK_TRANSFER },
  { pattern: /(refund|reversal|cashback)/i, cleanName: "Refund / Cashback", category: "income", paymentMethod: PaymentMethodEnum.BANK_TRANSFER },
];

/**
 * Generate cryptographic SHA-256 fingerprint for deduplication
 */
export const generateTransactionHash = (
  date: string,
  amount: number,
  type: string,
  title: string
): string => {
  const normDate = date.split("T")[0];
  const normAmount = Math.abs(amount).toFixed(2);
  const normType = type.toUpperCase().trim();
  const normTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "").trim();

  return crypto
    .createHash("sha256")
    .update(`${normDate}|${normAmount}|${normType}|${normTitle}`)
    .digest("hex");
};

/**
 * Local merchant cleaner and classifier
 */
export const cleanNarrationLocally = (
  raw: string,
  type: TransactionTypeEnum
): {
  cleanName: string;
  category: string;
  paymentMethod: PaymentMethodEnum;
} => {
  const trimmed = raw.trim();

  // Try matching with merchant dictionary
  for (const rule of MERCHANT_RULES) {
    if (rule.pattern.test(trimmed)) {
      return {
        cleanName: rule.cleanName,
        category: rule.category,
        paymentMethod:
          rule.paymentMethod ||
          (/\bupi\b/i.test(trimmed)
            ? PaymentMethodEnum.MOBILE_PAYMENT
            : PaymentMethodEnum.BANK_TRANSFER),
      };
    }
  }

  // Fallback cleanup for UPI/POS/NEFT/IMPS/BBPS/ACH
  let clean = trimmed
    .replace(/^UPI\s*[/:\-_]\s*(?:CR|DR|P2P|P2M|PAY\s*TO|REV)?\s*[/:\-_]?\s*\d+\s*[/:\-_]?/i, "")
    .replace(/^UPI\s*[/:\-_]/i, "")
    .replace(/^POS\s+(?:\d+[X*]+\d+\s+)?/i, "")
    .replace(/^POS\s*[/:\-_]/i, "")
    .replace(/^E[-]?COMM\s*[/:\-_]?/i, "")
    .replace(/^(?:NEFT|RTGS|IMPS)\s*[-/:\s]*(?:CR|DR)?\s*[-/:\s]*[A-Z0-9]+\s*[-/:\s]*/i, "")
    .replace(/^(?:ACH|NACH|ECS)\s*[-/:\s]*(?:CR|DR)?\s*[-/:\s]*/i, "")
    .replace(/^BIL\s*[/:\-_]\s*[A-Z0-9]+\s*[/:\-_]?\s*\d*\s*[/:\-_]?/i, "")
    .replace(/^BBPS\s*[/:\-_]/i, "")
    .replace(/^ATM[- ]WDL\s*[/:\-_]?/i, "")
    .replace(/\/.*$/, "")
    .replace(/@.*$/, "")
    .replace(/\b(?:HDFC|ICICI|SBI|UTIBR?|PUNB|YESB|KKBK|CITI|AXIS|BARB)[0-9A-Z]*\b/gi, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Capitalize title
  clean = clean.length > 28 ? clean.substring(0, 28) + "..." : clean;
  if (!clean || clean.length < 2) {
    clean = type === TransactionTypeEnum.INCOME ? "Bank Credit" : "Bank Debit";
  }

  const defaultCategory =
    type === TransactionTypeEnum.INCOME ? "income" : "other";

  const defaultMethod = /\bupi\b/i.test(trimmed)
    ? PaymentMethodEnum.MOBILE_PAYMENT
    : /\bpos\b/i.test(trimmed)
    ? PaymentMethodEnum.CARD
    : PaymentMethodEnum.BANK_TRANSFER;

  return {
    cleanName: clean,
    category: defaultCategory,
    paymentMethod: defaultMethod,
  };
};

/**
 * Main service to parse, decrypt, and reconcile bank statements
 */
export const parseBankStatementService = async (
  file: Express.Multer.File | undefined,
  password?: string,
  userId?: string
): Promise<BankStatementParseResult> => {
  if (!file || !file.buffer || file.buffer.length === 0) {
    throw new BadRequestException("No bank statement file uploaded");
  }

  const isPdf =
    file.mimetype === "application/pdf" ||
    file.originalname.toLowerCase().endsWith(".pdf");
  const isCsv =
    file.mimetype === "text/csv" ||
    file.originalname.toLowerCase().endsWith(".csv") ||
    file.originalname.toLowerCase().endsWith(".txt");
  const isImage =
    /^image\/(jpe?g|png|webp|heic)$/i.test(file.mimetype || "") ||
    /\.(jpe?g|png|webp|heic)$/i.test(file.originalname || "");

  if (!isPdf && !isCsv && !isImage) {
    throw new BadRequestException(
      "Unsupported file format. Please upload a PDF, CSV, or statement screenshot image (PNG/JPG/WEBP/HEIC)."
    );
  }

  assertValidStatementFile(
    file.buffer,
    isPdf ? "PDF" : isImage ? "IMAGE" : "CSV"
  );

  let rawExtractedText = "";
  const fileType: "PDF" | "CSV" | "IMAGE" = isPdf
    ? "PDF"
    : isImage
      ? "IMAGE"
      : "CSV";

  // --- Step 1: Ingestion & Decryption ---
  if (isPdf) {
    let pdfParser: PDFParse | null = null;
    try {
      pdfParser = new PDFParse({
        data: file.buffer,
        password: password?.trim() || undefined,
      });

      const textResult = await pdfParser.getText();
      rawExtractedText = textResult?.text || "";
    } catch (err: any) {
      const isPasswordErr =
        err instanceof PasswordException ||
        err?.name === "PasswordException" ||
        err?.message?.toLowerCase().includes("password") ||
        err?.message?.toLowerCase().includes("encrypted") ||
        err?.code === 1;

      if (isPasswordErr) {
        throw new BadRequestException(
          password
            ? "Incorrect PDF password. Please verify and try again."
            : "This bank statement PDF is encrypted. Please provide your statement password to decrypt it."
        );
      }

      throw new BadRequestException(
        `Failed to parse PDF statement: ${err.message || "Invalid or corrupted PDF file"}`
      );
    } finally {
      await pdfParser?.destroy().catch(() => {});
    }
  } else if (isCsv) {
    // CSV extraction
    rawExtractedText = file.buffer.toString("utf-8");
  }

  if (!isImage && !rawExtractedText.trim()) {
    throw new BadRequestException(
      "The statement contains no readable text or transactions."
    );
  }

  // --- Step 2: Tabular Extraction & Ledger Parsing ---
  let rawTransactions: Array<{
    date: string;
    narration: string;
    amount: number;
    type: "EXPENSE" | "INCOME";
    balance?: number;
  }> = [];

  if (isCsv) {
    try {
      const records = csvParse(rawExtractedText, {
        columns: true,
        skip_empty_lines: true,
        relax_column_count: true,
        trim: true,
      }) as Record<string, any>[];

      for (const row of records) {
        const rowStr = JSON.stringify(row);
        const dateKey = Object.keys(row).find((k) =>
          /\b(date|trans.*date|txn.*date|value.*date)\b/i.test(k)
        );
        const narrationKey = Object.keys(row).find((k) =>
          /\b(narration|desc|description|particular|particulars|details|remarks)\b/i.test(k)
        );
        const debitKey = Object.keys(row).find((k) =>
          /\b(debit|dr|withdrawal|withdrawals)\b/i.test(k)
        );
        const creditKey = Object.keys(row).find((k) =>
          /\b(credit|cr|deposit|deposits)\b/i.test(k)
        );
        const amountKey = Object.keys(row).find((k) =>
          /\b(amount|amt)\b/i.test(k)
        );
        const typeKey = Object.keys(row).find((k) => /\b(type|txn.*type)\b/i.test(k));

        const dateVal = dateKey ? row[dateKey] : null;
        const narrationVal = narrationKey ? row[narrationKey] : "Bank Entry";

        let debitVal =
          debitKey && row[debitKey]
            ? parseFloat(String(row[debitKey]).replace(/[^0-9.-]/g, ""))
            : 0;
        let creditVal =
          creditKey && row[creditKey]
            ? parseFloat(String(row[creditKey]).replace(/[^0-9.-]/g, ""))
            : 0;

        if (isNaN(debitVal)) debitVal = 0;
        if (isNaN(creditVal)) creditVal = 0;

        let type: "EXPENSE" | "INCOME" = "EXPENSE";
        let amount = 0;

        if (debitVal && !isNaN(debitVal) && debitVal > 0) {
          type = "EXPENSE";
          amount = debitVal;
        } else if (creditVal && !isNaN(creditVal) && creditVal > 0) {
          type = "INCOME";
          amount = creditVal;
        } else if (amountKey && row[amountKey]) {
          const rawAmt = parseFloat(String(row[amountKey]).replace(/[^0-9.-]/g, ""));
          amount = Math.abs(rawAmt);
          if (typeKey && /credit|cr|income/i.test(row[typeKey])) {
            type = "INCOME";
          } else if (rawAmt < 0) {
            type = "EXPENSE";
          }
        }

        if (dateVal && amount > 0) {
          rawTransactions.push({
            date: dateVal,
            narration: narrationVal || "Transaction",
            amount,
            type,
          });
        }
      }
    } catch (csvErr) {
      console.warn("[Bank Parser] CSV parser fallback to Gemini:", csvErr);
    }
  }

  // --- Fast Deterministic Multi-Line Scanner for Tabular Bank Statements (HDFC/SBI/ICICI/Axis/Generic) ---
  if (!isImage && rawTransactions.length === 0) {
    const lines = rawExtractedText.split(/\r?\n/);
    const dateStartRegex =
      /^(\d{1,2}[-/.](?:\d{1,2}|[A-Za-z]{3})[-/.]\d{2,4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2})(?=\s|\||$)/;
    const footerNoiseRegex =
      /^(?:page\s+\d+\s+of\s+\d+|statement\s+summary|generated\s+on|account\s+branch|cust\s*id|micr\s*code|ifsc\s*code|\*\*end\s+of\s+statement\*\*|this\s+is\s+a\s+computer)/i;

    const blocks: Array<{ dateStr: string; text: string }> = [];
    let currentBlock: { dateStr: string; lines: string[] } | null = null;

    for (const rawLine of lines) {
      const trimmed = rawLine.trim();
      if (!trimmed || footerNoiseRegex.test(trimmed)) {
        if (currentBlock && currentBlock.lines.length >= 6) {
          blocks.push({
            dateStr: currentBlock.dateStr,
            text: currentBlock.lines.join(" ").replace(/\s+/g, " ").trim(),
          });
          currentBlock = null;
        }
        continue;
      }

      const dateMatch = trimmed.match(dateStartRegex);
      if (dateMatch) {
        if (currentBlock) {
          blocks.push({
            dateStr: currentBlock.dateStr,
            text: currentBlock.lines.join(" ").replace(/\s+/g, " ").trim(),
          });
        }
        currentBlock = {
          dateStr: dateMatch[1],
          lines: [trimmed.slice(dateMatch[0].length).trim()],
        };
      } else if (currentBlock) {
        if (currentBlock.lines.length < 7) {
          currentBlock.lines.push(trimmed);
        }
      }
    }
    if (currentBlock) {
      blocks.push({
        dateStr: currentBlock.dateStr,
        text: currentBlock.lines.join(" ").replace(/\s+/g, " ").trim(),
      });
    }

    let prevClosingBalance: number | null = null;

    for (const block of blocks) {
      const rest = block.text;
      if (!rest) continue;

      const decimalAmountMatches = [
        ...rest.matchAll(
          /(?:^|[\s₹$|])(\d{1,3}(?:,\d{2,3})*\.\d{2}|\d+\.\d{2})(?:\s*(Cr|Dr|\(Cr\)|\(Dr\)))?(?=$|\s|\|)/gi
        ),
      ];
      const fallbackAmountMatches =
        decimalAmountMatches.length > 0
          ? decimalAmountMatches
          : [
              ...rest.matchAll(
                /(?:^|[\s₹$|])(\d{1,3}(?:,\d{2,3})+(?:\.\d{1,2})?|\d+\.\d{1,2})(?:\s*(Cr|Dr|\(Cr\)|\(Dr\)))?(?=$|\s|\|)/gi
              ),
            ];

      if (fallbackAmountMatches.length === 0) continue;

      const parseNum = (s: string) => parseFloat(s.replace(/,/g, ""));

      // Handle Opening Balance seed row without recording it as a transaction
      if (/^(?:opening\s*balance|b\/f|brought\s*forward)/i.test(rest)) {
        const lastAmt = parseNum(
          fallbackAmountMatches[fallbackAmountMatches.length - 1][1]
        );
        if (!Number.isNaN(lastAmt)) prevClosingBalance = lastAmt;
        continue;
      }

      let txnMatch = fallbackAmountMatches[0];
      let curBalance: number | null = null;

      if (fallbackAmountMatches.length >= 2) {
        txnMatch = fallbackAmountMatches[fallbackAmountMatches.length - 2];
        const balNum = parseNum(
          fallbackAmountMatches[fallbackAmountMatches.length - 1][1]
        );
        if (!Number.isNaN(balNum)) curBalance = balNum;
      }

      const num = parseNum(txnMatch[1]);
      if (Number.isNaN(num) || num <= 0) continue;

      const tag = (txnMatch[2] || "").toLowerCase();
      let isCredit: boolean;

      if (tag.includes("cr")) {
        isCredit = true;
      } else if (tag.includes("dr")) {
        isCredit = false;
      } else if (prevClosingBalance !== null && curBalance !== null) {
        if (Math.abs(prevClosingBalance + num - curBalance) <= 0.05) {
          isCredit = true;
        } else if (Math.abs(prevClosingBalance - num - curBalance) <= 0.05) {
          isCredit = false;
        } else {
          isCredit =
            /\b(cr|credit|deposit|by\s+transfer|salary|refund|cashback|interest|dividend)\b/i.test(
              rest
            );
        }
      } else {
        isCredit =
          /\b(cr|credit|deposit|by\s+transfer|salary|refund|cashback|interest|dividend)\b/i.test(
            rest
          );
      }

      if (curBalance !== null) {
        prevClosingBalance = curBalance;
      }

      const firstAmtIndex = rest.indexOf(fallbackAmountMatches[0][0]);
      let narr =
        firstAmtIndex > 0 ? rest.slice(0, firstAmtIndex).trim() : rest;
      // Strip trailing value date / chq ref numbers common before withdrawal column
      narr = narr
        .replace(/\b\d{1,2}[-/.](?:\d{1,2}|[A-Za-z]{3})[-/.]\d{2,4}\s*$/g, "")
        .replace(/\s+\d{10,18}\s*$/g, "")
        .trim();
      if (!narr || narr.length < 3) narr = "Bank Transaction";

      rawTransactions.push({
        date: block.dateStr,
        narration: narr,
        amount: num,
        type: isCredit ? "INCOME" : "EXPENSE",
      });
    }

    if (rawTransactions.length >= 2) {
      console.log(
        `[Bank Parser] Extracted ${rawTransactions.length} transactions via multi-line deterministic tabular scanner.`
      );
    } else {
      rawTransactions = [];
    }
  }

  // If local parsing didn't find rows, or if it's a statement image/screenshot, use Gemini Multimodal/Text Pipeline
  if (rawTransactions.length === 0) {
    const truncatedText =
      rawExtractedText.length > 50000
        ? rawExtractedText.slice(0, 50000)
        : rawExtractedText;

    const baseInstructions = `
You are an expert financial auditor and automated bank statement extraction engine.
Analyze the provided bank statement ${isImage ? "screenshot/image" : "text"} and extract ALL individual transaction rows.
For each transaction:
- "date": YYYY-MM-DD
- "narration": Raw transaction description / merchant narration
- "amount": Positive number (the transaction amount)
- "type": "EXPENSE" for debits / withdrawals / fees / DR; "INCOME" for credits / deposits / salary / CR
- "balance": (optional running balance if present)

Rules:
1. Ignore summary headers, opening/closing balances, and page numbers.
2. Ensure every visible transaction row in the table is captured (do not merge multiple rows into one).
3. Return STRICTLY JSON as an array of objects:
[
  {
    "date": "2026-03-01",
    "narration": "UPI/40928192/SWIGGY",
    "amount": 450.50,
    "type": "EXPENSE"
  }
]`;

    const resolvedMime = (() => {
      const m = (file.mimetype || "").toLowerCase();
      if (m === "image/jpg") return "image/jpeg";
      if (m.startsWith("image/")) return m;
      const ext = file.originalname.toLowerCase();
      if (ext.endsWith(".png")) return "image/png";
      if (ext.endsWith(".webp")) return "image/webp";
      if (ext.endsWith(".heic")) return "image/heic";
      return "image/jpeg";
    })();

    const contents = isImage
      ? createUserContent([
          baseInstructions,
          createPartFromBase64(file.buffer.toString("base64"), resolvedMime),
        ])
      : `${baseInstructions}\n\nStatement text:\n${truncatedText}\n`;

    try {
      const aiResponse = await generateContentWithRetry({
        contents,
        config: {
          temperature: 0,
          responseMimeType: "application/json",
        },
        timeoutMs: 45000,
        perAttemptTimeoutMs: 18000,
      });

      const cleaned = aiResponse.text?.replace(/```(?:json)?\n?/g, "").trim() || "[]";
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        rawTransactions = parsed;
      }
    } catch (aiErr: any) {
      console.error("[Bank Parser] Gemini parsing error:", aiErr);
      throw new BadRequestException(
        "Could not extract transaction records from statement. Please verify the document."
      );
    }
  }

  if (rawTransactions.length === 0) {
    throw new BadRequestException(
      "No transaction entries could be identified in this statement."
    );
  }

  // --- Step 3: Parse & Normalize Entries, then Fetch Scoped Existing Transactions ---
  interface PreparedTx {
    idx: number;
    rawNarration: string;
    parsedDate: Date;
    isoDateStr: string;
    txType: TransactionTypeEnum;
    amount: number;
    cleanName: string;
    category: string;
    paymentMethod: PaymentMethodEnum;
    fingerprint: string;
    intraBatchKey: string;
  }

  const prepared: PreparedTx[] = [];
  let earliestDate: Date | null = null;
  let latestDate: Date | null = null;

  for (let i = 0; i < rawTransactions.length; i++) {
    const item = rawTransactions[i];
    const rawType = String(item.type || "").toUpperCase();
    const txType =
      rawType === "INCOME" || /\b(CREDIT|CR|DEPOSIT)\b/.test(rawType)
        ? TransactionTypeEnum.INCOME
        : TransactionTypeEnum.EXPENSE;
    const parsedAmt =
      typeof item.amount === "number"
        ? item.amount
        : parseFloat(String(item.amount || "0").replace(/[^0-9.-]/g, ""));
    const amount = Math.abs(Number.isFinite(parsedAmt) ? parsedAmt : 0);
    if (!amount || !Number.isFinite(amount)) continue;

    const parsedDate = parseBankDate(item.date);
    const isoDateStr = parsedDate.toISOString().split("T")[0];

    if (!earliestDate || parsedDate < earliestDate) earliestDate = parsedDate;
    if (!latestDate || parsedDate > latestDate) latestDate = parsedDate;

    const { cleanName, category, paymentMethod } = cleanNarrationLocally(
      item.narration,
      txType
    );

    const fingerprint = generateTransactionHash(
      isoDateStr,
      amount,
      txType,
      cleanName
    );

    const intraBatchKey = `${isoDateStr}|${amount.toFixed(2)}|${txType}|${(item.narration || cleanName).toLowerCase().replace(/[^a-z0-9]/g, "")}`;

    prepared.push({
      idx: i,
      rawNarration: item.narration,
      parsedDate,
      isoDateStr,
      txType,
      amount,
      cleanName,
      category,
      paymentMethod,
      fingerprint,
      intraBatchKey,
    });
  }

  const existingHashes = new Set<string>();
  if (userId && earliestDate && latestDate) {
    const minQueryDate = new Date(earliestDate.getTime() - 2 * 24 * 60 * 60 * 1000);
    const maxQueryDate = new Date(latestDate.getTime() + 2 * 24 * 60 * 60 * 1000);

    const existing = await TransactionModel.find({
      userId,
      date: { $gte: minQueryDate, $lte: maxQueryDate },
    }).select("title amount type date");

    for (const tx of existing) {
      const dStr = tx.date ? new Date(tx.date).toISOString().split("T")[0] : "";
      const h = generateTransactionHash(dStr, Number(tx.amount), tx.type, tx.title);
      existingHashes.add(h);
    }
  }

  // --- Step 4: Deduplicate & Assemble Result ---
  const processedTransactions: ParsedBankTransaction[] = [];
  const seenBatchHashes = new Set<string>();

  let totalIncome = 0;
  let totalExpense = 0;
  let duplicateCount = 0;
  const batchStamp = Date.now();

  for (const entry of prepared) {
    let isDuplicate = false;
    let duplicateReason: string | undefined = undefined;

    if (existingHashes.has(entry.fingerprint)) {
      isDuplicate = true;
      duplicateReason = "Matches existing transaction in your Obsidian portfolio";
      duplicateCount++;
    } else if (seenBatchHashes.has(entry.intraBatchKey)) {
      isDuplicate = true;
      duplicateReason = "Duplicate entry inside statement";
      duplicateCount++;
    } else {
      seenBatchHashes.add(entry.intraBatchKey);
    }

    if (entry.txType === TransactionTypeEnum.INCOME) {
      totalIncome += entry.amount;
    } else {
      totalExpense += entry.amount;
    }

    processedTransactions.push({
      id: `tx-import-${entry.idx}-${batchStamp}`,
      fingerprint: entry.fingerprint,
      title: entry.cleanName,
      rawNarration: entry.rawNarration,
      amount: entry.amount,
      type: entry.txType,
      category: entry.category,
      paymentMethod: entry.paymentMethod,
      date: entry.isoDateStr,
      isDuplicate,
      duplicateReason,
      selected: !isDuplicate,
    });
  }

  return {
    fileName: file.originalname,
    fileType,
    totalTransactions: processedTransactions.length,
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalExpense: Math.round(totalExpense * 100) / 100,
    duplicateCount,
    newCount: processedTransactions.length - duplicateCount,
    dateRange: {
      from: earliestDate ? earliestDate.toISOString().split("T")[0] : null,
      to: latestDate ? latestDate.toISOString().split("T")[0] : null,
    },
    transactions: processedTransactions,
  };
};

/**
 * Bulk insert reconciled transactions
 */
export const bulkCommitBankTransactionsService = async (
  userId: string,
  transactions: Array<{
    title: string;
    amount: number;
    type: TransactionTypeEnum;
    category: string;
    paymentMethod?: PaymentMethodEnum;
    date?: string | Date;
    description?: string;
    externalRef?: string | null;
  }>
) => {
  if (!transactions || transactions.length === 0) {
    throw new BadRequestException("No transactions provided for import");
  }

  return withUserLedgerLock(userId, async () => {
    const defaultAccount = await resolveAccountForSmsService(userId);
    const defaultAccountId = defaultAccount?._id?.toString() || null;

    const lastTx = await TransactionModel.findOne({ userId })
      .sort({ createdAt: -1, _id: -1 })
      .select("ledgerHash")
      .lean();
    let runningHash = lastTx?.ledgerHash || getGenesisHash();
    const baseTime = Date.now();

    const docs = transactions.map((t, idx) => {
      const rawAmt = Math.abs(Number(t.amount));
      const parsedDate = t.date ? new Date(t.date) : new Date();
      const txDate = Number.isNaN(parsedDate.getTime())
        ? new Date()
        : parsedDate;
      const stamp = new Date(baseTime + idx);

      const doc = new TransactionModel({
        userId,
        title: t.title || "Imported Transaction",
        amount: rawAmt,
        type: t.type,
        category: (t.category || "other").toLowerCase(),
        paymentMethod: t.paymentMethod || PaymentMethodEnum.BANK_TRANSFER,
        date: txDate,
        description: t.description || "Imported via Bank Statement Pipeline",
        isRecurring: false,
        externalRef: t.externalRef ?? null,
        accountId: defaultAccountId,
        prevLedgerHash: runningHash,
        createdAt: stamp,
        updatedAt: stamp,
      });

      runningHash = computeTransactionBlockHash(runningHash, {
        _id: doc._id,
        date: txDate,
        amount: convertToSmallestUnit(rawAmt),
        type: t.type,
        title: doc.title,
      });
      doc.ledgerHash = runningHash;

      return doc;
    });

    const inserted = await TransactionModel.insertMany(docs, { ordered: true });

    if (defaultAccountId) {
      let netIncome = 0;
      let netExpense = 0;
      for (const t of transactions) {
        const amt = Math.abs(Number(t.amount) || 0);
        if (t.type === TransactionTypeEnum.INCOME) netIncome += amt;
        else if (t.type === TransactionTypeEnum.EXPENSE) netExpense += amt;
      }
      if (netIncome > 0) {
        await applyAccountBalanceDelta(userId, {
          type: TransactionTypeEnum.INCOME,
          amount: netIncome,
          accountId: defaultAccountId,
        });
      }
      if (netExpense > 0) {
        await applyAccountBalanceDelta(userId, {
          type: TransactionTypeEnum.EXPENSE,
          amount: netExpense,
          accountId: defaultAccountId,
        });
      }
    }

    return {
      success: true,
      importedCount: inserted.length,
    };
  });
};
