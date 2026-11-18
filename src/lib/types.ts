export type ID = string;

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

/* ---------- schedules ---------- *
 * Repeating split expenses reuse the money-entry schedule shape to compute
 * which periods are due (see lib/recurring.ts).
 */

export type FinanceType = "income" | "expense";

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

export interface PendingInvite {
  id: string;
  email: string;
  groupId: ID | null;
  groupName: string | null;
  createdAt: string;
}
