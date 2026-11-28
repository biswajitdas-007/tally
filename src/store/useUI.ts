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
  /** Bumped on every open, so the form starts fresh each time (it's keyed by it). */
  addSession: number;
  openAdd: (groupId?: ID | null) => void;
  openEdit: (expenseId: ID) => void;
  closeAdd: () => void;

  settle: SettleTarget | null;
  openSettle: (t: SettleTarget) => void;
  closeSettle: () => void;

  detailId: ID | null;
  openDetail: (id: ID) => void;
  closeDetail: () => void;

  inviteOpen: boolean;
  inviteGroupId: ID | null;
  openInvite: (groupId?: ID | null) => void;
  closeInvite: () => void;

  groupOpen: boolean;
  openCreateGroup: () => void;
  closeCreateGroup: () => void;

  groupSettingsId: ID | null;
  openGroupSettings: (id: ID) => void;
  closeGroupSettings: () => void;

  deleteGroupId: ID | null;
  openDeleteGroup: (id: ID) => void;
  closeDeleteGroup: () => void;

  menuOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;

  supportOpen: boolean;
  openSupport: () => void;
  closeSupport: () => void;

  whoOwesWhomOpen: boolean;
  openWhoOwesWhom: () => void;
  closeWhoOwesWhom: () => void;

}

export const useUI = create<UIState>((set) => ({
  addOpen: false,
  addGroupId: null,
  addEditId: null,
  addSession: 0,
  openAdd: (groupId = null) =>
    set((s) => ({ addOpen: true, addGroupId: groupId, addEditId: null, addSession: s.addSession + 1 })),
  openEdit: (expenseId) =>
    set((s) => ({ addOpen: true, addEditId: expenseId, addGroupId: null, addSession: s.addSession + 1 })),
  closeAdd: () => set({ addOpen: false, addEditId: null }),

  settle: null,
  openSettle: (t) => set({ settle: t }),
  closeSettle: () => set({ settle: null }),

  detailId: null,
  openDetail: (id) => set({ detailId: id }),
  closeDetail: () => set({ detailId: null }),

  inviteOpen: false,
  inviteGroupId: null,
  openInvite: (groupId = null) => set({ inviteOpen: true, inviteGroupId: groupId }),
  closeInvite: () => set({ inviteOpen: false }),

  groupOpen: false,
  openCreateGroup: () => set({ groupOpen: true }),
  closeCreateGroup: () => set({ groupOpen: false }),

  groupSettingsId: null,
  openGroupSettings: (id) => set({ groupSettingsId: id }),
  closeGroupSettings: () => set({ groupSettingsId: null }),

  deleteGroupId: null,
  openDeleteGroup: (id) => set({ deleteGroupId: id }),
  closeDeleteGroup: () => set({ deleteGroupId: null }),

  menuOpen: false,
  openMenu: () => set({ menuOpen: true }),
  closeMenu: () => set({ menuOpen: false }),

  supportOpen: false,
  openSupport: () => set({ supportOpen: true }),
  closeSupport: () => set({ supportOpen: false }),

  whoOwesWhomOpen: false,
  openWhoOwesWhom: () => set({ whoOwesWhomOpen: true }),
  closeWhoOwesWhom: () => set({ whoOwesWhomOpen: false }),
}));
