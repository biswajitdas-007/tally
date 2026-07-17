"use client";

import { create } from "zustand";
import type { FinanceType, ID } from "@/lib/types";

export interface SettleTarget {
  /** The person on the other side of the balance. */
  personId: ID;
  /** Net amount: positive ⇒ they owe you, negative ⇒ you owe them. */
  amount: number;
  groupId?: ID | null;
}

interface UIState {
  addOpen: boolean;
  addGroupId: ID | null;
  addEditId: ID | null;
  openAdd: (groupId?: ID | null) => void;
  openEdit: (expenseId: ID) => void;
  closeAdd: () => void;

  settle: SettleTarget | null;
  openSettle: (t: SettleTarget) => void;
  closeSettle: () => void;

  inviteOpen: boolean;
  inviteGroupId: ID | null;
  openInvite: (groupId?: ID | null) => void;
  closeInvite: () => void;

  groupOpen: boolean;
  openCreateGroup: () => void;
  closeCreateGroup: () => void;

  menuOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;

  moneyOpen: boolean;
  moneyType: FinanceType;
  moneyEditId: ID | null;
  openMoney: (type?: FinanceType, editId?: ID | null) => void;
  closeMoney: () => void;

  budgetOpen: boolean;
  openBudget: () => void;
  closeBudget: () => void;

  wealthOpen: boolean;
  wealthMode: "asset" | "liability";
  wealthEditId: ID | null;
  openWealth: (mode?: "asset" | "liability", editId?: ID | null) => void;
  closeWealth: () => void;

  parkOpen: boolean;
  openPark: () => void;
  closePark: () => void;
}

export const useUI = create<UIState>((set) => ({
  addOpen: false,
  addGroupId: null,
  addEditId: null,
  openAdd: (groupId = null) => set({ addOpen: true, addGroupId: groupId, addEditId: null }),
  openEdit: (expenseId) => set({ addOpen: true, addEditId: expenseId, addGroupId: null }),
  closeAdd: () => set({ addOpen: false, addEditId: null }),

  settle: null,
  openSettle: (t) => set({ settle: t }),
  closeSettle: () => set({ settle: null }),

  inviteOpen: false,
  inviteGroupId: null,
  openInvite: (groupId = null) => set({ inviteOpen: true, inviteGroupId: groupId }),
  closeInvite: () => set({ inviteOpen: false }),

  groupOpen: false,
  openCreateGroup: () => set({ groupOpen: true }),
  closeCreateGroup: () => set({ groupOpen: false }),

  menuOpen: false,
  openMenu: () => set({ menuOpen: true }),
  closeMenu: () => set({ menuOpen: false }),

  moneyOpen: false,
  moneyType: "expense",
  moneyEditId: null,
  openMoney: (type = "expense", editId = null) => set({ moneyOpen: true, moneyType: type, moneyEditId: editId }),
  closeMoney: () => set({ moneyOpen: false, moneyEditId: null }),

  budgetOpen: false,
  openBudget: () => set({ budgetOpen: true }),
  closeBudget: () => set({ budgetOpen: false }),

  wealthOpen: false,
  wealthMode: "asset",
  wealthEditId: null,
  openWealth: (mode = "asset", editId = null) => set({ wealthOpen: true, wealthMode: mode, wealthEditId: editId }),
  closeWealth: () => set({ wealthOpen: false, wealthEditId: null }),

  parkOpen: false,
  openPark: () => set({ parkOpen: true }),
  closePark: () => set({ parkOpen: false }),
}));
