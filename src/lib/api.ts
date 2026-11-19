import { firebaseAuth } from "@/lib/firebase";
import { socketId } from "@/lib/pusher-client";
import type { Expense, Group, Person, PendingInvite } from "@/lib/types";
import { enqueueSyncRequest } from "./sync-queue";

export interface ServerState {
  me: Person | null;
  people: Person[];
  groups: Group[];
  expenses: Expense[];
  removedFriends: string[];
  pendingInvites: PendingInvite[];
}

export async function token(): Promise<string | null> {
  const user = firebaseAuth()?.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch {
    return null;
  }
}

/**
 * Writes the UI applies optimistically and can safely replay later. Anything
 * else — deleting the account, removing a friend, invites — must fail honestly
 * when offline rather than pretend to succeed.
 */
const QUEUEABLE = /^\/api\/(expenses|settle|groups|profile)(\/|$)/;

const replayable = (method: string, path: string) => method !== "GET" && QUEUEABLE.test(path);

/** Queues a replayable write made offline and answers as if it went through, so the optimistic update stays. */
async function queueOffline(method: string, path: string, body?: Record<string, unknown>): Promise<Response | null> {
  if (!replayable(method, path)) return null;
  await enqueueSyncRequest({ method, path, body, uid: firebaseAuth()?.currentUser?.uid });
  return new Response(JSON.stringify({ ok: true, queued: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function req(method: string, path: string, body?: Record<string, unknown>): Promise<Response | null> {
  const t = await token();
  if (!t) return null;
  try {
    const res = await fetch(path, {
      method,
      cache: "no-store",
      headers: { authorization: `Bearer ${t}`, ...(body ? { "content-type": "application/json" } : {}) },
      body: body ? JSON.stringify({ ...body, socketId: socketId() }) : undefined,
    });
    // A 5xx is a server problem, not being offline — only network failures are queued.
    return res;
  } catch {
    return queueOffline(method, path, body);
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
  email?: string;
  inviteId: string;
  groupId: string | null;
  groupName?: string;
  groupIcon?: string;
  inviterName?: string;
  isGeneric?: boolean;
}): Promise<{
  ok: boolean;
  sent?: boolean;
  link?: string;
  alreadyFriend?: boolean;
  self?: boolean;
  name?: string;
  duplicate?: boolean;
  existingId?: string;
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

export const resendInviteApi = (id: string) => req("POST", `/api/invite/${encodeURIComponent(id)}/resend`);
