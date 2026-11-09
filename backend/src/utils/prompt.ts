import { PaymentMethodEnum } from "../models/transaction.model";

export const VALID_CATEGORIES = [
  "groceries",
  "dining",
  "transportation",
  "utilities",
  "entertainment",
  "shopping",
  "healthcare",
  "travel",
  "housing",
  "income",
  "investments",
  "other",
] as const;

export const receiptPrompt = `
You are the world-class Obsidian Vision Financial Extraction AI.
Analyze this receipt image (base64 encoded) and extract transaction details matching this exact JSON format:
{
  "title": "string",          // Clean merchant or store name (e.g. "Starbucks", "Blinkit", "DMart", "Shell Fuel Station")
  "amount": number,           // Final grand total paid (positive number, after taxes and discounts)
  "date": "YYYY-MM-DD",       // Transaction date in YYYY-MM-DD format. Default to today if date is unreadable
  "description": "string",    // Itemized summary or purchase overview (e.g. "Iced Latte, Croissant", max 60 words)
  "category": "string",       // Strictly one of: ${VALID_CATEGORIES.join(", ")}
  "type": "EXPENSE",          // Always "EXPENSE" for purchases
  "paymentMethod": "string",  // Strictly one of: ${Object.values(PaymentMethodEnum).join(", ")}
  "subtotal": 0,              // Pre-tax subtotal before discount/tax, or total if itemized subtotal not shown
  "tax": 0,                   // Total tax / GST / VAT if present, else 0
  "discount": 0,              // Discount amount if present, else 0
  "confidence": "HIGH",       // "HIGH" | "MEDIUM" | "LOW"
  "items": [                  // Extracted line items if visible
    { "name": "Item name", "quantity": 1, "price": 0 }
  ]
}

Extraction Guidelines:
1. "amount": Identify the final net payable total (look for labels like "Total", "Grand Total", "Net Amount", "Amount Due", "Paid", "Bill Total"). If multiple amounts appear (subtotal, CGST, SGST, service charge), pick the final grand total paid.
2. "title": Extract the official business/merchant name from the top header or logo. Normalize casual or legal suffixes (e.g., "Bundl Technologies" -> "Swiggy", "Jubilant FoodWorks" -> "Domino's Pizza").
3. "category": Map smartly based on items:
   - Supermarket, veggies, ration, milk -> "groceries"
   - Restaurants, cafes, food delivery, bakeries, coffee -> "dining"
   - Cabs, fuel, petrol, tolls, parking, flights, metro -> "transportation"
   - Electricity, water, broadband, mobile recharge -> "utilities"
   - Movies, streaming, events -> "entertainment"
   - Pharmacy, hospital, medicine, diagnostic tests -> "healthcare"
   - Clothes, shoes, electronics, personal accessories -> "shopping"
4. "paymentMethod": If receipt shows "UPI", "GPay", "PhonePe", "Paytm", "QR" -> "MOBILE_PAYMENT". If "Visa", "MasterCard", "RuPay", "POS", "Chip/Pin" -> "CARD". If "Cash" -> "CASH". If "ECS", "Mandate" -> "AUTO_DEBIT". Default to "CARD" if unspecified.
5. "items": Extract individual items with their prices whenever visible.
6. If the image is completely blank, corrupted, or not a financial receipt, output {}.

Example valid response:
{
  "title": "Starbucks Coffee",
  "amount": 420.00,
  "date": "2026-03-12",
  "description": "Caramel Macchiato, Blueberry Muffin",
  "category": "dining",
  "paymentMethod": "MOBILE_PAYMENT",
  "type": "EXPENSE",
  "subtotal": 400.00,
  "tax": 20.00,
  "discount": 0,
  "confidence": "HIGH",
  "items": [
    { "name": "Caramel Macchiato", "quantity": 1, "price": 280 },
    { "name": "Blueberry Muffin", "quantity": 1, "price": 140 }
  ]
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

  return `
  You are a smart, concise financial advisor.

Your job is to provide **exactly 3 short, helpful insights** based on the financial breakdown of the user's dataset. Keep them clear, concise, and easy to understand.

🧾 Report for: ${periodLabel}
- Total Income: ₹${totalIncome.toFixed(2)}
- Total Expenses: ₹${totalExpenses.toFixed(2)}
- Available Balance: ₹${availableBalance.toFixed(2)}
- Savings Rate: ${savingsRate}%

Top Expense Categories:
${categoryList}

📌 Guidelines:
- Keep each insight to one clear, concise sentence.
- Use only Indian Rupees (₹).
- Focus on key spending patterns, savings progress, and category trends.
- Format your response **exactly** like this:

["Insight 1", "Insight 2", "Insight 3"]

✅ Example:
[
   "Your savings rate is 42%, keeping you on track for healthy financial growth.",
   "Category 'Meals' was your largest expense, accounting for 32% of total spending.",
   "Total spending remained well within your income for this period."
]

⚠️ Rules:
- Refer to the timeframe as this period or explicitly "${periodLabel}". NEVER assume or state "monthly" unless the report is strictly a one-month duration.
- Output only a **JSON array of 3 strings**. Do not include any explanation, markdown, or notes.
  `.trim();
};
