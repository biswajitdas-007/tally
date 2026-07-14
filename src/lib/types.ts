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
