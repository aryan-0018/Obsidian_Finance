import cron from "node-cron";
import { processRecurringTransactions } from "./jobs/transaction.job";
import { processReportJob } from "./jobs/report.job";
import { processKeepAliveJob } from "./jobs/keep-alive.job";
import {
  processRenewalRemindersJob,
  processWeeklyDigestJob,
} from "./jobs/radar.job";

const scheduleJob = (name: string, time: string, job: Function) => {
  console.log(`Scheduling ${name} at ${time}`);

  return cron.schedule(
    time,
    async () => {
      try {
        await job();
        console.log(`${name} completed`);
      } catch (error) {
        console.log(`${name} failed`, error);
      }
    },
    {
      scheduled: true,
      timezone: "UTC",
    }
  );
};

export const startJobs = () => {
  return [
    scheduleJob("Transactions", "5 0 * * *", processRecurringTransactions),

    //run 2:30am every first of the month
    scheduleJob("Reports", "30 2 1 * *", processReportJob),

    // Keep-alive self-ping every 14 minutes to prevent host container sleep
    scheduleJob("KeepAlive", "*/14 * * * *", processKeepAliveJob),

    // Daily subscription/EMI renewal alerts (03:30 UTC / 09:00 IST)
    scheduleJob("RenewalReminders", "30 3 * * *", processRenewalRemindersJob),

    // Weekly Sunday evening wealth digest (14:30 UTC / 20:00 IST)
    scheduleJob("WeeklyDigest", "30 14 * * 0", processWeeklyDigestJob),
  ];
};
