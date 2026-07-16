import { Home, NotebookText, Contact, ChartPie, Activity, User, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/groups", label: "Ledgers", icon: NotebookText },
  { href: "/friends", label: "Friends", icon: Contact },
  { href: "/analytics", label: "Insights", icon: ChartPie },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/account", label: "Account", icon: User },
];

/** Bottom-nav shows 4 items with the FAB in the middle. */
export const BOTTOM_NAV: NavItem[] = NAV_ITEMS.filter((i) =>
  ["/", "/groups", "/analytics", "/activity"].includes(i.href),
);
