import { Router } from "express";
import {
  bulkDeleteTransactionController,
  bulkTransactionController,
  createTransactionController,
  deleteTransactionController,
  duplicateTransactionController,
  getAllTransactionController,
  getTransactionByIdController,
  scanReceiptController,
  updateTransactionController,
  exportTransactionsEmailController,
  parseBankStatementController,
  bulkCommitBankTransactionsController,
  ledgerAuditController,
} from "../controllers/transaction.controller";
import {
  receiptMemoryUpload,
  statementUpload,
} from "../middlewares/upload.middleware";
import {
  aiLimiter,
  uploadLimiter,
} from "../middlewares/rateLimiter.middleware";

const transactionRoutes = Router();

transactionRoutes.post("/create", createTransactionController);

transactionRoutes.post(
  "/scan-receipt",
  uploadLimiter,
  aiLimiter,
  receiptMemoryUpload.single("receipt"),
  scanReceiptController
);

transactionRoutes.post(
  "/parse-statement",
  uploadLimiter,
  statementUpload.single("statement"),
  parseBankStatementController
);

transactionRoutes.post("/bulk-commit", bulkCommitBankTransactionsController);

transactionRoutes.post("/bulk-transaction", bulkTransactionController);

transactionRoutes.put("/duplicate/:id", duplicateTransactionController);
transactionRoutes.put("/update/:id", updateTransactionController);

transactionRoutes.get("/all", getAllTransactionController);
transactionRoutes.get("/ledger/audit", ledgerAuditController);
transactionRoutes.get("/export-email", exportTransactionsEmailController);
transactionRoutes.get("/:id", getTransactionByIdController);
transactionRoutes.delete("/delete/:id", deleteTransactionController);
transactionRoutes.delete("/bulk-delete", bulkDeleteTransactionController);

export default transactionRoutes;
