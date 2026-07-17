import { Home, NotebookText, Wallet, Contact, ChartPie, Activity, User, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/groups", label: "Ledgers", icon: NotebookText },
  { href: "/money", label: "Money", icon: Wallet },
  { href: "/friends", label: "Friends", icon: Contact },
  { href: "/analytics", label: "Insights", icon: ChartPie },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/account", label: "Account", icon: User },
];

/** Bottom-nav shows 4 items with the FAB in the middle; the rest live in the menu. */
export const BOTTOM_NAV: NavItem[] = NAV_ITEMS.filter((i) =>
  ["/", "/groups", "/money", "/analytics"].includes(i.href),
);
