"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { idbStorage } from "@/lib/idb-storage";
import { isPreviewSession } from "@/lib/preview";
import { previewState } from "@/lib/preview-data";
import type { CategoryKey, Expense, Group, ID, Person, Split, PendingInvite } from "@/lib/types";
import type { ServerState } from "@/lib/api";
import * as api from "@/lib/api";
import { avatarColor, uid } from "@/lib/utils";

interface AddExpenseInput {
  groupId: ID | null;
  description: string;
  amount: number;
  category: CategoryKey;
  paidBy: ID;
  splits: Split[];
  date?: string;
  notes?: string;
  recurring?: "none" | "monthly" | "weekly";
}

interface State {
  authReady: boolean;
  dataReady: boolean;
  loadError: boolean;
  currentUserId: ID | null;
  me: Person | null;
  people: Person[];
  groups: Group[];
  expenses: Expense[];
  removedFriends: string[];
  pendingInvites: PendingInvite[];

  setAuthReady: () => void;
  setLoadError: (v: boolean) => void;
  setUser: (uid: ID | null) => void;
  loadState: (state: ServerState) => void;
  signOut: () => void;
  refetch: () => Promise<void>;

  addExpense: (input: AddExpenseInput) => Expense;
  updateExpense: (id: ID, patch: Partial<Expense>) => void;
  deleteExpense: (id: ID) => void;

  addGroup: (input: { name: string; icon: string; color: string; memberIds: ID[] }) => Group;
  updateGroup: (id: ID, patch: Partial<Pick<Group, "name" | "icon" | "color" | "offlineIds">>) => void;
  deleteGroup: (id: ID) => void;

  settleUp: (input: { from: ID; to: ID; amount: number; groupId?: ID | null; note?: string }) => void;
  updateProfile: (patch: { name?: string; upiId?: string }) => void;
  deleteFriend: (id: ID) => Promise<{ ok: boolean; unsettled?: boolean; amount?: number }>;
}

let lastLoadHash = "";
const stateHash = (s: {
  people: unknown[];
  groups: unknown[];
  expenses: unknown[];
  removedFriends: unknown[];
  pendingInvites: unknown[];
}) => JSON.stringify([s.people, s.groups, s.expenses, s.removedFriends, s.pendingInvites]);

const now = () => new Date().toISOString();
const reconcile = (res: Response | null, get: () => State) => {
  if (!res || !res.ok) get().refetch();
};

export const useStore = create<State>()(
  persist(
    (set, get) => ({
  authReady: false,
  dataReady: false,
  loadError: false,
  currentUserId: typeof window !== "undefined" ? localStorage.getItem("tally_uid") : null,
  me: null,
  people: [],
  groups: [],
  expenses: [],
  removedFriends: [],
  pendingInvites: [],

  setAuthReady: () => set({ authReady: true }),
  setLoadError: (v) => set({ loadError: v }),
  setUser: (id) => {
    if (id && typeof window !== "undefined") localStorage.setItem("tally_uid", id);
    set({ currentUserId: id });
  },

  loadState: (state) => {
    lastLoadHash = stateHash(state);
    set({
      me: state.me,
      people: state.people,
      groups: state.groups,
      expenses: state.expenses,
      removedFriends: state.removedFriends ?? [],
      pendingInvites: state.pendingInvites ?? [],
      dataReady: true,
      loadError: false,
    });
  },

  signOut: () => {
    if (typeof window !== "undefined") localStorage.removeItem("tally_uid");
    set({
      currentUserId: null,
      me: null,
      people: [],
      groups: [],
      expenses: [],
      removedFriends: [],
      pendingInvites: [],
      dataReady: false,
      loadError: false,
    });
  },

  refetch: async () => {
    const data = await api.fetchState();
    if (!data || !data.me) return;
    if (stateHash(data) === lastLoadHash) return; // unchanged — skip the re-render
    get().loadState(data);
  },

  addExpense: (input) => {
    const meId = get().currentUserId ?? "";
    const e: Expense = {
      id: uid("e_"),
      groupId: input.groupId,
      description: input.description,
      amount: input.amount,
      category: input.category,
      paidBy: input.paidBy,
      splits: input.splits,
      date: input.date ?? now(),
      notes: input.notes,
      createdBy: meId,
      createdAt: now(),
      recurring: input.recurring ?? "none",
    };
    set((s) => ({ expenses: [e, ...s.expenses] }));
    api.addExpenseApi({ ...e }).then((res) => reconcile(res, get));
    return e;
  },

  updateExpense: (id, patch) => {
    set((s) => ({ expenses: s.expenses.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
    api.updateExpenseApi(id, { ...patch }).then((res) => reconcile(res, get));
  },

  deleteExpense: (id) => {
    set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) }));
    api.deleteExpenseApi(id).then((res) => reconcile(res, get));
  },

  addGroup: ({ name, icon, color, memberIds }) => {
    const meId = get().currentUserId ?? "";
    const people = get().people;
    const ids = [...new Set([meId, ...memberIds])];
    const members: Person[] = ids
      .map((id) => people.find((p) => p.id === id))
      .filter(Boolean)
      .map((p) => ({ ...(p as Person) }));
    const group: Group = { id: uid("g_"), name, icon, color, memberIds: ids, createdAt: now() };
    set((s) => ({ groups: [group, ...s.groups] }));
    api.addGroupApi({ id: group.id, name, icon, color, members }).then((res) => reconcile(res, get));
    return group;
  },

  updateGroup: (id, patch) => {
    set((s) => ({ groups: s.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)) }));
    api.updateGroupApi(id, { ...patch }).then((res) => reconcile(res, get));
  },

  deleteGroup: (id) => {
    set((s) => ({
      groups: s.groups.filter((g) => g.id !== id),
      expenses: s.expenses.filter((e) => e.groupId !== id),
    }));
    api.deleteGroupApi(id).then((res) => reconcile(res, get));
  },

  settleUp: ({ from, to, amount, groupId = null, note }) => {
    const meId = get().currentUserId ?? "";
    const e: Expense = {
      id: uid("e_"),
      groupId,
      description: note ?? "Settled up",
      amount,
      category: "other",
      paidBy: from,
      splits: [{ personId: to, amount }],
      date: now(),
      createdBy: meId,
      createdAt: now(),
      isSettlement: true,
    };
    set((s) => ({ expenses: [e, ...s.expenses] }));
    api.settleApi({ id: e.id, from, to, amount, groupId, note }).then((res) => reconcile(res, get));
  },

  updateProfile: (patch) => {
    const meId = get().currentUserId ?? "";
    set((s) => ({
      me: s.me ? { ...s.me, ...patch } : s.me,
      people: s.people.map((p) => (p.id === meId ? { ...p, ...patch } : p)),
    }));
    api.updateProfileApi({ ...patch }).then((res) => reconcile(res, get));
  },

  deleteFriend: async (id) => {
    const prev = get().removedFriends;
    // Optimistically hide them; the server has the final say on the balance gate.
    set({ removedFriends: [...new Set([...prev, id])] });
    const res = await api.deleteFriend(id);
    if (res.ok) get().refetch();
    else set({ removedFriends: prev });
    return res;
  },

}),
{
  name: "tally-storage",
  // v1: money tracking moved to Money Ledger. Older caches carry money data and
  // are dropped on load; the server is the source of truth, so the app refetches.
  version: 1,
  migrate: () => ({}) as State,
  storage: createJSONStorage(() => idbStorage),
  partialize: (state) => ({
    me: state.me,
    people: state.people,
    groups: state.groups,
    expenses: state.expenses,
    removedFriends: state.removedFriends,
    pendingInvites: state.pendingInvites,
  } as unknown as State),
  onRehydrateStorage: () => (state) => {
    if (state && state.me) {
      // If we successfully rehydrated and have a user, we are data ready!
      state.dataReady = true;
    }
  },
}
));

// Dev preview session: swap in sample data before the first render. The literal
// NODE_ENV check lets production builds drop this branch, and with it the
// otherwise-unused sample data.
if (process.env.NODE_ENV !== "production" && isPreviewSession()) {
  useStore.setState(previewState());
}

// Selectors
export const useMe = () => useStore((s) => s.me);
export const useMyId = () => useStore((s) => s.currentUserId);
export const usePerson = (id: ID | null | undefined) =>
  useStore((s) => (id ? s.people.find((p) => p.id === id) ?? null : null));

// avatarColor kept available for any local placeholder creation
export { avatarColor };
