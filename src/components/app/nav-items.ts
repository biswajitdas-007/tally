import { Home, Users, ChartPie, Activity, User, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/groups", label: "Groups", icon: Users },
  { href: "/analytics", label: "Insights", icon: ChartPie },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/account", label: "Account", icon: User },
];

/** Bottom-nav shows 4 items with the FAB in the middle. */
export const BOTTOM_NAV: NavItem[] = [
  NAV_ITEMS[0],
  NAV_ITEMS[1],
  NAV_ITEMS[2],
  NAV_ITEMS[3],
];
