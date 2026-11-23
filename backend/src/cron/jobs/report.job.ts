import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import ReportSettingModel from "../../models/report-setting.model";
import { UserDocument } from "../../models/user.model";
import mongoose from "mongoose";
import { generateReportService } from "../../services/report.service";
import ReportModel, { ReportStatusEnum } from "../../models/report.model";
import { calulateNextReportDate } from "../../utils/helper";
import { sendReportEmail } from "../../mailers/report.mailer";

let isProcessingReports = false;

export const processReportJob = async () => {
  if (isProcessingReports) {
    console.warn("[Report Cron] Previous run still active; skipping overlap.");
    return { success: true, processedCount: 0, failedCount: 0 };
  }

  isProcessingReports = true;
  const now = new Date();
  let processedCount = 0;
  let failedCount = 0;

  const from = startOfMonth(subMonths(now, 1));
  const to = endOfMonth(subMonths(now, 1));

  try {
    const reportSettingCursor = ReportSettingModel.find({
      isEnabled: true,
      nextReportDate: { $lte: now },
    })
      .populate<{ userId: UserDocument }>("userId")
      .cursor();

    console.log("[Report Cron] Running scheduled monthly report job...");

    for await (const setting of reportSettingCursor) {
      const user = setting.userId as UserDocument;
      if (!user) {
        console.log(`[Report Cron] User not found for setting: ${setting._id}`);
        continue;
      }

      const session = await mongoose.startSession();

      try {
        const report = await generateReportService(user.id, from, to);

        let emailSent = false;
        if (report && user.email) {
          try {
            await sendReportEmail({
              email: user.email,
              username: user.name || "Client",
              report: {
                period: report.period,
                totalIncome: report.summary.income,
                totalExpenses: report.summary.expenses,
                availableBalance: report.summary.balance,
                savingsRate: report.summary.savingsRate,
                topSpendingCategories: report.summary.topCategories,
                insights: report.insights,
                recentTransactions: report.recentTransactions,
              },
              frequency: setting.frequency!,
            });
            emailSent = true;
          } catch {
            console.log(`[Report Cron] Email delivery failed for user ${user.id}`);
          }
        }

        const persistOutcome = async (txSession?: mongoose.ClientSession) => {
          const bulkReports: any[] = [];
          const bulkSettings: any[] = [];

          if (report && emailSent) {
            bulkReports.push({
              insertOne: {
                document: {
                  userId: user.id,
                  sentDate: now,
                  period: report.period,
                  fromDate: from,
                  toDate: to,
                  status: ReportStatusEnum.SENT,
                  createdAt: now,
                  updatedAt: now,
                },
              },
            });

            bulkSettings.push({
              updateOne: {
                filter: { _id: setting._id },
                update: {
                  $set: {
                    lastSentDate: now,
                    nextReportDate: calulateNextReportDate(now),
                    updatedAt: now,
                  },
                },
              },
            });
          } else {
            bulkReports.push({
              insertOne: {
                document: {
                  userId: user.id,
                  sentDate: now,
                  period:
                    report?.period ||
                    `${format(from, "MMMM d")}–${format(to, "d, yyyy")}`,
                  fromDate: from,
                  toDate: to,
                  status: report
                    ? ReportStatusEnum.FAILED
                    : ReportStatusEnum.NO_ACTIVITY,
                  createdAt: now,
                  updatedAt: now,
                },
              },
            });

            bulkSettings.push({
              updateOne: {
                filter: { _id: setting._id },
                update: {
                  $set: {
                    nextReportDate: calulateNextReportDate(now),
                    updatedAt: now,
                  },
                },
              },
            });
          }

          await Promise.all([
            ReportModel.bulkWrite(
              bulkReports,
              txSession ? { ordered: false, session: txSession } : { ordered: false }
            ),
            ReportSettingModel.bulkWrite(
              bulkSettings,
              txSession ? { ordered: false, session: txSession } : { ordered: false }
            ),
          ]);
        };

        try {
          await session.withTransaction(
            async () => {
              await persistOutcome(session);
            },
            { maxCommitTimeMS: 10000 }
          );
        } catch (sessionErr: any) {
          if (
            sessionErr?.message?.includes("replica set") ||
            sessionErr?.message?.includes("Transaction numbers") ||
            sessionErr?.code === 20
          ) {
            await persistOutcome();
          } else {
            throw sessionErr;
          }
        }

        processedCount++;
      } catch (error) {
        console.log(`[Report Cron] Failed to process report for setting ${setting._id}:`, error);
        failedCount++;
      } finally {
        await session.endSession();
      }
    }

    console.log(`[Report Cron] Processed: ${processedCount}, Failed: ${failedCount}`);

    return {
      success: true,
      processedCount,
      failedCount,
    };
  } catch (error) {
    console.error("[Report Cron] Error processing reports", error);
    return {
      success: false,
      error: "Report process failed",
    };
  } finally {
    isProcessingReports = false;
  }
};
