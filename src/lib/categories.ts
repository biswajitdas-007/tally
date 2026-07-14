import {
  UtensilsCrossed,
  Home,
  Plane,
  ShoppingBag,
  ReceiptText,
  PartyPopper,
  HeartPulse,
  Shapes,
  type LucideIcon,
} from "lucide-react";
import type { CategoryKey } from "./types";

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
