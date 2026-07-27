"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import { TopBar } from "./top-bar";
import { MenuDrawer } from "./menu-drawer";
import { AddExpenseSheet } from "@/components/features/add-expense-sheet";
import { AddMoneySheet } from "@/components/features/add-money-sheet";
import { ExpenseDetailSheet } from "@/components/features/expense-detail-sheet";
import { BudgetSheet } from "@/components/features/budget-sheet";
import { WealthSheet } from "@/components/features/wealth-sheet";
import { AccountDetailSheet } from "@/components/features/account-detail-sheet";
import { ParkSheet } from "@/components/features/park-sheet";
import { EmiConfirm } from "@/components/features/emi-confirm";
import { SettleSheet } from "@/components/features/settle-sheet";
import { InviteDialog } from "@/components/features/invite-dialog";
import { CreateGroupSheet } from "@/components/features/create-group-sheet";
import { SupportSheet } from "@/components/features/support-sheet";
import { EmergencySheet } from "@/components/features/emergency-sheet";
import { InvestmentSheet } from "@/components/features/investment-sheet";
import { InstallPrompt } from "./install-prompt";
import { PushAutoEnable } from "./push-auto";
import { NotificationPrompt } from "./notification-prompt";

/**
 * Routes that reflow into two columns on wide screens (see PageGrid) and so
 * earn the extra width. Everything else is a single list or form, which stays
 * readable at a narrower measure.
 */
const WIDE_ROUTES = new Set(["/", "/money", "/wealth", "/groups", "/analytics"]);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const wide = WIDE_ROUTES.has(pathname);

  return (
    <>
      {/* Full-bleed shell so the sidebar sits flush against the window edge —
          only the content column is capped and centred. */}
      <div className="flex w-full">
        <Sidebar />
        <main className="relative min-w-0 flex-1">
          <TopBar />
          <div
            className={cn(
              "mx-auto w-full max-w-[640px] px-4 pb-28 pt-4 md:max-w-3xl md:px-10 md:pb-16 md:pt-9",
              wide && "xl:max-w-[1180px] 2xl:max-w-[1360px]",
            )}
          >
            {children}
          </div>
        </main>
      </div>

      <BottomNav />
      <MenuDrawer />

      {/* Global surfaces */}
      <AddExpenseSheet />
      <AddMoneySheet />
      <ExpenseDetailSheet />
      <BudgetSheet />
      <WealthSheet />
      <AccountDetailSheet />
      <ParkSheet />
      <EmiConfirm />
      <SettleSheet />
      <InviteDialog />
      <CreateGroupSheet />
      <SupportSheet />
      <EmergencySheet />
      <InvestmentSheet />
      <InstallPrompt />
      <PushAutoEnable />
      <NotificationPrompt />
    </>
  );
}
