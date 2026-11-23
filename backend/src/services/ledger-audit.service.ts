import crypto from "crypto";
import TransactionModel from "../models/transaction.model";
import { withUserLedgerLock } from "../utils/ledger-lock";

export interface LedgerAuditResult {
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
    reason?: string;
  }>;
}

export const GENESIS_SEED = "OBSIDIAN_FINANCE_GENESIS_BLOCK_2026";

export const getGenesisHash = (): string => {
  return crypto.createHash("sha256").update(GENESIS_SEED).digest("hex");
};

export const computeTransactionBlockHash = (
  previousHash: string,
  tx: { _id?: any; date: any; amount: number; type: string; title: string }
): string => {
  const dStr = tx.date ? new Date(tx.date).toISOString().split("T")[0] : "";
  const normAmount = Math.round(Number(tx.amount) || 0);
  const payload = `${previousHash}|${tx._id || ""}|${dStr}|${normAmount}|${tx.type}|${(tx.title || "").trim()}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
};

export const verifyLedgerIntegrityService = async (
  userId: string,
  simulateTamperIndex?: number
): Promise<LedgerAuditResult> => {
  const startTime = process.hrtime();

  // Retrieve user transactions ordered by ascending creation time
  const transactions = await TransactionModel.find({ userId })
    .sort({ createdAt: 1, _id: 1 })
    .select("_id title amount type date createdAt ledgerHash prevLedgerHash")
    .lean();

  const genesisHash = getGenesisHash();
  let previousHash = genesisHash;
  const tamperedBlocks: LedgerAuditResult["tamperedBlocks"] = [];

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    const originalAmount = Number(tx.amount) || 0;

    const realBlockHash = computeTransactionBlockHash(previousHash, {
      _id: tx._id,
      date: tx.date,
      amount: originalAmount,
      type: tx.type,
      title: tx.title,
    });

    if (simulateTamperIndex !== undefined && simulateTamperIndex === i) {
      const simulatedHash = computeTransactionBlockHash(previousHash, {
        _id: tx._id,
        date: tx.date,
        amount: originalAmount + 1000,
        type: tx.type,
        title: tx.title,
      });

      tamperedBlocks.push({
        index: i + 1,
        transactionId: tx._id.toString(),
        expectedHash: tx.ledgerHash || realBlockHash,
        actualHash: simulatedHash,
        reason: "Simulated tamper detection: rogue amount alteration detected",
      });
      previousHash = simulatedHash;
      continue;
    }

    if (!tx.ledgerHash) {
      tamperedBlocks.push({
        index: i + 1,
        transactionId: tx._id.toString(),
        expectedHash: realBlockHash,
        actualHash: "MISSING_HASH",
        reason: "Missing cryptographic ledgerHash on transaction record",
      });
    } else if (tx.prevLedgerHash !== previousHash) {
      tamperedBlocks.push({
        index: i + 1,
        transactionId: tx._id.toString(),
        expectedHash: previousHash,
        actualHash: tx.prevLedgerHash || "MISSING_PREV_HASH",
        reason:
          "Chain link mismatch: prevLedgerHash does not match preceding block hash",
      });
    } else if (tx.ledgerHash !== realBlockHash) {
      tamperedBlocks.push({
        index: i + 1,
        transactionId: tx._id.toString(),
        expectedHash: realBlockHash,
        actualHash: tx.ledgerHash,
        reason:
          "Cryptographic hash mismatch: record was altered after ledger commitment",
      });
    }

    previousHash = realBlockHash;
  }

  const diff = process.hrtime(startTime);
  const executionTimeMs =
    Math.round((diff[0] * 1000 + diff[1] / 1e6) * 100) / 100;

  return {
    status: tamperedBlocks.length === 0 ? "VERIFIED_SECURE" : "COMPROMISED",
    chainDepth: transactions.length,
    genesisHash,
    ledgerRootHash: previousHash,
    auditTimestamp: new Date().toISOString(),
    executionTimeMs,
    tamperedBlocks,
  };
};

export const recomputeUserLedgerChainUnlocked = async (
  userId: string
): Promise<void> => {
  const transactions = await TransactionModel.find({ userId })
    .sort({ createdAt: 1, _id: 1 })
    .select("_id date amount type title prevLedgerHash ledgerHash")
    .lean();

  let previousHash = getGenesisHash();
  const bulkOps: any[] = [];

  for (const tx of transactions) {
    const rawSmallestAmount = Math.round(Number(tx.amount) || 0);
    const blockHash = computeTransactionBlockHash(previousHash, {
      _id: tx._id,
      date: tx.date,
      amount: rawSmallestAmount,
      type: tx.type,
      title: tx.title,
    });

    if (tx.prevLedgerHash !== previousHash || tx.ledgerHash !== blockHash) {
      bulkOps.push({
        updateOne: {
          filter: { _id: tx._id },
          update: {
            $set: {
              prevLedgerHash: previousHash,
              ledgerHash: blockHash,
            },
          },
        },
      });
    }

    previousHash = blockHash;
  }

  if (bulkOps.length > 0) {
    await TransactionModel.bulkWrite(bulkOps);
  }
};

export const recomputeUserLedgerChain = async (userId: string): Promise<void> => {
  return withUserLedgerLock(userId, () =>
    recomputeUserLedgerChainUnlocked(userId)
  );
};
