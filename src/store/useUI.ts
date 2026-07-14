"use client";

import { create } from "zustand";
import type { ID } from "@/lib/types";

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
}));
