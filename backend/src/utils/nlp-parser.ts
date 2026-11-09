import {
  TransactionTypeEnum,
  PaymentMethodEnum,
} from "../models/transaction.model";

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
];

/**
 * Universal Multi-format Date Parser for Global & Indian Bank Statements and Receipts
 * Supports: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, 2-digit years (15/01/26), DD-MMM-YYYY (24-OCT-26, 01-Mar-2026), YYYY-MM-DD
 */
export const parseBankDate = (raw: string | undefined): Date => {
  if (!raw) return new Date();
  const trimmed = String(raw).trim();

  // 1. DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY or 2-digit year DD/MM/YY
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) year += 2000;
    const d = new Date(Date.UTC(year, month, day));
    if (!isNaN(d.getTime())) return d;
  }

  // 2. DD-MMM-YYYY or DD/MMM/YYYY or DD-MMM-YY e.g. 15-Jan-2026, 24/OCT/26
  const monthNames: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11
  };
  const dMmmYMatch = trimmed.match(/^(\d{1,2})[-/. ]([A-Za-z]{3,4})[-/. ](\d{2,4})$/);
  if (dMmmYMatch) {
    const day = parseInt(dMmmYMatch[1], 10);
    const mStr = dMmmYMatch[2].toLowerCase();
    const month = monthNames[mStr];
    let year = parseInt(dMmmYMatch[3], 10);
    if (year < 100) year += 2000;
    if (month !== undefined) {
      const d = new Date(Date.UTC(year, month, day));
      if (!isNaN(d.getTime())) return d;
    }
  }

  // 3. YYYY-MM-DD
  const ymdMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const d = new Date(Date.UTC(year, month, day));
    if (!isNaN(d.getTime())) return d;
  }

  const fallback = new Date(trimmed);
  return isNaN(fallback.getTime()) ? new Date() : fallback;
};

// Number words dictionary for English and Hindi / Hinglish
const NUMBER_WORDS_MAP: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
  thousand: 1000,
  lakh: 100000,
  lakhs: 100000,
  lac: 100000,
  lacs: 100000,
  crore: 10000000,
  crores: 10000000,
  cr: 10000000,
  // Hindi numbers
  ek: 1,
  do: 2,
  teen: 3,
  char: 4,
  chaar: 4,
  paanch: 5,
  panch: 5,
  chhe: 6,
  che: 6,
  saat: 7,
  aath: 8,
  ath: 8,
  nau: 9,
  das: 10,
  gyarah: 11,
  barah: 12,
  terah: 13,
  chaudah: 14,
  pandrah: 15,
  solah: 16,
  satrah: 17,
  atharah: 18,
  unnis: 19,
  bees: 20,
  tees: 30,
  chalis: 40,
  chaliss: 40,
  pachas: 50,
  saath: 60,
  sath: 60,
  sattar: 70,
  assi: 80,
  nabbe: 90,
  navve: 90,
  sau: 100,
  hazaar: 1000,
  hazar: 1000,
};

/**
 * Parses spoken number words (e.g. "five hundred", "two thousand five hundred", "twenty five thousand")
 */
export const parseWordsToNumber = (text: string): number | null => {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  let total = 0;
  let current = 0;
  let found = false;

  for (const w of words) {
    if (NUMBER_WORDS_MAP[w] !== undefined) {
      found = true;
      const val = NUMBER_WORDS_MAP[w];
      if (val === 100 || val === 1000 || val === 100000 || val === 10000000) {
        if (current === 0) current = 1;
        if (val === 100) {
          current *= 100;
        } else {
          current *= val;
          total += current;
          current = 0;
        }
      } else {
        current += val;
      }
    }
  }
  total += current;
  return found && total > 0 ? total : null;
};

/**
 * Universal Indian & Global Currency Expression Parser
 */
export const parseIndianCurrencyExpression = (text: string): number | null => {
  const clean = text.toLowerCase().replace(/,/g, "");

  // 1. Dedicated Hindi / Hinglish colloquial composite phrases
  if (/\bdedh\s*sau\b/i.test(clean)) return 150;
  if (/\bdh?ai\s*sau\b/i.test(clean)) return 250;
  if (/\bdedh\s*(?:hazaar|hazar|k)\b/i.test(clean)) return 1500;
  if (/\bdh?ai\s*(?:hazaar|hazar|k)\b/i.test(clean)) return 2500;
  if (/\bdedh\s*(?:lakh|lac|l)\b/i.test(clean)) return 150000;
  if (/\bdh?ai\s*(?:lakh|lac|l)\b/i.test(clean)) return 250000;

  // 2. Crores e.g. "1.5 crore", "2 cr"
  const crMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:crores?|cr\b)/i);
  if (crMatch) {
    return Math.round(parseFloat(crMatch[1]) * 10000000);
  }

  // 3. Lakhs e.g. "1.5 lakh", "2.5 lakh", "1 lac", "3L"
  const lakhMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:lakhs?|lacs?|lac\b|l\b)/i);
  if (lakhMatch) {
    return Math.round(parseFloat(lakhMatch[1]) * 100000);
  }

  // 4. Thousands / K / Hazaar e.g. "25k", "50 k", "10 hazaar", "5 thousand"
  const kMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:k\b|kilo\b|thousands?|hazaar|hazar)/i);
  if (kMatch) {
    return Math.round(parseFloat(kMatch[1]) * 1000);
  }

  // 5. Hundreds / Sau e.g. "500 bucks", "5 sau"
  const sauMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:sau\b)/i);
  if (sauMatch) {
    return Math.round(parseFloat(sauMatch[1]) * 100);
  }

  // 6. Explicit currency with symbols or currency units
  const explicitCurrencyMatch = clean.match(
    /(?:₹|rs\.?|inr|\$)\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:rupees?|rupaye|rs\.?|bucks|inr)\b/i
  );
  if (explicitCurrencyMatch) {
    const rawVal = explicitCurrencyMatch[1] || explicitCurrencyMatch[2];
    const val = parseFloat(rawVal);
    if (!isNaN(val) && val > 0) return val;
  }

  // 7. Contextual numbers preceded by financial verbs or prepositions
  const actionMatch = clean.match(
    /\b(?:add|log|record|put|track|spent|spend|paid|pay|bought|buy|cost|gave|got|received|earned|credited|debited|for|of|amount|worth|at|cap|limit|to|around|about|almost|nearly)\s+(?:₹|rs\.?)?\s*(\d+(?:\.\d+)?)\b/i
  );
  if (actionMatch && actionMatch[1]) {
    const val = parseFloat(actionMatch[1]);
    if (!isNaN(val) && val > 0 && !(val >= 2020 && val <= 2030 && !clean.includes("₹") && !clean.includes("rs"))) {
      return val;
    }
  }

  // 8. Number followed by preposition or indicator: "500 for lunch", "250 on coffee", "1200 in groceries"
  const numPrepMatch = clean.match(/\b(\d+(?:\.\d+)?)\s+(?:for|on|in|towards|at|via|by)\b/i);
  if (numPrepMatch && numPrepMatch[1]) {
    const val = parseFloat(numPrepMatch[1]);
    if (!isNaN(val) && val > 0 && !(val >= 2020 && val <= 2030)) {
      return val;
    }
  }

  // 9. Merchant or Category followed by bare number (e.g. "swiggy 350", "petrol 500", "coffee 150", "auto 80")
  const merchantWords =
    "swiggy|zomato|uber|ola|rapido|zepto|blinkit|starbucks|chai|tea|coffee|cafe|biryani|pizza|burger|snack|petrol|diesel|fuel|gas|cng|amazon|flipkart|netflix|spotify|recharge|dawai|medicine|pharmacy|doctor|hospital|clinic|lunch|dinner|breakfast|food|groceries|vegetables|fruits|milk|bread|gym|fitness|rent|maintenance|wifi|broadband|electricity|bill|utility|movie|cinema|tickets|flight|travel|train|metro|bus|auto|cab|taxi|shopping|clothes|shoes|books|haircut";

  const merchantFollowed = clean.match(
    new RegExp(`\\b(?:${merchantWords})\\s+(?:for\\s+|of\\s+|worth\\s+)?(?:₹|rs\\.?)?\\s*(\\d+(?:\\.\\d+)?)\\b`, "i")
  );
  if (merchantFollowed && merchantFollowed[1]) {
    const val = parseFloat(merchantFollowed[1]);
    if (!isNaN(val) && val > 0 && !(val >= 2020 && val <= 2030)) return val;
  }

  const merchantPreceded = clean.match(
    new RegExp(`\\b(?:₹|rs\\.?)?\\s*(\\d+(?:\\.\\d+)?)\\s*(?:for|on|in|towards)?\\s+(?:${merchantWords})\\b`, "i")
  );
  if (merchantPreceded && merchantPreceded[1]) {
    const val = parseFloat(merchantPreceded[1]);
    if (!isNaN(val) && val > 0 && !(val >= 2020 && val <= 2030)) return val;
  }

  // 10. Word-based numbers: "spent five hundred on lunch", "two thousand for rent", "fifty bucks"
  const wordNum = parseWordsToNumber(clean);
  if (wordNum !== null && wordNum > 0) {
    return wordNum;
  }

  // 11. Generic bare number in transaction context
  const genericNum = clean.match(/\b(\d+(?:\.\d+)?)\b/);
  if (genericNum && genericNum[1]) {
    const val = parseFloat(genericNum[1]);
    if (!isNaN(val) && val > 0 && !(val >= 2020 && val <= 2030)) {
      return val;
    }
  }

  return null;
};

/**
 * Detect Indian Ecosystem Merchants, Colloquialisms, Categories & Clean Title
 */
export const detectIndianMerchantAndCategory = (
  rawText: string
): { title: string; category: string; paymentMethod: PaymentMethodEnum; type: TransactionTypeEnum } => {
  const lower = rawText.toLowerCase();

  // Income & Transfers
  if (
    /\b(salary|stipend|freelance|bonus|dividend|cashback|interest|mom sent|dad sent|father sent|friend returned|client paid|earned|got paid|received|credited|incoming|payout|reimbursement|side hustle)\b/i.test(
      lower
    )
  ) {
    let title = "Income";
    if (/\bsalary\b/i.test(lower)) title = "Salary";
    else if (/\bstipend\b/i.test(lower)) title = "Stipend";
    else if (/\bfreelance\b/i.test(lower)) title = "Freelance Payout";
    else if (/\b(mom|dad|father)\s*sent\b/i.test(lower)) title = "Family Transfer";
    else if (/\bcashback\b/i.test(lower)) title = "Cashback Reward";
    else if (/\bbonus\b/i.test(lower)) title = "Performance Bonus";
    else if (/\bdividend\b/i.test(lower)) title = "Dividend Payout";
    else if (/\breimbursement\b/i.test(lower)) title = "Expense Reimbursement";
    return {
      title,
      category: "income",
      paymentMethod: PaymentMethodEnum.BANK_TRANSFER,
      type: TransactionTypeEnum.INCOME,
    };
  }

  // Food & Dining
  if (
    /\b(swiggy|zomato|behrouz|biryani|chai|tea|sutta|coffee|starbucks|mcdonald|domino|pizza|burger|kfc|subway|haldiram|sagar ratna|dhaba|bhojanalaya|barbeque nation|restaurant|cafe|dinner|lunch|breakfast|food|eating|eats|nasta|nashta|chaat|snack|snacks|ice cream|pastry|bakery|dosa|idli|thali|beer|drinks|pub|bar|chaayos|third wave|blue tokai)\b/i.test(
      lower
    )
  ) {
    let title = "Dining";
    if (/\bswiggy\b/i.test(lower)) title = "Swiggy";
    else if (/\bzomato\b/i.test(lower)) title = "Zomato";
    else if (/\bbehrouz\b/i.test(lower)) title = "Behrouz Biryani";
    else if (/\bstarbucks\b/i.test(lower)) title = "Starbucks";
    else if (/\bchai|tea\b/i.test(lower)) title = "Chai / Tea";
    else if (/\bcoffee|cafe\b/i.test(lower)) title = "Coffee";
    else if (/\bbiryani\b/i.test(lower)) title = "Biryani";
    else if (/\bpizza\b/i.test(lower)) title = "Pizza";
    else if (/\bburger\b/i.test(lower)) title = "Burger";
    else if (/\blunch\b/i.test(lower)) title = "Lunch";
    else if (/\bdinner\b/i.test(lower)) title = "Dinner";
    else if (/\bbreakfast|nasta|nashta\b/i.test(lower)) title = "Breakfast";
    else if (/\bbarbeque nation\b/i.test(lower)) title = "Barbeque Nation";
    return {
      title,
      category: "dining",
      paymentMethod: /\bcash\b/i.test(lower) ? PaymentMethodEnum.CASH : PaymentMethodEnum.CARD,
      type: TransactionTypeEnum.EXPENSE,
    };
  }

  // Groceries & Essentials
  if (
    /\b(zepto|blinkit|instamart|bigbasket|dmart|kirana|ration|milk|amul|mother dairy|groceries|grocery|supermarket|vegetables|sabzi|fruits|bread|eggs?|meat|chicken|fish|dal|rice|oil)\b/i.test(
      lower
    )
  ) {
    let title = "Groceries";
    if (/\bzepto\b/i.test(lower)) title = "Zepto";
    else if (/\bblinkit\b/i.test(lower)) title = "Blinkit";
    else if (/\binstamart\b/i.test(lower)) title = "Swiggy Instamart";
    else if (/\bbigbasket\b/i.test(lower)) title = "BigBasket";
    else if (/\bdmart\b/i.test(lower)) title = "DMart";
    else if (/\bmilk|amul\b/i.test(lower)) title = "Milk & Dairy";
    else if (/\bvegetables|sabzi|fruits\b/i.test(lower)) title = "Vegetables & Fruits";
    return {
      title,
      category: "groceries",
      paymentMethod: PaymentMethodEnum.CARD,
      type: TransactionTypeEnum.EXPENSE,
    };
  }

  // Housing & Rent
  if (/\b(rent|flat rent|house rent|room rent|landlord|maintenance charges|society maintenance|brokerage)\b/i.test(lower)) {
    let title = "House Rent";
    if (/\bmaintenance\b/i.test(lower)) title = "Society Maintenance";
    return {
      title,
      category: "housing",
      paymentMethod: PaymentMethodEnum.BANK_TRANSFER,
      type: TransactionTypeEnum.EXPENSE,
    };
  }

  // Transportation & Fuel
  if (
    /\b(uber|ola|rapido|auto|rickshaw|metro|petrol|diesel|fuel|shell|hpcl|bpcl|indianoil|fastag|toll|parking|train|irctc|flight|cab|taxi|bus|blusmart|commute|cng)\b/i.test(
      lower
    )
  ) {
    let title = "Transportation";
    if (/\buber\b/i.test(lower)) title = "Uber";
    else if (/\bola\b/i.test(lower)) title = "Ola";
    else if (/\brapido\b/i.test(lower)) title = "Rapido";
    else if (/\bpetrol|diesel|fuel|shell|hpcl|bpcl|cng\b/i.test(lower)) title = "Fuel Station";
    else if (/\bmetro\b/i.test(lower)) title = "Metro Rail";
    else if (/\bauto|rickshaw\b/i.test(lower)) title = "Auto Rickshaw";
    else if (/\bflight|indigo|air india|vistara\b/i.test(lower)) title = "Flight Ticket";
    else if (/\btrain|irctc\b/i.test(lower)) title = "Train Ticket";
    return {
      title,
      category: "transportation",
      paymentMethod: PaymentMethodEnum.CARD,
      type: TransactionTypeEnum.EXPENSE,
    };
  }

  // Shopping & E-Commerce
  if (/\b(amazon|flipkart|myntra|meesho|ajio|nykaa|zara|h&m|hnm|uniqlo|shopping|mall|clothes|shoes|sneakers|shirt|dress|jeans|electronics|gadget|watch)\b/i.test(lower)) {
    let title = "Shopping";
    if (/\bamazon\b/i.test(lower)) title = "Amazon";
    else if (/\bflipkart\b/i.test(lower)) title = "Flipkart";
    else if (/\bmyntra\b/i.test(lower)) title = "Myntra";
    else if (/\bshoes|sneakers\b/i.test(lower)) title = "Shoes / Footwear";
    else if (/\bclothes|shirt|dress|jeans\b/i.test(lower)) title = "Clothing";
    return {
      title,
      category: "shopping",
      paymentMethod: PaymentMethodEnum.CARD,
      type: TransactionTypeEnum.EXPENSE,
    };
  }

  // Utilities & Recharges
  if (/\b(recharge|jio|airtel|vi|bsnl|electricity|bijli|power|water|gas|cylinder|indane|wifi|broadband|bill|tata play|dth)\b/i.test(lower)) {
    let title = "Utility Bill";
    if (/\bjio\b/i.test(lower)) title = "Jio Recharge";
    else if (/\bairtel\b/i.test(lower)) title = "Airtel Recharge";
    else if (/\belectricity|bijli|power\b/i.test(lower)) title = "Electricity Bill";
    else if (/\bwifi|broadband\b/i.test(lower)) title = "Internet & WiFi Bill";
    else if (/\bgas|cylinder|indane\b/i.test(lower)) title = "Gas Bill";
    return {
      title,
      category: "utilities",
      paymentMethod: PaymentMethodEnum.CARD,
      type: TransactionTypeEnum.EXPENSE,
    };
  }

  // Entertainment
  if (/\b(netflix|spotify|hotstar|youtube|prime|cinema|movie|pvr|inox|bookmyshow|theatre|concert|gaming|steam|game)\b/i.test(lower)) {
    let title = "Entertainment";
    if (/\bnetflix\b/i.test(lower)) title = "Netflix";
    else if (/\bspotify\b/i.test(lower)) title = "Spotify";
    else if (/\bhotstar\b/i.test(lower)) title = "Hotstar / JioCinema";
    else if (/\bmovie|cinema|pvr|inox|bookmyshow\b/i.test(lower)) title = "Movie Tickets";
    return {
      title,
      category: "entertainment",
      paymentMethod: PaymentMethodEnum.CARD,
      type: TransactionTypeEnum.EXPENSE,
    };
  }

  // Healthcare
  if (/\b(apollo|pharmacy|medicine|dawai|1mg|pharmeasy|hospital|doctor|clinic|dentist|test|lab)\b/i.test(lower)) {
    let title = "Healthcare";
    if (/\bmedicine|dawai|pharmacy\b/i.test(lower)) title = "Pharmacy / Medicines";
    else if (/\bdoctor|clinic\b/i.test(lower)) title = "Doctor Consultation";
    return {
      title,
      category: "healthcare",
      paymentMethod: PaymentMethodEnum.CARD,
      type: TransactionTypeEnum.EXPENSE,
    };
  }

  // Investments
  if (/\b(zerodha|groww|upstox|mutual fund|sip|stocks|shares|etf|equity|bonds?|gold|crypto|fd|fixed deposit)\b/i.test(lower)) {
    let title = "Investment";
    if (/\bsip|mutual fund\b/i.test(lower)) title = "Mutual Fund SIP";
    else if (/\bstocks|shares\b/i.test(lower)) title = "Stock Market Investment";
    return {
      title,
      category: "investments",
      paymentMethod: PaymentMethodEnum.BANK_TRANSFER,
      type: TransactionTypeEnum.EXPENSE,
    };
  }

  // Generic extraction of title from remaining meaningful words
  const cleaned = lower
    .replace(
      /\b(spent|spend|paid|pay|bought|buy|ordered|cost|gave|got|received|credited|debited|earned|transferred|added|add|record|log|entry|expense|income|yesterday|today|last|night|morning|evening|afternoon|please|can|you|for|on|in|towards|at|via|with|bucks|rs|rupees|rupaye|inr|thousand|hundred|lakh|crore)\b/gi,
      ""
    )
    .replace(/[0-9₹$,.]/g, "")
    .trim();

  const words = cleaned.split(/\s+/).filter((w) => w.length > 2);
  if (words.length > 0) {
    const title = words
      .slice(0, 3)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    return {
      title,
      category: "other",
      paymentMethod: PaymentMethodEnum.CARD,
      type: TransactionTypeEnum.EXPENSE,
    };
  }

  return {
    title: "Expense",
    category: "other",
    paymentMethod: PaymentMethodEnum.CARD,
    type: TransactionTypeEnum.EXPENSE,
  };
};

