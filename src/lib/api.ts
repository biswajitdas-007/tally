import { firebaseAuth } from "@/lib/firebase";
import type { Expense, Group, Invite, Person } from "@/lib/types";

export interface ServerState {
  people: Person[];
  groups: Group[];
  expenses: Expense[];
  invites: Invite[];
}

async function idToken(): Promise<string | null> {
  const user = firebaseAuth()?.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch {
    return null;
  }
}

export async function fetchState(): Promise<ServerState | null> {
  const token = await idToken();
  if (!token) return null;
  try {
    const res = await fetch("/api/state", {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as ServerState;
  } catch {
    return null;
  }
}

export async function saveState(state: ServerState, opts?: { keepalive?: boolean }): Promise<void> {
  const token = await idToken();
  if (!token) return;
  try {
    await fetch("/api/state", {
      method: "PUT",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(state),
      keepalive: opts?.keepalive,
    });
  } catch {
    /* best-effort; a later change will retry the save */
  }
}
