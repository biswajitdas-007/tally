import {
  UtensilsCrossed,
  Home,
  Plane,
  ShoppingBag,
  ReceiptText,
  PartyPopper,
  HeartPulse,
  Shapes,
  Wallet,
  Gift,
  TrendingUp,
  Undo2,
  HandCoins,
  Coins,
  Landmark,
  Banknote,
  Smartphone,
  LineChart,
  CreditCard,
  CalendarClock,
  type LucideIcon,
} from "lucide-react";
import type { AccountKind, CategoryKey, IncomeCategory, LiabilityKind } from "./types";

export interface CategoryMeta {
  key: CategoryKey;
  label: string;
  icon: LucideIcon;
  color: string; // css var reference
}

export const CATEGORIES: Record<CategoryKey, CategoryMeta> = {
  food: { key: "food", label: "Food & Drink", icon: UtensilsCrossed, color: "var(--cat-food)" },
  rent: { key: "rent", label: "Rent & Home", icon: Home, color: "var(--cat-rent)" },
  travel: { key: "travel", label: "Travel", icon: Plane, color: "var(--cat-travel)" },
  shopping: { key: "shopping", label: "Shopping", icon: ShoppingBag, color: "var(--cat-shopping)" },
  bills: { key: "bills", label: "Bills & Utilities", icon: ReceiptText, color: "var(--cat-bills)" },
  fun: { key: "fun", label: "Entertainment", icon: PartyPopper, color: "var(--cat-fun)" },
  health: { key: "health", label: "Health", icon: HeartPulse, color: "var(--cat-health)" },
  other: { key: "other", label: "Other", icon: Shapes, color: "var(--cat-other)" },
};

export const CATEGORY_LIST = Object.values(CATEGORIES);

export interface IncomeMeta {
  key: IncomeCategory;
  label: string;
  icon: LucideIcon;
}

export const INCOME_CATEGORIES: Record<IncomeCategory, IncomeMeta> = {
  salary: { key: "salary", label: "Salary", icon: Wallet },
  bonus: { key: "bonus", label: "Bonus", icon: HandCoins },
  investment: { key: "investment", label: "Investment", icon: TrendingUp },
  refund: { key: "refund", label: "Refund", icon: Undo2 },
  gift: { key: "gift", label: "Gift", icon: Gift },
  other: { key: "other", label: "Other", icon: Coins },
};

export const INCOME_LIST = Object.values(INCOME_CATEGORIES);

export const ACCOUNT_KIND_META: Record<AccountKind, { label: string; icon: LucideIcon }> = {
  bank: { label: "Bank", icon: Landmark },
  cash: { label: "Cash", icon: Banknote },
  wallet: { label: "Wallet", icon: Smartphone },
  investment: { label: "Investment", icon: LineChart },
};

export const LIABILITY_KIND_META: Record<LiabilityKind, { label: string; icon: LucideIcon }> = {
  loan: { label: "Loan", icon: HandCoins },
  card: { label: "Credit card", icon: CreditCard },
  emi: { label: "EMI", icon: CalendarClock },
};

export const ACCOUNT_KINDS = Object.keys(ACCOUNT_KIND_META) as AccountKind[];
export const LIABILITY_KINDS = Object.keys(LIABILITY_KIND_META) as LiabilityKind[];
