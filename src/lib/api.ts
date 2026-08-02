import { firebaseAuth } from "@/lib/firebase";
import { socketId } from "@/lib/pusher-client";
import type { Account, Budget, Emergency, Expense, FinanceEntry, Group, Liability, Person, Recurring } from "@/lib/types";

export interface ServerState {
  me: Person | null;
  people: Person[];
  groups: Group[];
  expenses: Expense[];
  finance: FinanceEntry[];
  budget: Budget;
  accounts: Account[];
  liabilities: Liability[];
  emergency: Emergency | null;
  recurrings: Recurring[];
  moneyMode: boolean | null;
  removedFriends: string[];
}

async function token(): Promise<string | null> {
  const user = firebaseAuth()?.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch {
    return null;
  }
}

async function req(method: string, path: string, body?: Record<string, unknown>): Promise<Response | null> {
  const t = await token();
  if (!t) return null;
  try {
    return await fetch(path, {
      method,
      cache: "no-store",
      headers: { authorization: `Bearer ${t}`, ...(body ? { "content-type": "application/json" } : {}) },
      body: body ? JSON.stringify({ ...body, socketId: socketId() }) : undefined,
    });
  } catch {
    return null;
  }
}

export async function fetchState(): Promise<ServerState | null> {
  const t = await token();
  if (!t) return null;
  try {
    const res = await fetch("/api/state", { headers: { authorization: `Bearer ${t}` }, cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as ServerState;
  } catch {
    return null;
  }
}

export const addExpenseApi = (e: Record<string, unknown>) => req("POST", "/api/expenses", e);
export const updateExpenseApi = (id: string, patch: Record<string, unknown>) => req("PATCH", `/api/expenses/${id}`, patch);
export const deleteExpenseApi = (id: string) => req("DELETE", `/api/expenses/${id}`);
export const settleApi = (s: Record<string, unknown>) => req("POST", "/api/settle", s);
export const addGroupApi = (g: Record<string, unknown>) => req("POST", "/api/groups", g);
export const updateGroupApi = (id: string, patch: Record<string, unknown>) => req("PATCH", `/api/groups/${id}`, patch);
export const deleteGroupApi = (id: string) => req("DELETE", `/api/groups/${id}`);
export const updateProfileApi = (p: Record<string, unknown>) => req("POST", "/api/profile", p);
export const addFinanceApi = (f: Record<string, unknown>) => req("POST", "/api/finance", f);
export const updateFinanceApi = (id: string, patch: Record<string, unknown>) => req("PATCH", `/api/finance/${id}`, patch);
export const deleteFinanceApi = (id: string) => req("DELETE", `/api/finance/${id}`);
export const setBudgetApi = (b: Record<string, unknown>) => req("POST", "/api/budget", b);
export const setWealthApi = (w: Record<string, unknown>) => req("POST", "/api/wealth", w);
export const setRecurringApi = (r: Record<string, unknown>) => req("POST", "/api/recurring", r);

export interface ConfirmEmiResult {
  ok: boolean;
  liability?: Liability;
  applied: string[];
  alreadyHandled?: boolean;
  error?: string;
}

export async function confirmEmiApi(id: string, period: string): Promise<ConfirmEmiResult> {
  const res = await req("POST", `/api/liabilities/${encodeURIComponent(id)}/confirm`, { period });
  if (!res) return { ok: false, applied: [], error: "network-error" };

  const body = (await res.json().catch(() => ({}))) as Partial<ConfirmEmiResult>;
  if (!res.ok || !body.liability || body.liability.id !== id) {
    return { ok: false, applied: [], error: body.error ?? "confirm-failed" };
  }
  return {
    ok: true,
    liability: body.liability,
    applied: Array.isArray(body.applied) ? body.applied.filter((p): p is string => typeof p === "string") : [],
    alreadyHandled: body.alreadyHandled === true,
  };
}

export async function deleteAccount(): Promise<{ ok: boolean; unsettled?: boolean; people?: number; amount?: number }> {
  const res = await req("DELETE", "/api/account");
  if (!res) return { ok: false };
  if (res.ok) return { ok: true };
  if (res.status === 409) {
    const b = (await res.json().catch(() => ({}))) as { people?: number; amount?: number };
    return { ok: false, unsettled: true, people: b.people, amount: b.amount };
  }
  return { ok: false };
}
export const subscribePushApi = (subscription: unknown) => req("POST", "/api/push/subscribe", { subscription });
export const unsubscribePushApi = (endpoint: string) => req("POST", "/api/push/unsubscribe", { endpoint });

/* ---------- invites ---------- */

export interface InviteInfo {
  inviterName: string;
  groupName: string | null;
  groupIcon: string | null;
  hasGroup: boolean;
  status: string;
}

export async function sendInvite(input: {
  email: string;
  inviteId: string;
  groupId: string | null;
  groupName?: string;
  groupIcon?: string;
  inviterName?: string;
}): Promise<{
  ok: boolean;
  sent?: boolean;
  link?: string;
  alreadyFriend?: boolean;
  self?: boolean;
  name?: string;
} | null> {
  const res = await req("POST", "/api/invite", input);
  return res?.ok ? await res.json() : null;
}

export async function deleteFriend(
  id: string,
): Promise<{ ok: boolean; unsettled?: boolean; amount?: number }> {
  const res = await req("DELETE", `/api/friends/${encodeURIComponent(id)}`);
  if (!res) return { ok: false };
  if (res.ok) return { ok: true };
  if (res.status === 409) {
    const body = (await res.json().catch(() => ({}))) as { amount?: number };
    return { ok: false, unsettled: true, amount: body.amount };
  }
  return { ok: false };
}

export async function fetchInvite(id: string): Promise<InviteInfo | null> {
  try {
    const res = await fetch(`/api/invite/${id}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as InviteInfo;
  } catch {
    return null;
  }
}

export async function acceptInvite(id: string): Promise<{ ok: boolean; self?: boolean; groupId?: string | null } | null> {
  const res = await req("POST", `/api/invite/${id}/accept`, {});
  return res?.ok ? await res.json() : null;
}
