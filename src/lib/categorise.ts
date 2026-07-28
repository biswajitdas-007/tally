import type { CategoryKey, FinanceType } from "./types";

/**
 * Guess a category from free text. The first set of rules is aimed at bank
 * narration — Indian statements are full of `UPI/`, `NEFT`, `IMPS` prefixes
 * with the merchant buried inside — the rest match how people describe an
 * expense themselves.
 */
const EXPENSE_RULES: [RegExp, CategoryKey][] = [
  [/rent|deposit|maintenance|society|landlord|flat|brokerage/i, "rent"],
  [
    /grocer|bigbasket|blinkit|zepto|instamart|dmart|reliance fresh|more retail|swiggy|zomato|dominos|pizza|mcdonald|kfc|starbucks|cafe|coffee|chai|restaurant|dhaba|biryani|bakery|dinner|lunch|breakfast|food|hotel de|eatery/i,
    "food",
  ],
  [
    /uber|ola|rapido|cab|taxi|irctc|indigo|spicejet|air ?india|vistara|akasa|flight|train|railway|bus|redbus|fuel|petrol|diesel|hpcl|bpcl|iocl|indian oil|shell|toll|fastag|parking|metro|airbnb|oyo|makemytrip|goibibo|yatra|travel|trip/i,
    "travel",
  ],
  [
    /amazon|flipkart|myntra|ajio|meesho|nykaa|tatacliq|snapdeal|decathlon|ikea|lifestyle|pantaloons|westside|shopping|store|mart\b/i,
    "shopping",
  ],
  [
    /electric|bses|torrent power|adani elec|water bill|gas|indane|hp gas|broadband|jio|airtel|vi\b|vodafone|bsnl|act fibernet|hathway|wifi|internet|dth|tata sky|recharge|postpaid|prepaid|bill ?pay|bbps|insurance|premium|lic\b/i,
    "bills",
  ],
  [
    /netflix|prime video|hotstar|jiocinema|sonyliv|zee5|spotify|gaana|wynk|youtube premium|bookmyshow|pvr|inox|cinema|movie|game|steam|playstation|xbox|club|bar\b|pub\b|liquor|wine/i,
    "fun",
  ],
  [
    /pharmacy|apollo|medplus|netmeds|1mg|pharmeasy|hospital|clinic|doctor|dental|diagnostic|lab\b|medic|health|gym|fitness|cult\.?fit/i,
    "health",
  ],
];

const INCOME_RULES: [RegExp, string][] = [
  [/salary|payroll|sal cr|monthly pay|wages|stipend/i, "salary"],
  [/bonus|incentive|commission|arrear/i, "bonus"],
  [/interest|dividend|maturity|redemption|mutual fund|sip refund|zerodha|groww|upstox/i, "investment"],
  [/refund|reversal|cashback|returned|failed txn/i, "refund"],
  [/gift/i, "gift"],
];

/**
 * Category for a piece of text. Income and expenses use different category
 * sets, so the type decides which rules apply.
 */
export function guessCategory(text: string, type: FinanceType = "expense"): string {
  if (!text) return type === "income" ? "other" : "other";
  if (type === "income") {
    for (const [re, cat] of INCOME_RULES) if (re.test(text)) return cat;
    return "other";
  }
  for (const [re, cat] of EXPENSE_RULES) if (re.test(text)) return cat;
  return "other";
}

/** Expense-only variant, for the add-expense sheet's live guess. */
export function guessExpenseCategory(text: string): CategoryKey | null {
  for (const [re, cat] of EXPENSE_RULES) if (re.test(text)) return cat;
  return null;
}
