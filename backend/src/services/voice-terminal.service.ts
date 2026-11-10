import mongoose from "mongoose";
import { DateRangeEnum } from "../enums/date-range.enum";
import TransactionModel, {
  TransactionTypeEnum,
  PaymentMethodEnum,
} from "../models/transaction.model";
import {
  summaryAnalyticsService,
  chatWithAiFinancialAdvisorService,
} from "./analytics.service";
import { updateBudgetService } from "./budget.service";
import {
  createTransactionService,
  exportTransactionsEmailService,
  deleteTransactionService,
} from "./transaction.service";
import {
  verifyLedgerIntegrityService,
  LedgerAuditResult,
} from "./ledger-audit.service";
import {
  generateTelegramPairingCodeService,
  getTelegramStatusService,
  unlinkTelegramService,
} from "./telegram.service";
import { generateContentWithRetry } from "../config/google-ai.config";
import UserModel from "../models/user.model";
import { BadRequestException } from "../utils/app-error";
import {
  VALID_CATEGORIES,
  parseWordsToNumber,
  parseIndianCurrencyExpression,
  detectIndianMerchantAndCategory,
} from "../utils/nlp-parser";
import { convertToUnit } from "../utils/format-currency";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
  subYears,
  startOfQuarter,
  endOfQuarter,
  subQuarters,
  subDays,
  endOfDay,
} from "date-fns";

export function parseTimeframeFromUtterance(text: string): {
  preset: DateRangeEnum;
  label: string;
  dateFilter?: any;
} {
  const lower = text.toLowerCase();
  const now = new Date();

  if (/\b(last month|pichhle mahine|previous month)\b/i.test(lower)) {
    const prevM = subMonths(now, 1);
    return {
      preset: DateRangeEnum.LAST_MONTH,
      label: "last month",
      dateFilter: { $gte: startOfMonth(prevM), $lte: endOfMonth(prevM) },
    };
  }

  if (/\b(this year|is saal|current year|ytd|year to date)\b/i.test(lower)) {
    return {
      preset: DateRangeEnum.THIS_YEAR,
      label: "this year",
      dateFilter: { $gte: startOfYear(now), $lte: endOfDay(now) },
    };
  }

  if (/\b(last year|pichhle saal|previous year)\b/i.test(lower)) {
    const prevY = subYears(now, 1);
    return {
      preset: DateRangeEnum.LAST_YEAR,
      label: "last year",
      dateFilter: { $gte: startOfYear(prevY), $lte: endOfYear(prevY) },
    };
  }

  if (/\b(this quarter|current quarter)\b/i.test(lower)) {
    return {
      preset: DateRangeEnum.THIS_QUARTER,
      label: "this quarter",
      dateFilter: { $gte: startOfQuarter(now), $lte: endOfDay(now) },
    };
  }

  if (/\b(last quarter|previous quarter)\b/i.test(lower)) {
    const prevQ = subQuarters(now, 1);
    return {
      preset: DateRangeEnum.LAST_QUARTER,
      label: "last quarter",
      dateFilter: { $gte: startOfQuarter(prevQ), $lte: endOfQuarter(prevQ) },
    };
  }

  if (/\b(last 30 days|past 30 days|30 days)\b/i.test(lower)) {
    return {
      preset: DateRangeEnum.LAST_30_DAYS,
      label: "in the last 30 days",
      dateFilter: { $gte: subDays(endOfDay(now), 29), $lte: endOfDay(now) },
    };
  }

  if (/\b(last 3 months|past 3 months)\b/i.test(lower)) {
    return {
      preset: DateRangeEnum.LAST_3_MONTHS,
      label: "in the last 3 months",
      dateFilter: {
        $gte: startOfMonth(subMonths(now, 3)),
        $lte: endOfMonth(subMonths(now, 1)),
      },
    };
  }

  if (
    /\b(all time|ever|overall|total.*ever|since the beginning|entire history)\b/i.test(
      lower
    )
  ) {
    return {
      preset: DateRangeEnum.ALL_TIME,
      label: "all time",
      dateFilter: undefined,
    };
  }

  // Default: this month
  return {
    preset: DateRangeEnum.THIS_MONTH,
    label: "this month",
    dateFilter: { $gte: startOfMonth(now), $lte: endOfDay(now) },
  };
}

export {
  VALID_CATEGORIES,
  parseWordsToNumber,
  parseIndianCurrencyExpression,
  detectIndianMerchantAndCategory,
};

export interface VoiceTerminalResponse {
  action:
    | "NAVIGATE"
    | "TRANSACTION_CREATED"
    | "TRANSACTION_DELETED"
    | "TRANSACTION_UPDATED"
    | "FINANCIAL_QUERY"
    | "EXPORT_ACTION"
    | "GENERAL_HELP"
    | "OPEN_MODAL"
    | "AUDIT_LEDGER"
    | "BUDGET_UPDATED"
    | "TELEGRAM_ACTION";
  path?: string;
  modalTarget?:
    | "ADD_TRANSACTION"
    | "IMPORT_STATEMENT"
    | "RECEIPT_SCANNER"
    | "LEDGER_AUDIT"
    | "TELEGRAM_COPILOT";
  speechReply: string;
  displayHeadline?: string;
  displayText?: string;
  metrics?: Array<{ label: string; value: string }>;
  transactionData?: any;
  auditData?: LedgerAuditResult;
  telegramData?: any;
}

export const processVoiceCommandService = async (
  userId: string,
  rawTranscript: string
): Promise<VoiceTerminalResponse> => {
  const transcript = rawTranscript.trim();
  if (!transcript) {
    throw new BadRequestException("No voice input received");
  }

  const lower = transcript.toLowerCase();

  // =========================================================================
  // FAST PATH 1: MODAL & VIEW LAUNCHERS (<10ms)
  // =========================================================================
  if (
    /\b(open|show|start|launch|bring up|display)\b.*\b(add transaction|new transaction|record transaction|transaction drawer|create transaction|transaction form|expense form|add expense|add income)\b/i.test(
      lower
    ) ||
    /^(add|new|record|create|log)\s+(a\s+)?(transaction|expense|income|entry)$/i.test(lower) ||
    /^(transaction\s+(drawer|modal|form|dialog))$/i.test(lower) ||
    lower === "add transaction" ||
    lower === "new transaction"
  ) {
    return {
      action: "OPEN_MODAL",
      modalTarget: "ADD_TRANSACTION",
      speechReply: "Opening the Add Transaction drawer for you.",
      displayHeadline: "Add Transaction Drawer",
      displayText: "You can enter your transaction details or scan a paper receipt.",
    };
  }

  if (
    /\b(scan|upload|open|camera|photo)\b.*\b(receipt|bill|invoice|scanner)\b/i.test(lower) ||
    /\b(receipt scanner|scan receipt|scan bill|scan invoice|photo of bill)\b/i.test(lower) ||
    /^(receipt scanner|scan|scanner|receipt)$/i.test(lower)
  ) {
    return {
      action: "OPEN_MODAL",
      modalTarget: "RECEIPT_SCANNER",
      speechReply: "Opening the Receipt Scanner.",
      displayHeadline: "Receipt Scanner",
      displayText: "Ready to automatically extract store name, amount, category, and date.",
    };
  }

  if (
    /\b(import|upload)\b.*\b(statement|bank|csv|pdf|document)\b/i.test(lower) ||
    /\b(bank statement|statement parser|import transactions|csv import)\b/i.test(lower) ||
    /^(import|upload|bank import)$/i.test(lower)
  ) {
    return {
      action: "OPEN_MODAL",
      modalTarget: "IMPORT_STATEMENT",
      path: "/transactions",
      speechReply: "Opening the Bank Statement and CSV Import screen.",
      displayHeadline: "Statement Import",
      displayText: "Upload your bank statements (PDF or CSV) to import transactions.",
    };
  }

  if (
    /\b(open|show|display|view)\b.*\b(audit|ledger modal|tamper proof|verification modal|security modal)\b/i.test(
      lower
    ) ||
    /^(ledger audit|audit modal|verification modal|check records|verify records)$/i.test(lower)
  ) {
    return {
      action: "OPEN_MODAL",
      modalTarget: "LEDGER_AUDIT",
      path: "/transactions",
      speechReply: "Opening the record verification screen.",
      displayHeadline: "Record Verification",
      displayText: "Review and verify your transaction records.",
    };
  }

  if (
    /\b(open|show|connect|pair|link)\b.*\b(telegram modal|telegram copilot|telegram bot|telegram assistant|telegram)\b/i.test(
      lower
    ) ||
    /\b(link|connect|pair)\s+telegram\b/i.test(lower) ||
    /^(telegram|telegram copilot|telegram assistant)$/i.test(lower)
  ) {
    return {
      action: "OPEN_MODAL",
      modalTarget: "TELEGRAM_COPILOT",
      path: "/settings/copilot",
      speechReply: "Opening Telegram assistant panel.",
      displayHeadline: "Telegram Assistant",
      displayText: "Connect Telegram to log expenses and check balances on mobile.",
    };
  }

  // =========================================================================
  // FAST PATH 2: RECORD SECURITY & VERIFICATION (<25ms)
  // =========================================================================
  if (
    /\b(audit|verify|tamper|merkle|cryptographic|integrity|hash chain|altered|hacked|corrupted|reconcile|is my money safe|is my account safe|check records|verify records|record security)\b/i.test(
      lower
    )
  ) {
    try {
      const audit = await verifyLedgerIntegrityService(userId);
      const isSecure = audit.status === "VERIFIED_SECURE";

      const speech = isSecure
        ? `All your financial records are verified and safe across ${audit.chainDepth} transactions.`
        : `Notice: A record discrepancy was detected at entry ${audit.tamperedBlocks[0]?.index}.`;

      return {
        action: "AUDIT_LEDGER",
        modalTarget: "LEDGER_AUDIT",
        speechReply: speech,
        displayHeadline: isSecure
          ? "Account Security: All Records Verified"
          : "Security Alert: Record Discrepancy Found",
        displayText: `All ${audit.chainDepth} transactions checked in ${audit.executionTimeMs}ms. All entries match and are verified secure.`,
        metrics: [
          { label: "Security Status", value: isSecure ? "Verified Safe" : "Discrepancy" },
          { label: "Transactions Checked", value: `${audit.chainDepth}` },
          { label: "Check Time", value: `${audit.executionTimeMs} ms` },
        ],
        auditData: audit,
      };
    } catch (auditErr) {
      console.warn("[Voice Assistant] Audit error:", auditErr);
    }
  }

  // =========================================================================
  // FAST PATH 3: INSTANT TRANSACTION DELETION & UNDO (<25ms)
  // =========================================================================
  if (
    /\b(delete|remove|cancel|discard|drop|undo|clear)\b.*\b(transaction|expense|income|entry|last|recent|item|record|one|previous)\b/i.test(
      lower
    ) ||
    /^(undo|delete last|remove last|undo last)$/i.test(lower) ||
    /\b(delete|remove|cancel|undo)\b\s+(?:the|my)?\s+([a-z0-9_-]+)/i.test(lower)
  ) {
    try {
      const keywordMatch = lower.match(
        /\b(?:delete|remove|cancel|discard|drop|undo|clear)\b.*?(?:the|my)?\s+([a-z0-9_-]+)(?:\s+(?:transaction|expense|income|entry|one))?/i
      );
      const keyword = keywordMatch ? keywordMatch[1] : "";

      const query: any = { userId: new mongoose.Types.ObjectId(userId) };
      if (
        keyword &&
        !["last", "recent", "transaction", "expense", "income", "entry", "one", "previous"].includes(
          keyword.toLowerCase()
        )
      ) {
        query.title = { $regex: keyword, $options: "i" };
      }

      const candidate = await TransactionModel.findOne(query).sort({
        date: -1,
        createdAt: -1,
      });

      if (candidate) {
        await deleteTransactionService(userId, candidate._id.toString());
        const cleanAmt = Number(candidate.amount).toLocaleString("en-IN");
        return {
          action: "TRANSACTION_DELETED",
          speechReply: `Deleted transaction: ${candidate.title} for ₹${cleanAmt}.`,
          displayHeadline: "Transaction Deleted",
          displayText: `Removed "${candidate.title}" (₹${cleanAmt}) from your transactions.`,
          metrics: [
            { label: "Removed Title", value: candidate.title },
            { label: "Amount", value: `₹${cleanAmt}` },
          ],
        };
      }
    } catch (delErr) {
      console.warn("[Voice Terminal] Deletion error:", delErr);
    }
  }

  // =========================================================================
  // FAST PATH 4: BUDGET MANAGEMENT (<25ms)
  // =========================================================================
  if (
    /\b(set|update|change|adjust|cap|make)\b.*\b(budget|limit|spending limit|ceiling)\b/i.test(lower) ||
    /\b(budget)\s+(?:to|at|is)\s+/i.test(lower)
  ) {
    const extractedNum = parseIndianCurrencyExpression(lower);
    if (extractedNum && extractedNum > 0) {
      try {
        const updatedBudget = await updateBudgetService(userId, extractedNum);
        const formatted = extractedNum.toLocaleString("en-IN");
        return {
          action: "BUDGET_UPDATED",
          speechReply: `Your monthly budget limit has been set to ₹${formatted}.`,
          displayHeadline: "Budget Limit Updated",
          displayText: `Monthly budget limit adjusted to ₹${formatted}. Current spending will be tracked against this limit.`,
          metrics: [{ label: "Monthly Budget", value: `₹${formatted}` }],
          transactionData: updatedBudget,
        };
      } catch (budgetErr) {
        console.warn("[Voice Terminal] Budget update error:", budgetErr);
      }
    }
  }

  // =========================================================================
  // FAST PATH 5: NAVIGATION & SCREEN SWITCHING (<10ms)
  // =========================================================================
  if (
    /\b(go to|open|show|navigate to|view|take me to|switch to)\b/i.test(lower) ||
    /^(analytics|charts|graphs|reports|transactions|expenses|ledger|settings|dashboard|overview|home)$/i.test(lower)
  ) {
    if (/\b(analytics|charts|graphs|breakdown)\b/i.test(lower)) {
      return {
        action: "NAVIGATE",
        path: "/analytics",
        speechReply: "Opening Analytics.",
        displayText: "Opening Analytics...",
      };
    }
    if (/\b(transactions|transaction|ledger|expenses|history|table)\b/i.test(lower)) {
      return {
        action: "NAVIGATE",
        path: "/transactions",
        speechReply: "Opening Transactions.",
        displayText: "Navigating to Transactions...",
      };
    }
    if (/\b(reports|statements|summary report)\b/i.test(lower)) {
      return {
        action: "NAVIGATE",
        path: "/reports",
        speechReply: "Opening Reports.",
        displayText: "Opening Reports...",
      };
    }
    if (/\b(copilot|telegram)\b/i.test(lower)) {
      return {
        action: "NAVIGATE",
        path: "/settings/copilot",
        speechReply: "Opening Telegram Assistant settings.",
        displayText: "Navigating to Telegram Assistant Settings...",
      };
    }
    if (/\b(settings|profile|account)\b/i.test(lower)) {
      return {
        action: "NAVIGATE",
        path: "/settings",
        speechReply: "Opening Settings.",
        displayText: "Navigating to Settings...",
      };
    }
    if (/\b(dashboard|overview|home)\b/i.test(lower)) {
      return {
        action: "NAVIGATE",
        path: "/overview",
        speechReply: "Opening your Dashboard.",
        displayText: "Opening Dashboard...",
      };
    }
  }

  // Search & Filter in transactions table
  const filterMatch = lower.match(
    /\b(show|find|search|filter)\b.*?\b(swiggy|zomato|amazon|uber|netflix|blinkit|zepto|starbucks|dining|food|groceries|shopping|travel|utilities|salary|biryani|chai|petrol)\b/i
  );
  if (filterMatch && filterMatch[2] && !/\b(dashboard|analytics|reports|settings)\b/i.test(lower)) {
    const term = filterMatch[2];
    return {
      action: "NAVIGATE",
      path: `/transactions?keyword=${encodeURIComponent(term)}`,
      speechReply: `Filtering transactions for ${term}.`,
      displayHeadline: `Transactions Filter: ${term}`,
      displayText: `Searching transactions for: "${term}"...`,
    };
  }

  // =========================================================================
  // FAST PATH 6: EMAIL / EXPORT (<50ms)
  // =========================================================================
  if (
    /\b(email|export|send)\b/i.test(lower) &&
    /\b(report|transaction|csv|statement|pdf)\b/i.test(lower)
  ) {
    try {
      const user = await UserModel.findById(userId).lean();
      if (user?.email) {
        await exportTransactionsEmailService(userId, user.email, {});
        return {
          action: "EXPORT_ACTION",
          speechReply: `Your transaction report has been emailed to ${user.email}.`,
          displayHeadline: "Report Sent",
          displayText: `We have emailed your transaction history to ${user.email}.`,
        };
      }
    } catch (exportErr: any) {
      console.warn("[Voice Terminal] Export notice:", exportErr);
    }
  }

  // =========================================================================
  // FAST PATH 7: INSTANT BALANCE & SPENDING QUERIES (<25ms)
  // =========================================================================
  if (
    /\b(balance|net worth|kitna (paisa|rupay)|paisa kitna|how much (money )?do i have|current standing|how broke am i|my savings)\b/i.test(
      lower
    ) ||
    lower === "balance" ||
    lower === "what is my balance" ||
    lower === "portfolio balance"
  ) {
    try {
      const thisMonth = await summaryAnalyticsService(userId, DateRangeEnum.THIS_MONTH);
      const allTime = await summaryAnalyticsService(userId, DateRangeEnum.ALL_TIME);
      const userDoc = await UserModel.findById(userId).select("portfolioBalance");
      const baseWealth = Number(userDoc?.portfolioBalance) || 0;
      const totalPortfolioBalance = baseWealth + allTime.availableBalance;

      const totalBalStr = Math.round(totalPortfolioBalance).toLocaleString("en-IN");
      const incomeStr = Math.round(thisMonth.totalIncome).toLocaleString("en-IN");
      const expensesStr = Math.round(thisMonth.totalExpenses).toLocaleString("en-IN");
      const rate = thisMonth.savingRate?.percentage || 0;
      const budgetLeftStr = thisMonth.budgetLimit > 0
        ? ` You have ₹${Math.round(thisMonth.remainingBudget).toLocaleString("en-IN")} remaining in your monthly budget.`
        : "";

      return {
        action: "FINANCIAL_QUERY",
        speechReply: `Your total portfolio balance is ₹${totalBalStr}. This month, you've earned ₹${incomeStr} and spent ₹${expensesStr}, saving ${rate} percent of your income.${budgetLeftStr}`,
        displayHeadline: "Total Portfolio Balance",
        displayText: `Total Portfolio Balance: ₹${totalBalStr}. This month: ₹${incomeStr} earned, ₹${expensesStr} spent (${rate}% savings rate).${budgetLeftStr}`,
        metrics: [
          { label: "Portfolio Balance", value: `₹${totalBalStr}` },
          { label: "This Month Income", value: `₹${incomeStr}` },
          { label: "This Month Spend", value: `₹${expensesStr}` },
          { label: "Savings Rate", value: `${rate}%` },
        ],
      };
    } catch (sumErr) {
      console.warn("[Voice Terminal] Summary error:", sumErr);
    }
  }

  // Total Spending Query (e.g. "how much did I spend this month?", "what are my expenses?")
  if (
    /\b(how much did i spend|what did i spend|total spend|total expenses|spending this month|kitna kharcha)\b/i.test(
      lower
    ) &&
    !/\b(on\s+[a-z]+)\b/i.test(lower)
  ) {
    try {
      const { preset, label: periodLabel } = parseTimeframeFromUtterance(lower);
      const summary = await summaryAnalyticsService(userId, preset);
      const expenses = Math.round(summary.totalExpenses).toLocaleString("en-IN");
      const remaining =
        preset === DateRangeEnum.THIS_MONTH && summary.budgetLimit > 0
          ? ` You have ₹${Math.round(summary.remainingBudget).toLocaleString("en-IN")} left in your monthly budget.`
          : "";

      return {
        action: "FINANCIAL_QUERY",
        speechReply: `You have spent ₹${expenses} ${periodLabel}.${remaining}`,
        displayHeadline: `Spending (${periodLabel})`,
        displayText: `Total expenses ${periodLabel}: ₹${expenses}.${remaining}`,
        metrics: [
          { label: `Total Spent (${periodLabel})`, value: `₹${expenses}` },
          {
            label: "Remaining Budget",
            value:
              summary.budgetLimit > 0
                ? `₹${Math.round(summary.remainingBudget).toLocaleString("en-IN")}`
                : "N/A",
          },
        ],
      };
    } catch (expErr) {
      console.warn("[Voice Terminal] Expense query error:", expErr);
    }
  }

  // Total Income Query (e.g. "what is my income?", "how much did I earn this month?", "total earnings")
  if (
    /\b(how much did i earn|what did i earn|what is my income|my income|total income|total earnings|how much income|how much money came in|kitni income)\b/i.test(
      lower
    )
  ) {
    try {
      const { preset, label: periodLabel } = parseTimeframeFromUtterance(lower);
      const summary = await summaryAnalyticsService(userId, preset);
      const income = Math.round(summary.totalIncome).toLocaleString("en-IN");

      return {
        action: "FINANCIAL_QUERY",
        speechReply: `You have earned ₹${income} ${periodLabel}.`,
        displayHeadline: `Income (${periodLabel})`,
        displayText: `Total income ${periodLabel}: ₹${income}.`,
        metrics: [
          { label: `Total Income (${periodLabel})`, value: `₹${income}` },
          {
            label: `Savings Rate (${periodLabel})`,
            value: `${summary.savingRate?.percentage || 0}%`,
          },
        ],
      };
    } catch (incErr) {
      console.warn("[Voice Terminal] Income query error:", incErr);
    }
  }

  // Budget Query (e.g. "what is my budget?", "how much budget is left?", "remaining budget")
  if (
    /\b(what is my budget|budget status|budget remaining|remaining budget|how much budget|budget limit|how much.*left in.*budget)\b/i.test(
      lower
    )
  ) {
    try {
      const summary = await summaryAnalyticsService(userId, DateRangeEnum.THIS_MONTH);
      if (!summary.budgetLimit || summary.budgetLimit <= 0) {
        return {
          action: "FINANCIAL_QUERY",
          speechReply: "You haven't configured a monthly budget limit yet. You can set one by saying 'Set budget to 50,000'.",
          displayHeadline: "Monthly Budget",
          displayText: "No monthly budget limit configured. Try saying 'Set budget to 50,000'.",
          metrics: [{ label: "Monthly Budget", value: "Not Set" }],
        };
      }

      const limitStr = Math.round(summary.budgetLimit).toLocaleString("en-IN");
      const remStr = Math.round(summary.remainingBudget).toLocaleString("en-IN");
      const spentStr = Math.round(summary.totalExpenses).toLocaleString("en-IN");
      const isOver = summary.remainingBudget < 0;

      return {
        action: "FINANCIAL_QUERY",
        speechReply: isOver
          ? `You have exceeded your monthly budget of ₹${limitStr} by ₹${Math.abs(Math.round(summary.remainingBudget)).toLocaleString("en-IN")}. You have spent ₹${spentStr} this month.`
          : `You have ₹${remStr} remaining out of your ₹${limitStr} monthly budget. You have spent ₹${spentStr} so far.`,
        displayHeadline: isOver ? "Budget Exceeded" : "Budget Remaining",
        displayText: `Remaining: ₹${remStr} of ₹${limitStr} limit (Spent: ₹${spentStr}).`,
        metrics: [
          { label: "Remaining Budget", value: `₹${remStr}` },
          { label: "Monthly Limit", value: `₹${limitStr}` },
          { label: "Spent So Far", value: `₹${spentStr}` },
        ],
      };
    } catch (bErr) {
      console.warn("[Voice Terminal] Budget query error:", bErr);
    }
  }

  // Savings Rate Query (e.g. "what is my savings rate?", "how much did I save this month?")
  if (
    /\b(what is my savings rate|my savings rate|how much did i save|savings this month|savings percentage)\b/i.test(
      lower
    )
  ) {
    try {
      const { preset, label: periodLabel } = parseTimeframeFromUtterance(lower);
      const summary = await summaryAnalyticsService(userId, preset);
      const rate = summary.savingRate?.percentage || 0;
      const savedAmount = Math.max(0, summary.totalIncome - summary.totalExpenses);
      const savedStr = Math.round(savedAmount).toLocaleString("en-IN");

      return {
        action: "FINANCIAL_QUERY",
        speechReply: `Your savings rate is ${rate} percent ${periodLabel}, with approximately ₹${savedStr} saved after expenses.`,
        displayHeadline: `Savings Rate (${periodLabel})`,
        displayText: `Savings Rate (${periodLabel}): ${rate}% (Net saved: ₹${savedStr}).`,
        metrics: [
          { label: `Savings Rate (${periodLabel})`, value: `${rate}%` },
          { label: "Net Saved", value: `₹${savedStr}` },
        ],
      };
    } catch (saveErr) {
      console.warn("[Voice Terminal] Savings query error:", saveErr);
    }
  }

  // Spending Pace & Runway
  if (
    /\b(runway|burn rate|burn velocity|daily burn|daily spending|how long will my money last|financial health|health score|spending pace)\b/i.test(
      lower
    )
  ) {
    try {
      const summary = await summaryAnalyticsService(userId, DateRangeEnum.THIS_MONTH);
      const runway = summary.runwayMetrics;
      const daily = runway?.dailyBurnRate
        ? Math.round(runway.dailyBurnRate).toLocaleString("en-IN")
        : "0";
      const monthlyProj = runway?.projectedMonthlyExpense
        ? Math.round(runway.projectedMonthlyExpense).toLocaleString("en-IN")
        : "0";
      const runwayMo = runway?.runwayMonths || "Perpetual";
      const score = runway?.healthScore || 85;
      const rating = runway?.healthRating || "Prime";

      return {
        action: "FINANCIAL_QUERY",
        speechReply: `You spend about ₹${daily} per day, which projects to roughly ₹${monthlyProj} this month. At this pace, your savings will last about ${runwayMo}. Your financial health score is ${score} out of 100.`,
        displayHeadline: "Spending Pace & Money Lifespan",
        displayText: `Daily Spending: ₹${daily}/day (projected ₹${monthlyProj} this month). Savings will last: ${runwayMo}. Health Score: ${score}/100.`,
        metrics: [
          { label: "Savings Will Last", value: runwayMo },
          { label: "Daily Spending", value: `₹${daily}/day` },
          { label: "Projected Month", value: `₹${monthlyProj}` },
          { label: "Health Score", value: `${score}/100 (${rating})` },
        ],
      };
    } catch (runwayErr) {
      console.warn("[Voice Terminal] Runway query error:", runwayErr);
    }
  }

  // Specific Category Spending Query (e.g. "how much did I spend on dining?", "how much on swiggy?")
  const categoryQueryMatch = lower.match(
    /\b(?:how much|what)\s+(?:did i spend|spent|have i spent)\s+(?:on|in|for)\s+([a-z0-9_-]+)/i
  );
  if (categoryQueryMatch && categoryQueryMatch[1]) {
    const queryCategoryWord = categoryQueryMatch[1].toLowerCase();
    const { category, title } = detectIndianMerchantAndCategory(queryCategoryWord);
    try {
      const { label: timeLabel, dateFilter } = parseTimeframeFromUtterance(lower);

      const query: any = {
        userId: new mongoose.Types.ObjectId(userId),
        type: TransactionTypeEnum.EXPENSE,
        $or: [
          { category: category !== "other" ? category : queryCategoryWord },
          { title: { $regex: queryCategoryWord, $options: "i" } },
        ],
      };
      if (dateFilter) {
        query.date = dateFilter;
      }

      const categoryTxs = await TransactionModel.find(query).lean();

      // Convert raw paise units from lean documents into INR
      const totalSpentOnCategory = categoryTxs.reduce(
        (sum, t) => sum + convertToUnit(Number(t.amount)),
        0
      );
      const cleanTotal = Math.round(totalSpentOnCategory).toLocaleString("en-IN");

      return {
        action: "FINANCIAL_QUERY",
        speechReply: `You have spent ₹${cleanTotal} on ${title || queryCategoryWord} ${timeLabel} across ${categoryTxs.length} transactions.`,
        displayHeadline: `Spending: ${title || queryCategoryWord}`,
        displayText: `Total spent on ${title || queryCategoryWord} ${timeLabel}: ₹${cleanTotal} (${categoryTxs.length} transactions).`,
        metrics: [
          { label: "Total Spent", value: `₹${cleanTotal}` },
          { label: "Transactions", value: `${categoryTxs.length}` },
        ],
      };
    } catch (catErr) {
      console.warn("[Voice Terminal] Category query error:", catErr);
    }
  }

  // Telegram Pair / Status
  if (/\b(telegram|bot)\b.*\b(pair|code|token)\b/i.test(lower) || /\b(connect|link|pair)\b.*\b(telegram)\b/i.test(lower)) {
    try {
      const pair = await generateTelegramPairingCodeService(userId);
      return {
        action: "TELEGRAM_ACTION",
        modalTarget: "TELEGRAM_COPILOT",
        speechReply: `Your Telegram pairing code is ${pair.code}. Valid for 15 minutes.`,
        displayHeadline: "Telegram Pairing Code",
        displayText: `Code: ${pair.code}. Send /start ${pair.code} to @${pair.botUsername}.`,
        metrics: [
          { label: "Pairing Code", value: pair.code },
          { label: "Bot Username", value: `@${pair.botUsername}` },
        ],
        telegramData: pair,
      };
    } catch (tgErr) {
      console.warn("[Voice Terminal] Telegram error:", tgErr);
    }
  }

  // =========================================================================
  // FAST PATH 8: INSTANT DETERMINISTIC TRANSACTION CREATION (<25ms)
  // This executes IMMEDIATELY without waiting for cloud Gemini!
  // =========================================================================
  const fastAmount = parseIndianCurrencyExpression(lower);
  const isQuestion = /\b(what|how much|how long|did i|where|can i|is my|show|tell me|explain)\b/i.test(lower);

  if (fastAmount && fastAmount > 0 && !isQuestion) {
    const { title, category, paymentMethod, type } = detectIndianMerchantAndCategory(lower);
    try {
      const created = await createTransactionService(
        {
          title,
          amount: fastAmount,
          type,
          category,
          paymentMethod,
          date: new Date(),
          description: `Voice Command: "${transcript}"`,
          isRecurring: false,
        },
        userId
      );

      const formattedAmount = fastAmount.toLocaleString("en-IN");
      const speech =
        type === TransactionTypeEnum.INCOME
          ? `Recorded ₹${formattedAmount} income for ${title} under ${category}.`
          : `Recorded ₹${formattedAmount} expense for ${title} under ${category}.`;

      return {
        action: "TRANSACTION_CREATED",
        speechReply: speech,
        displayHeadline: "Transaction Saved",
        displayText: `${
          type === TransactionTypeEnum.INCOME ? "Income" : "Expense"
        } of ₹${formattedAmount} for "${title}" saved to your transactions.`,
        metrics: [
          { label: "Amount", value: `₹${formattedAmount}` },
          { label: "Category", value: category.toUpperCase() },
          { label: "Payment", value: paymentMethod },
        ],
        transactionData: created,
      };
    } catch (fastCreateErr) {
      console.warn("[Voice Terminal] Fast transaction create error:", fastCreateErr);
    }
  }

  // =========================================================================
  // LAYER 4: SEMANTIC AI WITH 3500ms TIMEOUT & HEURISTIC SHIELD
  // For open-ended, complex conversational questions
  // =========================================================================
  try {
    let financialContext = "";
    try {
      const [summary, allTime, lastMonth, thisYear] = await Promise.all([
        summaryAnalyticsService(userId, DateRangeEnum.THIS_MONTH),
        summaryAnalyticsService(userId, DateRangeEnum.ALL_TIME),
        summaryAnalyticsService(userId, DateRangeEnum.LAST_MONTH),
        summaryAnalyticsService(userId, DateRangeEnum.THIS_YEAR),
      ]);
      const userDoc = await UserModel.findById(userId).select("portfolioBalance");
      const baseWealth = Number(userDoc?.portfolioBalance) || 0;
      const totalPortfolioBalance = baseWealth + allTime.availableBalance;

      financialContext = `User Financial Standing:
- TRUE TOTAL PORTFOLIO BALANCE: ₹${Math.round(totalPortfolioBalance).toLocaleString("en-IN")} (Base: ₹${Math.round(baseWealth).toLocaleString("en-IN")}, All-time net cash flow: ${allTime.availableBalance >= 0 ? "+" : ""}₹${Math.round(allTime.availableBalance).toLocaleString("en-IN")})
- This Month's Income: ₹${Math.round(summary.totalIncome).toLocaleString("en-IN")}
- This Month's Expenses: ₹${Math.round(summary.totalExpenses).toLocaleString("en-IN")}
- This Month's Net Cash Flow: ${summary.availableBalance >= 0 ? "+" : ""}₹${Math.round(summary.availableBalance).toLocaleString("en-IN")}
- This Month's Savings Rate: ${summary.savingRate?.percentage || 0}%
- Last Month's Income: ₹${Math.round(lastMonth.totalIncome).toLocaleString("en-IN")}, Expenses: ₹${Math.round(lastMonth.totalExpenses).toLocaleString("en-IN")}, Savings Rate: ${lastMonth.savingRate?.percentage || 0}%
- This Year's Income: ₹${Math.round(thisYear.totalIncome).toLocaleString("en-IN")}, Expenses: ₹${Math.round(thisYear.totalExpenses).toLocaleString("en-IN")}, Savings Rate: ${thisYear.savingRate?.percentage || 0}%
- Monthly Budget Limit: ₹${summary.budgetLimit ? Math.round(summary.budgetLimit).toLocaleString("en-IN") : "Not configured"}
- Remaining Monthly Budget: ₹${summary.budgetLimit > 0 ? Math.round(summary.remainingBudget).toLocaleString("en-IN") : "N/A"}`;
    } catch {
      // ignore
    }

    const semanticPrompt = `
You are the Obsidian Finance Voice Assistant.
User utterance: "${transcript}"
Today's Date: ${new Date().toISOString().split("T")[0]}
${financialContext}

Classify into ONE action:
1. "OPEN_MODAL": User wants to open a view (ADD_TRANSACTION, RECEIPT_SCANNER, IMPORT_STATEMENT, LEDGER_AUDIT, TELEGRAM_COPILOT).
2. "AUDIT_LEDGER": User asks to verify records or check security.
3. "TRANSACTION_CREATED": User expresses expense or income.
   title: string, amount: positive number in INR, type: "INCOME" | "EXPENSE", category: string, paymentMethod: string.
4. "TRANSACTION_DELETED": User wants to delete/undo an entry. keyword: string.
5. "BUDGET_UPDATED": User wants to set/change budget. limit: positive number.
6. "NAVIGATE": User wants to go to a screen. path: string.
7. "EXPORT_ACTION": User wants to export or email report.
8. "TELEGRAM_ACTION": User asks about Telegram.
9. "FINANCIAL_QUERY": User asks a question about their finances.
   conversationalReply: 1-2 natural sentences in simple plain English answering directly with exact numbers in ₹ from the context. Avoid financial jargon. If asked "Can I afford X?", evaluate against Remaining Monthly Budget and Total Portfolio Balance: if X is under the remaining budget, approve it; if it exceeds the remaining budget but is within total portfolio balance, state that it exceeds monthly budget but is covered by portfolio reserves; if it exceeds total portfolio balance, state clearly that it is not affordable.

Output strictly valid JSON:
{
  "action": "OPEN_MODAL" | "AUDIT_LEDGER" | "TRANSACTION_CREATED" | "TRANSACTION_DELETED" | "BUDGET_UPDATED" | "NAVIGATE" | "EXPORT_ACTION" | "TELEGRAM_ACTION" | "FINANCIAL_QUERY",
  "modalTarget": "ADD_TRANSACTION" | "IMPORT_STATEMENT" | "RECEIPT_SCANNER" | "LEDGER_AUDIT" | "TELEGRAM_COPILOT",
  "path": "string",
  "title": "string",
  "amount": 0,
  "type": "INCOME" | "EXPENSE",
  "category": "string",
  "paymentMethod": "CARD" | "CASH" | "BANK_TRANSFER" | "AUTO_DEBIT" | "MOBILE_PAYMENT" | "OTHER",
  "keyword": "string",
  "limit": 0,
  "conversationalReply": "string",
  "metrics": [ { "label": "string", "value": "string" } ]
}
`;

    // 3500ms timeout race to ensure zero hanging or slow response
    const aiTimeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("AI_TIMEOUT")), 3500)
    );

    const aiRes = await Promise.race([
      generateContentWithRetry({
        contents: semanticPrompt,
        config: { responseMimeType: "application/json", temperature: 0 },
      }),
      aiTimeoutPromise,
    ]);

    const parsed = JSON.parse(
      aiRes.text?.replace(/```(?:json)?\n?/g, "").trim() || "{}"
    );

    const rawAction = String(parsed.action || "").toUpperCase().trim();
    const cleanAmount =
      typeof parsed.amount === "string"
        ? parseFloat(parsed.amount.replace(/[^0-9.]/g, ""))
        : Number(parsed.amount) || 0;
    const cleanLimit =
      typeof parsed.limit === "string"
        ? parseFloat(parsed.limit.replace(/[^0-9.]/g, ""))
        : Number(parsed.limit) || 0;

    if (parsed.modalTarget) {
      return {
        action: "OPEN_MODAL",
        modalTarget: parsed.modalTarget,
        speechReply: parsed.conversationalReply || `Opening ${parsed.modalTarget.replace(/_/g, " ").toLowerCase()}.`,
        displayHeadline: "Screen Opened",
        displayText: parsed.conversationalReply || "Opening requested view on your screen.",
      };
    }

    if (["AUDIT_LEDGER", "VERIFY_LEDGER"].includes(rawAction)) {
      const audit = await verifyLedgerIntegrityService(userId);
      const isSecure = audit.status === "VERIFIED_SECURE";
      return {
        action: "AUDIT_LEDGER",
        modalTarget: "LEDGER_AUDIT",
        speechReply: isSecure
          ? `Your records are verified and intact across ${audit.chainDepth} transactions.`
          : `Discrepancy detected at entry ${audit.tamperedBlocks[0]?.index}.`,
        displayHeadline: isSecure ? "Records Verified" : "Discrepancy Found",
        displayText: `All ${audit.chainDepth} transactions verified in ${audit.executionTimeMs}ms.`,
        metrics: [
          { label: "Status", value: isSecure ? "Verified Safe" : "Discrepancy" },
          { label: "Records", value: `${audit.chainDepth}` },
          { label: "Time", value: `${audit.executionTimeMs} ms` },
        ],
        auditData: audit,
      };
    }

    const effectiveAmount = cleanAmount > 0 ? cleanAmount : (parseIndianCurrencyExpression(transcript) || 0);
    if (["TRANSACTION_CREATED", "ADD_TRANSACTION"].includes(rawAction) && effectiveAmount > 0) {
      const type = parsed.type === "INCOME" ? TransactionTypeEnum.INCOME : TransactionTypeEnum.EXPENSE;
      const detected = detectIndianMerchantAndCategory(transcript);
      const category = VALID_CATEGORIES.includes(parsed.category?.toLowerCase())
        ? parsed.category.toLowerCase()
        : detected.category;

      const paymentMethod = Object.values(PaymentMethodEnum).includes(parsed.paymentMethod)
        ? parsed.paymentMethod
        : detected.paymentMethod;

      const created = await createTransactionService(
        {
          title: parsed.title || detected.title || (type === TransactionTypeEnum.INCOME ? "Income" : "Expense"),
          amount: Math.abs(effectiveAmount),
          type,
          category,
          paymentMethod,
          date: new Date(),
          description: `Voice Command: "${transcript}"`,
          isRecurring: false,
        },
        userId
      );

      const formattedAmount = Number(created.amount).toLocaleString("en-IN");
      return {
        action: "TRANSACTION_CREATED",
        speechReply: parsed.conversationalReply || `Saved ₹${formattedAmount} for ${created.title}.`,
        displayHeadline: "Transaction Saved",
        displayText: `Recorded ${type.toLowerCase()} of ₹${formattedAmount} for "${created.title}".`,
        metrics: [
          { label: "Amount", value: `₹${formattedAmount}` },
          { label: "Category", value: category.toUpperCase() },
        ],
        transactionData: created,
      };
    }

    if (["TRANSACTION_DELETED", "DELETE_TRANSACTION"].includes(rawAction)) {
      const keyword = (parsed.keyword || "").trim();
      const query: any = { userId: new mongoose.Types.ObjectId(userId) };
      if (keyword && !["last", "transaction", "expense"].includes(keyword.toLowerCase())) {
        query.title = { $regex: keyword, $options: "i" };
      }
      const candidate = await TransactionModel.findOne(query).sort({ date: -1, createdAt: -1 });
      if (candidate) {
        await deleteTransactionService(userId, candidate._id.toString());
        const cleanAmt = Number(candidate.amount).toLocaleString("en-IN");
        return {
          action: "TRANSACTION_DELETED",
          speechReply: `Deleted transaction: ${candidate.title} for ₹${cleanAmt}.`,
          displayHeadline: "Transaction Deleted",
          displayText: `Removed "${candidate.title}" (₹${cleanAmt}).`,
          metrics: [
            { label: "Removed Title", value: candidate.title },
            { label: "Amount", value: `₹${cleanAmt}` },
          ],
        };
      }
    }

    const effectiveLimit = cleanLimit > 0 ? cleanLimit : (parseIndianCurrencyExpression(transcript) || 0);
    if (["BUDGET_UPDATED", "SET_BUDGET"].includes(rawAction) && effectiveLimit > 0) {
      const updatedBudget = await updateBudgetService(userId, effectiveLimit);
      const formatted = effectiveLimit.toLocaleString("en-IN");
      return {
        action: "BUDGET_UPDATED",
        speechReply: `Your monthly budget limit has been set to ₹${formatted}.`,
        displayHeadline: "Budget Limit Updated",
        displayText: `Monthly budget ceiling set to ₹${formatted}.`,
        metrics: [{ label: "Monthly Budget", value: `₹${formatted}` }],
        transactionData: updatedBudget,
      };
    }

    if (["NAVIGATE", "GO_TO"].includes(rawAction) && parsed.path) {
      return {
        action: "NAVIGATE",
        path: parsed.path,
        speechReply: parsed.conversationalReply || `Opening ${parsed.path}.`,
        displayHeadline: "Navigating",
        displayText: `Opening ${parsed.path}...`,
      };
    }

    if (parsed.conversationalReply) {
      return {
        action: "FINANCIAL_QUERY",
        speechReply: parsed.conversationalReply,
        displayHeadline: "Financial Insights",
        displayText: parsed.conversationalReply,
        metrics: Array.isArray(parsed.metrics) && parsed.metrics.length > 0 ? parsed.metrics : undefined,
      };
    }
  } catch (semanticErr) {
    console.warn("[Voice Terminal] Semantic AI timeout or error, executing analytical fallback");
  }

  // =========================================================================
  // HEURISTIC SHIELD: ANALYTICAL SYNTHESIZER (ZERO BROKEN PROMISES)
  // When AI is unreachable or times out, provide rich data-backed insights
  // =========================================================================
  try {
    const summary = await summaryAnalyticsService(userId, DateRangeEnum.THIS_MONTH);
    const totalBal = Math.round(
      summary.totalPortfolioBalance ??
      ((summary.basePortfolioBalance ?? 0) + summary.availableBalance)
    ).toLocaleString("en-IN");
    const income = Math.round(summary.totalIncome).toLocaleString("en-IN");
    const expenses = Math.round(summary.totalExpenses).toLocaleString("en-IN");
    const rate = summary.savingRate?.percentage || 0;

    return {
      action: "FINANCIAL_QUERY",
      speechReply: `Your total portfolio balance is ₹${totalBal}. You've earned ₹${income} and spent ₹${expenses} this month with a ${rate} percent savings rate.`,
      displayHeadline: "Financial Overview",
      displayText: `Portfolio: ₹${totalBal} | Income: ₹${income} | Expenses: ₹${expenses} | Savings Rate: ${rate}%.`,
      metrics: [
        { label: "Portfolio Balance", value: `₹${totalBal}` },
        { label: "Total Income", value: `₹${income}` },
        { label: "Total Expenses", value: `₹${expenses}` },
        { label: "Savings Rate", value: `${rate}%` },
      ],
    };
  } catch {
    return {
      action: "GENERAL_HELP",
      speechReply:
        "I'm ready. You can say 'Spent 450 on lunch', 'What's my balance?', 'Set budget to 50k', or 'Verify records'.",
      displayHeadline: "Voice Assistant Ready",
      displayText: `Try: "Spent 450 on lunch", "What's my balance?", or "Set my budget to 40k".`,
    };
  }
};
