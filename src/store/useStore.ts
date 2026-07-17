"use client";

import { create } from "zustand";
import type { Account, Budget, CategoryKey, Expense, FinanceEntry, FinanceType, Group, ID, Liability, Person, Split } from "@/lib/types";
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
  finance: FinanceEntry[];
  budget: Budget;
  accounts: Account[];
  liabilities: Liability[];
  lastDeleted: Expense | null;

  setAuthReady: () => void;
  setLoadError: (v: boolean) => void;
  setUser: (uid: ID | null) => void;
  loadState: (state: ServerState) => void;
  signOut: () => void;
  refetch: () => Promise<void>;

  addExpense: (input: AddExpenseInput) => Expense;
  updateExpense: (id: ID, patch: Partial<Expense>) => void;
  deleteExpense: (id: ID) => void;
  undoDelete: () => void;

  addGroup: (input: { name: string; icon: string; color: string; memberIds: ID[] }) => Group;
  updateGroup: (id: ID, patch: Partial<Pick<Group, "name" | "icon" | "color">>) => void;
  deleteGroup: (id: ID) => void;

  settleUp: (input: { from: ID; to: ID; amount: number; groupId?: ID | null; note?: string }) => void;
  updateProfile: (patch: { name?: string; upiId?: string }) => void;

  addFinance: (input: { type: FinanceType; amount: number; category: string; date?: string; note?: string }) => void;
  updateFinance: (id: ID, patch: Partial<FinanceEntry>) => void;
  deleteFinance: (id: ID) => void;

  setBudget: (patch: Partial<Budget>) => void;
  setWealth: (patch: { accounts?: Account[]; liabilities?: Liability[] }) => void;
}

let lastLoadHash = "";
const stateHash = (s: {
  people: unknown[];
  groups: unknown[];
  expenses: unknown[];
  finance: unknown[];
  budget: unknown;
  accounts: unknown[];
  liabilities: unknown[];
}) => JSON.stringify([s.people, s.groups, s.expenses, s.finance, s.budget, s.accounts, s.liabilities]);

const now = () => new Date().toISOString();
const reconcile = (res: Response | null, get: () => State) => {
  if (!res || !res.ok) get().refetch();
};

export const useStore = create<State>()((set, get) => ({
  authReady: false,
  dataReady: false,
  loadError: false,
  currentUserId: null,
  me: null,
  people: [],
  groups: [],
  expenses: [],
  finance: [],
  budget: { limits: {} },
  accounts: [],
  liabilities: [],
  lastDeleted: null,

  setAuthReady: () => set({ authReady: true }),
  setLoadError: (v) => set({ loadError: v }),
  setUser: (id) => set({ currentUserId: id }),

  loadState: (state) => {
    lastLoadHash = stateHash(state);
    set({
      me: state.me,
      people: state.people,
      groups: state.groups,
      expenses: state.expenses,
      finance: state.finance,
      budget: state.budget,
      accounts: state.accounts,
      liabilities: state.liabilities,
      dataReady: true,
      loadError: false,
    });
  },

  signOut: () =>
    set({
      currentUserId: null,
      me: null,
      people: [],
      groups: [],
      expenses: [],
      finance: [],
      budget: { limits: {} },
      accounts: [],
      liabilities: [],
      lastDeleted: null,
      dataReady: false,
      loadError: false,
    }),

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
    const target = get().expenses.find((e) => e.id === id) ?? null;
    set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id), lastDeleted: target }));
    api.deleteExpenseApi(id).then((res) => reconcile(res, get));
  },

  undoDelete: () => {
    const d = get().lastDeleted;
    if (!d) return;
    set((s) => ({ expenses: [d, ...s.expenses], lastDeleted: null }));
    api.addExpenseApi({ ...d }).then((res) => reconcile(res, get));
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

  addFinance: ({ type, amount, category, date, note }) => {
    const e: FinanceEntry = {
      id: uid("f_"),
      type,
      amount,
      category,
      date: date ?? now(),
      note,
      createdAt: now(),
    };
    set((s) => ({ finance: [e, ...s.finance] }));
    api.addFinanceApi({ ...e }).then((res) => reconcile(res, get));
  },

  updateFinance: (id, patch) => {
    set((s) => ({ finance: s.finance.map((f) => (f.id === id ? { ...f, ...patch } : f)) }));
    api.updateFinanceApi(id, { ...patch }).then((res) => reconcile(res, get));
  },

  deleteFinance: (id) => {
    set((s) => ({ finance: s.finance.filter((f) => f.id !== id) }));
    api.deleteFinanceApi(id).then((res) => reconcile(res, get));
  },

  setBudget: (patch) => {
    set((s) => ({ budget: { ...s.budget, ...patch } }));
    const next = get().budget;
    api.setBudgetApi({ income: next.income, limits: next.limits }).then((res) => reconcile(res, get));
  },

  setWealth: (patch) => {
    set((s) => ({
      accounts: patch.accounts ?? s.accounts,
      liabilities: patch.liabilities ?? s.liabilities,
    }));
    const s = get();
    api.setWealthApi({ accounts: s.accounts, liabilities: s.liabilities }).then((res) => reconcile(res, get));
  },
}));

// Selectors
export const useMe = () => useStore((s) => s.me);
export const useMyId = () => useStore((s) => s.currentUserId);
export const usePerson = (id: ID | null | undefined) =>
  useStore((s) => (id ? s.people.find((p) => p.id === id) ?? null : null));

// avatarColor kept available for any local placeholder creation
export { avatarColor };
