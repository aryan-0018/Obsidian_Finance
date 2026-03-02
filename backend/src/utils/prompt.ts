import { PaymentMethodEnum } from "../models/transaction.model";

export const receiptPrompt = `
You are a financial assistant that helps users analyze and extract transaction details from receipt image (base64 encoded)
Analyze this receipt image (base64 encoded) and extract transaction details matching this exact JSON format:
{
  "title": "string",          // Merchant/store name or brief description
  "amount": number,           // Total amount (positive number)
  "date": "ISO date string",  // Transaction date in YYYY-MM-DD format
  "description": "string",    // Items purchased summary (max 50 words)
  "category": "string",       // category of the transaction 
  "type": "EXPENSE"           // Always "EXPENSE" for receipts
  "paymentMethod": "string",  // One of: ${Object.values(PaymentMethodEnum).join(",")}
}

Rules:
1. Amount must be positive
2. Date must be valid and in ISO format
3. Category must match our enum values
4. If uncertain about any field, omit it
5. If not a receipt, return {}

Example valid response:
{
  "title": "Walmart Groceries",
  "amount": 58.43,
  "date": "2025-05-08",
  "description": "Groceries: milk, eggs, bread",
  "category": "groceries",
  "paymentMethod": "CARD",
  "type": "EXPENSE"
}
`;

export const reportInsightPrompt = ({
  totalIncome,
  totalExpenses,
  availableBalance,
  savingsRate,
  categories,
  periodLabel,
}: {
  totalIncome: number;
  totalExpenses: number;
  availableBalance: number;
  savingsRate: number;
  categories: Record<string, { amount: number; percentage: number }>;
  periodLabel: string;
}) => {
  const categoryList = Object.entries(categories)
    .map(
      ([name, { amount, percentage }]) =>
        `- ${name}: ${amount} (${percentage}%)`
    )
    .join("\n");

  console.log(categoryList, "category list");

  return `
  You are an advanced quantitative financial system.

Your job is to provide **exactly 3 short, purely statistical insights** based strictly on the mathematical breakdown of the dataset. No conversational fluff.

🧾 Report for: ${periodLabel}
- Total Income: ₹${totalIncome.toFixed(2)}
- Total Expenses: ₹${totalExpenses.toFixed(2)}
- Available Balance: ₹${availableBalance.toFixed(2)}
- Savings Rate: ${savingsRate}%

Top Expense Categories:
${categoryList}

📌 Guidelines:
- Keep each insight to one factual, statistically grounded sentence.
- Use only Indian Rupees (₹).
- No greetings, no generic coaching advice, no robotic fluff. Purely numbers and trends.
- Format your response **exactly** like this:

["Insight 1", "Insight 2", "Insight 3"]

✅ Example:
[
   "Capital retention is ₹7458.00, representing a savings velocity of strong mathematical stability.",
   "Category 'Meals' accounted for 32% of total capital outflow this period.",
   "Expense velocity sits under the target standard deviation threshold, maintaining portfolio equilibrium."
]

⚠️ Output only a **JSON array of 3 strings**. Do not include any explanation, markdown, or notes.
  
  `.trim();
};
