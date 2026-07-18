"use client";

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
import { InstallPrompt } from "./install-prompt";
import { PushAutoEnable } from "./push-auto";
import { NotificationPrompt } from "./notification-prompt";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="mx-auto flex w-full max-w-[1440px]">
        <Sidebar />
        <main className="relative min-w-0 flex-1">
          <TopBar />
          <div className="mx-auto w-full max-w-[640px] px-4 pb-28 pt-4 md:max-w-3xl md:px-10 md:pb-16 md:pt-9">
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
      <InstallPrompt />
      <PushAutoEnable />
      <NotificationPrompt />
    </>
  );
}
