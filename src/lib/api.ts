import { firebaseAuth } from "@/lib/firebase";
import { socketId } from "@/lib/pusher-client";
import type { Expense, Group, Person } from "@/lib/types";

export interface ServerState {
  me: Person | null;
  people: Person[];
  groups: Group[];
  expenses: Expense[];
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
}): Promise<{ ok: boolean; sent: boolean; link: string } | null> {
  const res = await req("POST", "/api/invite", input);
  return res?.ok ? await res.json() : null;
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
