import {
  _TRANSACTION_FREQUENCY,
  _TransactionType,
  PAYMENT_METHODS_ENUM,
} from "@/constant";

type RecurringIntervalType =
  (typeof _TRANSACTION_FREQUENCY)[keyof typeof _TRANSACTION_FREQUENCY];
type PaymentMethodType =
  (typeof PAYMENT_METHODS_ENUM)[keyof typeof PAYMENT_METHODS_ENUM];

export interface CreateTransactionBody {
  title: string;
  type: _TransactionType;
  amount: number;
  description: string;
  category: string;
  date: string;
  isRecurring: boolean;
  recurringInterval?: RecurringIntervalType | null;
  paymentMethod: string;
}

export interface GetAllTransactionParams {
  keyword?: string;
  type?: _TransactionType;
  category?: string;
  from?: string;
  to?: string;
  recurringStatus?: "RECURRING" | "NON_RECURRING";
  pageNumber?: number;
  pageSize?: number;
}

export interface TransactionType {
  _id: string;
  userId: string;
  title: string;
  type: _TransactionType;
  amount: number;
  description: string;
  category: string;
  date: string;
  isRecurring: boolean;
  recurringInterval: RecurringIntervalType | null;
  nextRecurringDate: string | null;
  lastProcessed: string | null;
  status: string;
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
  id?: string;
}

export interface GetAllTransactionResponse {
  message: string;
  transations: TransactionType[];
  pagination: {
    pageSize: number;
    pageNumber: number;
    totalCount: number;
    totalPages: number;
    skip: number;
  };
}

export interface AIScanReceiptData {
  title: string;
  amount: number;
  date: string;
  description: string;
  category: string;
  paymentMethod: string;
  type: "INCOME" | "EXPENSE";
  receiptUrl: string;
  tax?: number;
  discount?: number;
  subtotal?: number;
  confidence?: "HIGH" | "MEDIUM" | "LOW";
  items?: Array<{ name: string; quantity?: number; price?: number }>;
}

export interface AIScanReceiptResponse {
  message: string;
  data: AIScanReceiptData;
}

export interface GetSingleTransactionResponse {
  message: string;
  transaction: TransactionType;
}

export interface UpdateTransactionPayload {
  id: string;
  transaction: Partial<CreateTransactionBody>;
}

export interface BulkTransactionType {
  title: string;
  type: _TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string;
  paymentMethod: PaymentMethodType;
  isRecurring: boolean;
}

export interface BulkImportTransactionPayload {
  transactions: BulkTransactionType[];
}

export interface ParsedBankTransaction {
  id: string;
  fingerprint: string;
  title: string;
  rawNarration: string;
  amount: number;
  type: "EXPENSE" | "INCOME";
  category: string;
  paymentMethod: string;
  date: string;
  isDuplicate: boolean;
  duplicateReason?: string;
  selected?: boolean;
}

export interface BankStatementParseResponse {
  message: string;
  data: {
    fileName: string;
    fileType: "PDF" | "CSV";
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
  };
}

export interface CommitBankTransactionItem {
  title: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  category: string;
  paymentMethod: string;
  date: string;
  description?: string;
}

export interface BulkCommitTransactionsResponse {
  message: string;
  data: {
    success: boolean;
    importedCount: number;
  };
}

export interface LedgerAuditResponse {
  message: string;
  data: {
    status: "VERIFIED_SECURE" | "COMPROMISED";
    chainDepth: number;
    genesisHash: string;
    ledgerRootHash: string;
    auditTimestamp: string;
    executionTimeMs: number;
    tamperedBlocks: Array<{
      index: number;
      transactionId: string;
      expectedHash: string;
      actualHash: string;
    }>;
  };
}


