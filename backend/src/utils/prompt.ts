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
You are the world-class Obsidian Vision Financial Extraction AI, specialized in extracting structured data from retail receipts, supermarket bills, restaurant checks, digital invoices, and fuel slips.

Analyze this receipt and output STRICTLY a JSON object with this exact schema:
{
  "title": "string",          // Clean human merchant/brand name (e.g., "Starbucks", "Blinkit", "DMart", "Domino's Pizza", "Shell")
  "amount": number,           // Final net grand total payable after all taxes, fees, and discounts (positive number)
  "date": "YYYY-MM-DD",       // Receipt transaction date. If missing or illegible, use current date
  "description": "string",    // Itemized overview or summary (max 60 words, e.g. "2x Cappuccino, 1x Almond Croissant")
  "category": "string",       // Strictly one of: ${VALID_CATEGORIES.join(", ")}
  "type": "EXPENSE",          // Always "EXPENSE"
  "paymentMethod": "string",  // Strictly one of: ${Object.values(PaymentMethodEnum).join(", ")}
  "subtotal": 0,              // Pre-tax subtotal before taxes/discounts, or total if itemized breakdown is absent
  "tax": 0,                   // Total tax / GST (CGST + SGST + IGST) / VAT / service tax if present, else 0
  "discount": 0,              // Total discount / coupon / promo savings if present, else 0
  "currency": "INR",          // Currency code: INR, USD, EUR, GBP, AED, etc.
  "confidence": "HIGH",       // "HIGH" | "MEDIUM" | "LOW"
  "items": [                  // Visible line items
    { "name": "Item name", "quantity": 1, "price": 0.00 }
  ]
}

Rigorous Extraction Guidelines:
1. "amount" (Grand Total):
   - Always find the FINAL NET AMOUNT paid/due (look for "Grand Total", "Total Payable", "Net Amount", "Invoice Value", "Balance Due", "Paid Amount", "Bill Total").
   - Do NOT confuse pre-tax Subtotal, Total Savings, or GST amount with the final Grand Total.
   - If the receipt shows a faint or missing decimal dot (e.g. items sum to 250.00 but total prints as 25000), interpret the correct decimal value.
2. "title" (Brand Normalization):
   - Extract the prominent consumer brand name rather than legal corporate entities (e.g., "Bundl Technologies" -> "Swiggy", "Jubilant FoodWorks" -> "Domino's Pizza", "Avenue Supermarts" -> "DMart", "Rebel Foods" -> "Faasos / Behrouz", "Hardcastle / Westlife" -> "McDonald's", "Devyani / Sapphire" -> "KFC").
3. "tax" & "subtotal":
   - If CGST and SGST are listed separately (e.g., CGST 2.5% = ₹15, SGST 2.5% = ₹15), combine them into total tax (₹30).
   - If subtotal is not printed, subtotal = amount - tax + discount.
4. "category":
   - Groceries/Supermarket/Veggies/Daily Needs -> "groceries"
   - Cafes/Restaurants/Food delivery/Bakeries/Pubs -> "dining"
   - Fuel/Petrol/Cabs/Uber/Ola/Tolls/Parking/Metro/Flights -> "transportation"
   - Broadband/Electricity/Water/Mobile Bills -> "utilities"
   - Movies/Streaming/Gaming/Events -> "entertainment"
   - Pharmacy/Hospitals/Clinics/Diagnostic tests -> "healthcare"
   - Apparel/Footwear/Electronics/General retail -> "shopping"
5. "paymentMethod":
   - "UPI", "GPay", "PhonePe", "Paytm", "QR", "BHIM" -> "MOBILE_PAYMENT"
   - "Visa", "MasterCard", "RuPay", "Amex", "POS", "Card" -> "CARD"
   - "Cash", "Cash Tendered" -> "CASH"
   - "Auto-Debit", "NACH", "ECS" -> "AUTO_DEBIT"
   - Default to "CARD" if unspecified.
6. Line items:
   - Extract distinct items with unit price and quantity if printed. If quantities are missing, default to 1.
7. Return {} if the image is blank, corrupted, or completely unreadable.
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
