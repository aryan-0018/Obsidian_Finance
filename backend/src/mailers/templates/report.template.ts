import { ReportType } from "../../@types/report.type";
import { formatCurrency } from "../../utils/format-currency";
import { capitalizeFirstLetter } from "../../utils/helper";
import { format } from "date-fns";

export const getReportEmailTemplate = (
  reportData: ReportType & { username: string },
  frequency?: string
) => {
  const {
    username,
    period,
    totalIncome,
    totalExpenses,
    availableBalance,
    savingsRate,
    topSpendingCategories,
    insights,
    recentTransactions = [],
  } = reportData;

  // If frequency is passed and not standard recurring (or if it's an on-demand report), format neatly
  let reportTitle = "Financial Summary";
  if (frequency && frequency.toUpperCase() !== "INSTANT" && frequency.toUpperCase() !== "CUSTOM") {
    reportTitle = `${capitalizeFirstLetter(frequency)} Financial Summary`;
  } else {
    reportTitle = `Financial Summary`;
  }

  const categoryList = topSpendingCategories
    .map(
      (cat: any) => `<li>
      <strong>${capitalizeFirstLetter(cat.name)}</strong>: ${cat.amount !== undefined ? formatCurrency(cat.amount) : ""} (${cat.percent}%)
      </li>`
    )
    .join("");

  const insightsList = insights
    .map((insight: string) => `<li style="margin-bottom: 8px;">${insight}</li>`)
    .join("");

  const transactionsHtml =
    recentTransactions.length > 0
      ? `
      <hr style="margin: 24px 0; border: none; border-top: 1px solid #e0e0e0;" />
      <h4 style="margin: 0 0 12px; font-size: 16px; color: #111;">Key Transactions in this Period</h4>
      <table width="100%" style="border-collapse: collapse; font-size: 14px; text-align: left;">
        <thead>
          <tr style="background-color: #f3f4f6; border-bottom: 2px solid #e5e7eb;">
            <th style="padding: 8px 10px;">Date</th>
            <th style="padding: 8px 10px;">Title</th>
            <th style="padding: 8px 10px;">Category</th>
            <th style="padding: 8px 10px; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${recentTransactions
            .slice(0, 15)
            .map((t, idx) => {
              const isIncome = t.type === "INCOME";
              const formattedDate = t.date ? format(new Date(t.date), "MMM d, yyyy") : "-";
              return `
              <tr style="border-bottom: 1px solid #f3f4f6; ${idx % 2 === 1 ? "background-color: #fafafa;" : ""}">
                <td style="padding: 8px 10px; color: #6b7280;">${formattedDate}</td>
                <td style="padding: 8px 10px; font-weight: 500;">${t.title}</td>
                <td style="padding: 8px 10px; color: #4b5563;">${capitalizeFirstLetter(t.category)}</td>
                <td style="padding: 8px 10px; text-align: right; font-weight: 600; color: ${isIncome ? "#16a34a" : "#dc2626"};">
                  ${isIncome ? "+" : "-"}${formatCurrency(t.amount)}
                </td>
              </tr>
            `;
            })
            .join("")}
        </tbody>
      </table>
    `
      : "";

  const currentYear = new Date().getFullYear();
  return `
  <!DOCTYPE html>
 <html lang="en">
   <head>
     <meta charset="UTF-8" />
     <title>${reportTitle}</title>
     <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
   </head>
   <body style="margin: 0; padding: 0; font-family: 'Roboto', Arial, sans-serif; background-color: #f7f7f7; font-size: 15px; color: #1f2937;">
     <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f7f7f7; padding: 25px 0;">
       <tr>
         <td>
           <table cellpadding="0" cellspacing="0" width="100%" style="max-width: 650px; margin: auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06);">
             <tr>
               <td style="background-color: #0f172a; padding: 24px 32px; color: #ffffff; text-align: center;">
                 <h2 style="margin: 0; font-size: 22px; color: #c1a063; letter-spacing: 0.5px;">Obsidian Finance</h2>
                 <p style="margin: 4px 0 0; font-size: 14px; color: #94a3b8;">${reportTitle}</p>
               </td>
             </tr>
             <tr>
               <td style="padding: 28px 32px;">
                 <p style="margin: 0 0 8px; font-size: 16px;">Hi <strong>${username}</strong>,</p>
                 <p style="margin: 0 0 24px; font-size: 15px; color: #4b5563;">Here is your verified financial report for <strong>${period}</strong>.</p>
 
                 <table width="100%" style="border-collapse: collapse; background-color: #f8fafc; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
                   <tr>
                     <td style="padding: 12px 16px; font-size: 15px; border-bottom: 1px solid #e2e8f0;"><strong>Total Income:</strong></td>
                     <td style="padding: 12px 16px; text-align: right; font-size: 15px; font-weight: 600; color: #16a34a; border-bottom: 1px solid #e2e8f0;">${formatCurrency(totalIncome)}</td>
                   </tr>
                   <tr>
                     <td style="padding: 12px 16px; font-size: 15px; border-bottom: 1px solid #e2e8f0;"><strong>Total Expenses:</strong></td>
                     <td style="padding: 12px 16px; text-align: right; font-size: 15px; font-weight: 600; color: #dc2626; border-bottom: 1px solid #e2e8f0;">${formatCurrency(totalExpenses)}</td>
                   </tr>
                   <tr>
                     <td style="padding: 12px 16px; font-size: 15px; border-bottom: 1px solid #e2e8f0;"><strong>Net Available Balance:</strong></td>
                     <td style="padding: 12px 16px; text-align: right; font-size: 15px; font-weight: 700; color: ${availableBalance >= 0 ? "#16a34a" : "#dc2626"}; border-bottom: 1px solid #e2e8f0;">${formatCurrency(availableBalance)}</td>
                   </tr>
                   <tr>
                     <td style="padding: 12px 16px; font-size: 15px;"><strong>Savings Rate:</strong></td>
                     <td style="padding: 12px 16px; text-align: right; font-size: 15px; font-weight: 600; color: #0284c7;">${savingsRate.toFixed(2)}%</td>
                   </tr>
                 </table>

                 ${
                   categoryList
                     ? `
                 <hr style="margin: 24px 0; border: none; border-top: 1px solid #e0e0e0;" />
                 <h4 style="margin: 0 0 12px; font-size: 16px; color: #111;">Top Spending Categories</h4>
                 <ul style="padding-left: 20px; margin: 0; font-size: 14px; color: #374151; line-height: 1.6;">
                   ${categoryList}
                 </ul>
                 `
                     : ""
                 }

                 ${
                   insightsList
                     ? `
                 <hr style="margin: 24px 0; border: none; border-top: 1px solid #e0e0e0;" />
                 <h4 style="margin: 0 0 12px; font-size: 16px; color: #111;">AI Insights & Analysis</h4>
                 <ul style="padding-left: 20px; margin: 0; font-size: 14px; color: #374151; line-height: 1.6;">
                   ${insightsList}
                 </ul>
                 `
                     : ""
                 }

                 ${transactionsHtml}

                 <p style="margin-top: 30px; font-size: 12px; color: #9ca3af; text-align: center;">This report was generated automatically from your Obsidian Finance transactions.</p>
               </td>
             </tr>
             <tr>
               <td style="background-color: #0f172a; text-align: center; padding: 16px; font-size: 12px; color: #94a3b8;">
                 &copy; ${currentYear} Obsidian Finance. All rights reserved.
               </td>
             </tr>
           </table>
         </td>
       </tr>
     </table>
   </body>
 </html>
  `;
};
