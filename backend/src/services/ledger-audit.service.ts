import crypto from "crypto";
import TransactionModel from "../models/transaction.model";

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
    let amount = Number(tx.amount) || 0;

    // If simulating tamper test for defense demonstration
    if (simulateTamperIndex !== undefined && simulateTamperIndex === i) {
      amount += 1000; // Alter value to simulate rogue database modification
    }

    const blockHash = computeTransactionBlockHash(previousHash, {
      _id: tx._id,
      date: tx.date,
      amount,
      type: tx.type,
      title: tx.title,
    });

    if (simulateTamperIndex !== undefined && simulateTamperIndex === i) {
      tamperedBlocks.push({
        index: i + 1,
        transactionId: tx._id.toString(),
        expectedHash: previousHash,
        actualHash: blockHash,
        reason: "Simulated tamper detection: rogue amount alteration detected",
      });
    } else if (tx.ledgerHash && tx.ledgerHash !== blockHash) {
      tamperedBlocks.push({
        index: i + 1,
        transactionId: tx._id.toString(),
        expectedHash: tx.ledgerHash,
        actualHash: blockHash,
        reason: "Cryptographic hash mismatch: record was altered after ledger commitment",
      });
    }

    previousHash = blockHash;
  }

  const diff = process.hrtime(startTime);
  const executionTimeMs = Math.round((diff[0] * 1000 + diff[1] / 1e6) * 100) / 100;

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
