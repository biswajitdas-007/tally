"use client";

import { create } from "zustand";
import type { CategoryKey, Expense, Group, ID, Invite, Person, Split } from "@/lib/types";
import type { ServerState } from "@/lib/api";
import { ME_ID } from "@/lib/seed";
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

interface AuthProfile {
  name: string;
  email?: string;
  photoURL?: string;
  upiId?: string;
}

interface State {
  authReady: boolean;
  dataReady: boolean;
  currentUserId: ID | null;
  people: Person[];
  groups: Group[];
  expenses: Expense[];
  invites: Invite[];
  lastDeleted: Expense | null;

  setAuthReady: () => void;
  setDataReady: () => void;
  loadServerState: (data: ServerState) => void;
  signInReal: (profile: AuthProfile) => void;
  signOut: () => void;

  addPerson: (input: { name: string; email?: string; upiId?: string }) => Person;
  updatePerson: (id: ID, patch: Partial<Person>) => void;

  addGroup: (input: { name: string; icon: string; color: string; memberIds: ID[] }) => Group;
  updateGroup: (id: ID, patch: Partial<Group>) => void;
  deleteGroup: (id: ID) => void;

  addExpense: (input: AddExpenseInput) => Expense;
  updateExpense: (id: ID, patch: Partial<Expense>) => void;
  deleteExpense: (id: ID) => void;
  undoDelete: () => void;

  settleUp: (input: { from: ID; to: ID; amount: number; groupId?: ID | null; note?: string }) => void;
  invite: (email: string, groupId: ID | null) => Invite;
  mergeInvited: (payload: { group: Group; expenses: Expense[]; people: Person[] }) => void;

  resetAll: () => void;
}

export const useStore = create<State>()((set, get) => ({
  authReady: false,
  dataReady: false,
  currentUserId: null,
  people: [],
  groups: [],
  expenses: [],
  invites: [],
  lastDeleted: null,

  setAuthReady: () => set({ authReady: true }),
  setDataReady: () => set({ dataReady: true }),

  loadServerState: (data) =>
    set((s) => {
      const localMe = s.people.find((p) => p.id === ME_ID);
      let people = data.people ?? [];
      const idx = people.findIndex((p) => p.id === ME_ID);
      if (idx >= 0 && localMe) {
        // Keep the freshest profile fields from the current sign-in.
        people = people.map((p) =>
          p.id === ME_ID ? { ...p, name: localMe.name, email: localMe.email, photoURL: localMe.photoURL } : p,
        );
      } else if (idx < 0 && localMe) {
        people = [localMe, ...people];
      }
      return {
        people,
        groups: data.groups ?? [],
        expenses: data.expenses ?? [],
        invites: data.invites ?? [],
        dataReady: true,
      };
    }),

  signInReal: (profile) =>
    set((s) => {
      const me: Person = {
        id: ME_ID,
        name: profile.name || "You",
        email: profile.email,
        photoURL: profile.photoURL,
        upiId: profile.upiId ?? "",
        avatarColor: "#1c6b52",
        isYou: true,
      };
      const existing = s.people.find((p) => p.id === ME_ID);
      const people = existing
        ? s.people.map((p) =>
            p.id === ME_ID
              ? {
                  ...p,
                  name: profile.name || p.name,
                  email: profile.email ?? p.email,
                  photoURL: profile.photoURL,
                  upiId: profile.upiId ?? p.upiId,
                }
              : p,
          )
        : [me, ...s.people];
      return { people, currentUserId: ME_ID };
    }),

  signOut: () =>
    set({
      currentUserId: null,
      dataReady: false,
      people: [],
      groups: [],
      expenses: [],
      invites: [],
      lastDeleted: null,
    }),

  addPerson: ({ name, email, upiId }) => {
    const person: Person = {
      id: uid("p_"),
      name,
      email,
      upiId,
      avatarColor: avatarColor(name + (email ?? "")),
    };
    set((s) => ({ people: [...s.people, person] }));
    return person;
  },

  updatePerson: (id, patch) =>
    set((s) => ({ people: s.people.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),

  addGroup: ({ name, icon, color, memberIds }) => {
    const group: Group = {
      id: uid("g_"),
      name,
      icon,
      color,
      memberIds: Array.from(new Set([ME_ID, ...memberIds])),
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ groups: [group, ...s.groups] }));
    return group;
  },

  updateGroup: (id, patch) =>
    set((s) => ({ groups: s.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)) })),

  deleteGroup: (id) =>
    set((s) => ({
      groups: s.groups.filter((g) => g.id !== id),
      expenses: s.expenses.filter((e) => e.groupId !== id),
    })),

  addExpense: (input) => {
    const now = new Date().toISOString();
    const expense: Expense = {
      id: uid("e_"),
      groupId: input.groupId,
      description: input.description,
      amount: input.amount,
      category: input.category,
      paidBy: input.paidBy,
      splits: input.splits,
      date: input.date ?? now,
      notes: input.notes,
      createdBy: get().currentUserId ?? ME_ID,
      createdAt: now,
      recurring: input.recurring ?? "none",
    };
    set((s) => ({ expenses: [expense, ...s.expenses] }));
    return expense;
  },

  updateExpense: (id, patch) =>
    set((s) => ({ expenses: s.expenses.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),

  deleteExpense: (id) =>
    set((s) => {
      const target = s.expenses.find((e) => e.id === id) ?? null;
      return { expenses: s.expenses.filter((e) => e.id !== id), lastDeleted: target };
    }),

  undoDelete: () =>
    set((s) => (s.lastDeleted ? { expenses: [s.lastDeleted, ...s.expenses], lastDeleted: null } : {})),

  settleUp: ({ from, to, amount, groupId = null, note }) => {
    const now = new Date().toISOString();
    const expense: Expense = {
      id: uid("e_"),
      groupId,
      description: note ?? "Settled up",
      amount,
      category: "other",
      paidBy: from,
      splits: [{ personId: to, amount }],
      date: now,
      createdBy: get().currentUserId ?? ME_ID,
      createdAt: now,
      isSettlement: true,
    };
    set((s) => ({ expenses: [expense, ...s.expenses] }));
  },

  invite: (email, groupId) => {
    const name = email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const person: Person = { id: uid("p_"), name, email, avatarColor: avatarColor(email) };
    const invite: Invite = {
      id: uid("i_"),
      email,
      groupId,
      invitedBy: get().currentUserId ?? ME_ID,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    set((s) => ({
      people: [...s.people, person],
      invites: [invite, ...s.invites],
      groups: groupId
        ? s.groups.map((g) => (g.id === groupId ? { ...g, memberIds: [...g.memberIds, person.id] } : g))
        : s.groups,
    }));
    return invite;
  },

  mergeInvited: ({ group, expenses, people }) =>
    set((s) => {
      if (!group) return {};
      const hasGroup = s.groups.some((g) => g.id === group.id);
      const groups = hasGroup ? s.groups.map((g) => (g.id === group.id ? group : g)) : [group, ...s.groups];

      const existingExpenseIds = new Set(s.expenses.map((e) => e.id));
      const nextExpenses = [...expenses.filter((e) => !existingExpenseIds.has(e.id)), ...s.expenses];

      const byId = new Map(s.people.map((p) => [p.id, p]));
      for (const p of people) {
        if (p.id === ME_ID) continue; // never overwrite the current user
        byId.set(p.id, { ...byId.get(p.id), ...p });
      }
      return { groups, expenses: nextExpenses, people: Array.from(byId.values()) };
    }),

  resetAll: () =>
    set((s) => {
      const me = s.people.find((p) => p.id === ME_ID);
      return { people: me ? [me] : [], groups: [], expenses: [], invites: [], lastDeleted: null };
    }),
}));

// Convenience selectors
export const useMe = () => useStore((s) => s.people.find((p) => p.id === s.currentUserId) ?? null);
export const usePerson = (id: ID | null | undefined) =>
  useStore((s) => (id ? s.people.find((p) => p.id === id) ?? null : null));
