import mongoose from "mongoose";
import TransactionModel from "../../models/transaction.model";
import { calculateNextOccurrence } from "../../utils/helper";
import {
  computeTransactionBlockHash,
  getGenesisHash,
} from "../../services/ledger-audit.service";
import { convertToSmallestUnit } from "../../utils/format-currency";
import { withUserLedgerLock } from "../../utils/ledger-lock";

let isProcessingRecurring = false;

export const processRecurringTransactions = async () => {
  if (isProcessingRecurring) {
    console.warn("[Recurring Cron] Previous run still active; skipping overlap.");
    return { success: true, processedCount: 0, failedCount: 0 };
  }

  isProcessingRecurring = true;
  const now = new Date();
  let processedCount = 0;
  let failedCount = 0;

  try {
    const transactionCursor = TransactionModel.find({
      isRecurring: true,
      nextRecurringDate: { $lte: now },
    }).cursor();

    console.log("[Recurring Cron] Checking for scheduled recurring transactions...");

    for await (const tx of transactionCursor) {
      if (!tx.nextRecurringDate || !tx.recurringInterval) {
        continue;
      }

      let nextDate = calculateNextOccurrence(
        tx.nextRecurringDate,
        tx.recurringInterval
      );
      let advanceGuard = 0;
      while (nextDate <= now && advanceGuard < 366) {
        nextDate = calculateNextOccurrence(nextDate, tx.recurringInterval);
        advanceGuard++;
      }

      const userId = tx.userId.toString();
      const recTitle = `Recurring - ${tx.title}`;
      const recDate = tx.nextRecurringDate || now;
      const rawAmt = Number(tx.amount) || 0;

      await withUserLedgerLock(userId, async () => {
        const executeTransactionOperations = async (
          session?: mongoose.ClientSession
        ) => {
          const lastTxQuery = TransactionModel.findOne({ userId })
            .sort({ createdAt: -1, _id: -1 })
            .select("ledgerHash")
            .lean();
          if (session) {
            lastTxQuery.session(session);
          }
          const lastTx = await lastTxQuery;

          const newTxId = new mongoose.Types.ObjectId();
          const prevLedgerHash = lastTx?.ledgerHash || getGenesisHash();
          const blockHash = computeTransactionBlockHash(prevLedgerHash, {
            _id: newTxId,
            date: recDate,
            amount: convertToSmallestUnit(rawAmt),
            type: tx.type,
            title: recTitle,
          });

          const txObj = tx.toObject();
          delete (txObj as any).externalRef;
          delete (txObj as any).ledgerHash;
          delete (txObj as any).prevLedgerHash;
          delete (txObj as any).createdAt;
          delete (txObj as any).updatedAt;

          await TransactionModel.create(
            [
              {
                ...txObj,
                _id: newTxId,
                title: recTitle,
                date: recDate,
                isRecurring: false,
                nextRecurringDate: null,
                recurringInterval: null,
                lastProcessed: null,
                externalRef: null,
                prevLedgerHash,
                ledgerHash: blockHash,
              },
            ],
            session ? { session } : {}
          );

          await TransactionModel.updateOne(
            { _id: tx._id },
            {
              $set: {
                nextRecurringDate: nextDate,
                lastProcessed: now,
              },
            },
            session ? { session } : {}
          );
        };

        let session: mongoose.ClientSession | null = null;
        try {
          session = await mongoose.startSession();
          await session.withTransaction(
            async () => {
              await executeTransactionOperations(session!);
            },
            { maxCommitTimeMS: 20000 }
          );
          processedCount++;
        } catch (sessionErr: any) {
          if (
            sessionErr?.message?.includes("replica set") ||
            sessionErr?.message?.includes("Transaction numbers") ||
            sessionErr?.code === 20
          ) {
            try {
              await executeTransactionOperations();
              processedCount++;
            } catch (fallbackErr: any) {
              failedCount++;
              console.error(
                `[Recurring Cron] Sequential fallback failed for tx: ${tx._id}`,
                fallbackErr
              );
            }
          } else {
            failedCount++;
            console.error(
              `[Recurring Cron] Failed recurring tx: ${tx._id}`,
              sessionErr
            );
          }
        } finally {
          if (session) {
            await session.endSession();
          }
        }
      });
    }

    console.log(
      `[Recurring Cron] Processed: ${processedCount} transaction(s), Failed: ${failedCount}`
    );

    return {
      success: true,
      processedCount,
      failedCount,
    };
  } catch (error: any) {
    console.error(
      "[Recurring Cron] Global recurring transaction processing error:",
      error
    );
    return {
      success: false,
      error: error?.message,
    };
  } finally {
    isProcessingRecurring = false;
  }
};
