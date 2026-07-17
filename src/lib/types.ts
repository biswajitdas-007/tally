export type ID = string;

export type SplitMode = "equal" | "exact" | "shares" | "percent";

export type CategoryKey =
  | "food"
  | "rent"
  | "travel"
  | "shopping"
  | "bills"
  | "fun"
  | "health"
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
  /** The recorder's private account this cash moved through (payer paid, or payee received). */
  accountId?: ID;
}

export interface Group {
  id: ID;
  name: string;
  icon: string;
  color: string;
  memberIds: ID[];
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
}

/** Private monthly budget: typical take-home (for 50/30/20) + optional caps. */
export interface Budget {
  income?: number;
  limits: Partial<Record<CategoryKey, number>>;
}

/* ---------- wealth (assets & liabilities) ---------- */

export type AccountKind = "bank" | "cash" | "wallet" | "investment";

/** Something you own — its current balance counts toward net worth. */
export interface Account {
  id: ID;
  name: string;
  kind: AccountKind;
  balance: number;
}

export type LiabilityKind = "loan" | "card" | "emi";

/** Something you owe — the outstanding amount reduces net worth. */
export interface Liability {
  id: ID;
  name: string;
  kind: LiabilityKind;
  outstanding: number;
  emi?: number; // monthly payment, for debt-to-income
  rate?: number; // annual interest %
  lender?: string; // who it's from (e.g. "HDFC Bank")
  termMonths?: number; // total duration
  remainingMonths?: number; // months left
  autoDebit?: boolean; // reduce automatically on the due date each month
  dueDay?: number; // day of month the payment goes out (1–28)
  nextDue?: string; // internal: ISO date of the next auto-debit to apply
}
