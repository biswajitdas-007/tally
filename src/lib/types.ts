export type ID = string;

export type SplitMode = "equal" | "exact" | "shares" | "percent";

export type CategoryKey =
  | "food"
  | "rent"
  | "travel"
  | "shopping"
  | "grocery"
  | "bills"
  | "fun"
  | "health"
  | "alcohol"
  | "other";

export interface Person {
  id: ID;
  name: string;
  email?: string;
  upiId?: string;
  avatarColor?: string;
  photoURL?: string;
  isYou?: boolean;
  /** Invited but hasn't signed in yet — no Firebase uid. */
  pending?: boolean;
}

export interface Split {
  personId: ID;
  amount: number;
}

export interface Expense {
  id: ID;
  groupId: ID | null;
  description: string;
  amount: number;
  category: CategoryKey;
  paidBy: ID;
  splits: Split[];
  date: string;
  notes?: string;
  createdBy: ID;
  createdAt: string;
  isSettlement?: boolean;
  recurring?: "none" | "monthly" | "weekly";
  /** Period already repeated ("YYYY-MM" monthly, "YYYY-MM-DD" weekly) — guards against repeating twice. */
  recurringLast?: string;
  /** The recorder's private account this cash moved through (payer paid, or payee received). */
  accountId?: ID;
}

export interface Group {
  id: ID;
  name: string;
  icon: string;
  color: string;
  memberIds: ID[];
  offlineIds?: ID[];
  createdAt: string;
  archived?: boolean;
}

export type InviteStatus = "pending" | "accepted";

export interface Invite {
  id: ID;
  email: string;
  groupId: ID | null;
  invitedBy: ID;
  status: InviteStatus;
  createdAt: string;
}

/** Net balance between you and another person (positive = they owe you). */
export interface Balance {
  personId: ID;
  amount: number;
}

/* ---------- personal money (Tally Money) ---------- */

export type FinanceType = "income" | "expense";

export type IncomeCategory = "salary" | "bonus" | "investment" | "refund" | "gift" | "other";

/** A private personal money entry — money in (income) or out (a solo expense). */
export interface FinanceEntry {
  id: ID;
  type: FinanceType;
  amount: number;
  /** CategoryKey for an expense, IncomeCategory for income. */
  category: string;
  date: string;
  note?: string;
  createdAt: string;
  /** Account this money moved through — income adds to it, expense subtracts. */
  accountId?: ID;
  /** True for internal "park" transfers — affects account balances, not your income/spend. */
  transfer?: boolean;
  /** Set when a recurring rule put this entry in, so we can badge it. */
  recurringId?: ID;
}

export type RecurFreq = "monthly" | "weekly";

/**
 * A rule that puts a money entry in on a schedule — salary, rent, a
 * subscription. It generates ordinary FinanceEntries; the rule itself is never
 * counted, only what it creates.
 */
export interface Recurring {
  id: ID;
  type: FinanceType;
  amount: number;
  /** CategoryKey for an expense, IncomeCategory for income. */
  category: string;
  note?: string;
  accountId?: ID;
  freq: RecurFreq;
  /** Monthly: day of month (1–28). Weekly: weekday, 0 = Sunday. */
  day: number;
  /** Add it automatically, or just remind you it's due. */
  auto: boolean;
  /** Period already generated ("YYYY-MM" monthly, "YYYY-MM-DD" weekly). */
  lastRun?: string;
  paused?: boolean;
  createdAt: string;
}

/** Private monthly budget: typical take-home (for 50/30/20) + optional caps. */
export interface Budget {
  /** Total monthly spending limit the user chooses (not income-derived). */
  monthly?: number;
  /** Optional per-category caps. */
  limits: Partial<Record<CategoryKey, number>>;
  /** @deprecated legacy 50/30/20 income — no longer used; kept for migration. */
  income?: number;
}

/* ---------- wealth (assets & liabilities) ---------- */

export type AccountKind = "bank" | "cash" | "wallet" | "investment";

/** Kinds of holding under an investment account — SIPs, stocks, FDs and so on. */
export type InvestmentType =
  | "sip"
  | "mutualFund"
  | "stocks"
  | "fd"
  | "bonds"
  | "ppf"
  | "gold"
  | "crypto"
  | "other";

/** Something you own — its current balance counts toward net worth. */
export interface Account {
  id: ID;
  name: string;
  kind: AccountKind;
  balance: number;
  /** For kind === "investment": what sort of holding this is. */
  investmentType?: InvestmentType;
  /** For investments: how much you've put in, so we can show returns. Optional. */
  invested?: number;
  /** When you last confirmed this balance against the real account (ISO date). */
  reconciledAt?: string;
}

/**
 * The user's emergency fund: a target amount they choose, optionally held in a
 * specific account. Coverage is that account's balance when linked, else total
 * liquid savings. Never auto-counted from savings — the user sets it up.
 */
export interface Emergency {
  target: number;
  accountId?: ID;
}

export type LiabilityKind = "loan" | "card" | "emi";

/** Something you owe — the outstanding amount reduces net worth. */
export interface Liability {
  id: ID;
  name: string;
  kind: LiabilityKind;
  outstanding: number;
  /** For credit cards: the card limit used for utilization. */
  limit?: number;
  emi?: number; // monthly payment, for debt-to-income
  rate?: number; // annual interest %
  lender?: string; // who it's from (e.g. "HDFC Bank")
  termMonths?: number; // total number of EMIs
  emisPaid?: number; // how many EMIs are paid so far (counts up)
  autoDebit?: boolean; // increment automatically each month on the due date
  statementDay?: number; // day of month the bill is generated (1-28)
  dueDay?: number; // day of month the EMI is paid (1–28; defaults to 3)
  lastPaidMonth?: string; // "YYYY-MM" already counted — guards against double-counting
  lastEmiReminder?: string; // "<liability-id>:YYYY-MM:<upcoming|due>" — dedupes scheduled push notices
  lastEmiReminderDate?: string; // ISO date of when the last reminder was sent (for smart backoff)
  foreclosed?: boolean; // user marked this loan as foreclosed (manually paid off)
  lastExtraPaidMonth?: string; // "YYYY-MM" when they last made an extra payment
}

export type Strategy = "snowball" | "avalanche";

export interface DebtPlanData {
  strategy: Strategy;
  extra: number;
  specificExtra: Record<ID, number>;
}

export interface PendingInvite {
  id: string;
  email: string;
  groupId: ID | null;
  groupName: string | null;
  createdAt: string;
}
