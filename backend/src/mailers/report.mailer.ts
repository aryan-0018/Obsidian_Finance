import { formatCurrency } from "../utils/format-currency";
import { getReportEmailTemplate } from "./templates/report.template";
import { sendEmail } from "./mailer";
import { ReportType } from "../@types/report.type";

type ReportEmailParams = {
  email: string;
  username: string;
  report: ReportType;
  frequency?: string;
};

export const sendReportEmail = async (params: ReportEmailParams) => {
  const { email, username, report, frequency } = params;
  const html = getReportEmailTemplate(
    {
      username,
      ...report,
    },
    frequency
  );

  const subjectPrefix = frequency && !["INSTANT", "CUSTOM"].includes(frequency.toUpperCase())
    ? `${frequency} Financial Report`
    : `Financial Report`;

  const text = `Your ${subjectPrefix} (${report.period})
    Income: ${formatCurrency(report.totalIncome)}
    Expenses: ${formatCurrency(report.totalExpenses)}
    Balance: ${formatCurrency(report.availableBalance)}
    Savings Rate: ${report.savingsRate.toFixed(2)}%

    ${report.insights.join("\n")}
`;

  return sendEmail({
    to: email,
    subject: `${subjectPrefix} - ${report.period}`,
    text,
    html,
  });
};
