"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { idbStorage } from "@/lib/idb-storage";
import type { Account, Budget, CategoryKey, Emergency, Expense, FinanceEntry, FinanceType, Group, ID, Liability, Person, Recurring, Split, DebtPlanData, PendingInvite } from "@/lib/types";
import type { ServerState } from "@/lib/api";
import * as api from "@/lib/api";
import { duePeriods } from "@/lib/recurring";
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
  accountId?: ID;
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
  emergency: Emergency | null;
  debtPlan: DebtPlanData | null;
  recurrings: Recurring[];
  moneyMode: boolean | null;
  removedFriends: string[];
  pendingInvites: PendingInvite[];
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
  updateGroup: (id: ID, patch: Partial<Pick<Group, "name" | "icon" | "color" | "offlineIds">>) => void;
  deleteGroup: (id: ID) => void;

  settleUp: (input: { from: ID; to: ID; amount: number; groupId?: ID | null; note?: string; accountId?: ID }) => void;
  updateProfile: (patch: { name?: string; upiId?: string; moneyMode?: boolean }) => void;
  deleteFriend: (id: ID) => Promise<{ ok: boolean; unsettled?: boolean; amount?: number }>;

  addFinance: (input: { type: FinanceType; amount: number; category: string; date?: string; note?: string; accountId?: ID; transfer?: boolean; recurringId?: ID; linkedId?: ID }) => FinanceEntry;
  updateFinance: (id: ID, patch: Partial<FinanceEntry>) => void;
  deleteFinance: (id: ID) => void;

  setBudget: (patch: Partial<Budget>) => void;
  setWealth: (patch: { accounts?: Account[]; liabilities?: Liability[]; emergency?: Emergency | null; debtPlan?: DebtPlanData | null }) => void;
  confirmEmi: (id: ID, period: string, options?: { extraPayment?: number }) => Promise<api.ConfirmEmiResult>;
  declineEmi: (id: ID, period: string) => Promise<{ ok: boolean }>;
  setEmergency: (emergency: Emergency | null) => void;
  saveRecurring: (rule: Recurring) => void;
  deleteRecurring: (id: ID) => void;
  runRecurring: (id: ID) => void;
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
  removedFriends: unknown[];
  emergency: unknown;
  debtPlan: unknown;
  recurrings: unknown[];
  moneyMode: unknown;
  pendingInvites: unknown[];
}) => JSON.stringify([s.people, s.groups, s.expenses, s.finance, s.budget, s.accounts, s.liabilities, s.removedFriends, s.emergency, s.debtPlan, s.recurrings, s.moneyMode, s.pendingInvites]);

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
  finance: [],
  budget: { limits: {} },
  accounts: [],
  liabilities: [],
  emergency: null,
  debtPlan: null,
  recurrings: [],
  moneyMode: null,
  removedFriends: [],
  pendingInvites: [],
  lastDeleted: null,

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
      finance: state.finance,
      budget: state.budget,
      accounts: state.accounts,
      liabilities: state.liabilities,
      emergency: state.emergency ?? null,
      debtPlan: state.debtPlan ?? null,
      recurrings: state.recurrings ?? [],
      moneyMode: state.moneyMode ?? null,
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
      finance: [],
      budget: { limits: {} },
      accounts: [],
      liabilities: [],
      emergency: null,
      debtPlan: null,
      recurrings: [],
      moneyMode: null,
      removedFriends: [],
      pendingInvites: [],
      lastDeleted: null,
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
      accountId: input.accountId,
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

  settleUp: ({ from, to, amount, groupId = null, note, accountId }) => {
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
      accountId,
    };
    set((s) => ({ expenses: [e, ...s.expenses] }));
    api.settleApi({ id: e.id, from, to, amount, groupId, note, accountId }).then((res) => reconcile(res, get));
  },

  updateProfile: (patch) => {
    const meId = get().currentUserId ?? "";
    const { moneyMode, ...person } = patch;
    set((s) => ({
      me: s.me ? { ...s.me, ...person } : s.me,
      people: s.people.map((p) => (p.id === meId ? { ...p, ...person } : p)),
      moneyMode: moneyMode === undefined ? s.moneyMode : moneyMode,
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

    addFinance: ({ type, amount, category, date, note, accountId, transfer, recurringId, linkedId }) => {
    const e: FinanceEntry = {
      id: uid("f_"),
      type,
      amount,
      category,
      date: date ?? now(),
      note,
      createdAt: now(),
      accountId,
      transfer,
      recurringId,
      linkedId,
    };
    set((s) => ({ finance: [e, ...s.finance] }));
    api.addFinanceApi({ ...e }).then((res) => reconcile(res, get));
    return e;
  },

  updateFinance: (id, patch) => {
    set((s) => ({ finance: s.finance.map((f) => (f.id === id ? { ...f, ...patch } : f)) }));
    api.updateFinanceApi(id, { ...patch }).then((res) => reconcile(res, get));
  },

  deleteFinance: (id) => {
    const s = get();
    const entry = s.finance.find((f) => f.id === id);
    if (!entry) return;

    let toDelete = [id];
    if (entry.linkedId) {
      const linked = s.finance.filter(f => f.linkedId === entry.linkedId);
      toDelete = linked.map(f => f.id);
    }
    
    let liabilitiesPatch: typeof s.liabilities | undefined = undefined;
    
    const entriesToDelete = s.finance.filter(f => toDelete.includes(f.id));
    
    entriesToDelete.forEach(f => {
       if (f.type === "income" && f.accountId && f.transfer) {
          const card = s.liabilities.find(l => l.id === f.accountId && l.kind === "card");
          if (card) {
             if (!liabilitiesPatch) liabilitiesPatch = s.liabilities.map(l => ({ ...l }));
             const target = liabilitiesPatch.find(l => l.id === card.id);
             if (target) {
                 target.outstanding += f.amount;
             }
          }
       }
    });

    set((s) => ({ 
       finance: s.finance.filter((f) => !toDelete.includes(f.id)),
       ...(liabilitiesPatch ? { liabilities: liabilitiesPatch } : {})
    }));
    
    toDelete.forEach(did => api.deleteFinanceApi(did));
    if (liabilitiesPatch) {
      const body = {
        liabilities: liabilitiesPatch,
        expectedLiabilities: s.liabilities
      };
      api.setWealthApi(body).then(res => reconcile(res, get));
    }
  },

  setBudget: (patch) => {
    set((s) => ({ budget: { ...s.budget, ...patch } }));
    const next = get().budget;
    api.setBudgetApi({ monthly: next.monthly, limits: next.limits }).then((res) => reconcile(res, get));
  },

  setWealth: (patch) => {
    const previousLiabilities = get().liabilities;
    set((s) => ({ ...s, ...patch }));
    const s = get();
    const body: Record<string, unknown> = {};
    if (patch.accounts !== undefined) body.accounts = s.accounts;
    if (patch.liabilities !== undefined) {
      body.liabilities = s.liabilities;
      body.expectedLiabilities = previousLiabilities;
    }
    if (patch.emergency !== undefined) body.emergency = s.emergency;
    if (patch.debtPlan !== undefined) body.debtPlan = s.debtPlan;
    api.setWealthApi(body).then((res) => reconcile(res, get));
  },

  confirmEmi: async (id, period, options) => {
    const result = await api.confirmEmiApi(id, period, options);
    const liability = result.liability;
    if (result.ok && liability) {
      set((s) => ({
        liabilities: s.liabilities.map((l) => (l.id === id ? liability : l)),
      }));
    }
    return result;
  },

  declineEmi: async (id, period) => {
    return await api.declineEmiApi(id, period);
  },

  setEmergency: (emergency) => {
    set({ emergency });
    api.setWealthApi({ emergency }).then((res) => reconcile(res, get));
  },

  saveRecurring: (rule) => {
    set((s) => ({
      recurrings: s.recurrings.some((r) => r.id === rule.id)
        ? s.recurrings.map((r) => (r.id === rule.id ? rule : r))
        : [rule, ...s.recurrings],
    }));
    api.setRecurringApi({ recurrings: get().recurrings }).then((res) => reconcile(res, get));
  },

  deleteRecurring: (id) => {
    set((s) => ({ recurrings: s.recurrings.filter((r) => r.id !== id) }));
    api.setRecurringApi({ recurrings: get().recurrings }).then((res) => reconcile(res, get));
  },

  /**
   * Add everything a rule owes, right now. The nightly job does this on its own,
   * but running it here means a due entry shows up the moment you open the app
   * (and lets you add one early from the Repeats list).
   */
  runRecurring: (id) => {
    const rule = get().recurrings.find((r) => r.id === id);
    if (!rule) return;
    const due = duePeriods(rule);
    if (!due.length) return;

    for (const { date } of due) {
      get().addFinance({
        type: rule.type,
        amount: rule.amount,
        category: rule.category,
        date: date.toISOString(),
        note: rule.note,
        accountId: rule.accountId,
        recurringId: rule.id,
      });
    }
    get().saveRecurring({ ...rule, lastRun: due[due.length - 1].key });
  },
}),
{
  name: "tally-storage",
  storage: createJSONStorage(() => idbStorage),
  partialize: (state) => ({
    me: state.me,
    people: state.people,
    groups: state.groups,
    expenses: state.expenses,
    finance: state.finance,
    budget: state.budget,
    accounts: state.accounts,
    liabilities: state.liabilities,
    emergency: state.emergency,
    debtPlan: state.debtPlan,
    recurrings: state.recurrings,
    moneyMode: state.moneyMode,
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

// Selectors
export const useMe = () => useStore((s) => s.me);
export const useMyId = () => useStore((s) => s.currentUserId);
export const usePerson = (id: ID | null | undefined) =>
  useStore((s) => (id ? s.people.find((p) => p.id === id) ?? null : null));

// avatarColor kept available for any local placeholder creation
export { avatarColor };
