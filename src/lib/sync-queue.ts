import { get, update } from "idb-keyval";

export interface SyncRequest {
  id: string; // Unique ID for the queue item
  method: string;
  path: string;
  body?: Record<string, unknown>;
  timestamp: number;
  /** Who made the change. Replayed only with that user's token. */
  uid?: string;
}

const QUEUE_KEY = "tally_sync_queue";

export async function getSyncQueue(): Promise<SyncRequest[]> {
  try {
    const queue = await get<SyncRequest[]>(QUEUE_KEY);
    return queue || [];
  } catch {
    return [];
  }
}

// `update` reads and writes in one IndexedDB transaction, so two writes queued
// at the same moment (e.g. settling several ledgers offline) can't drop each other.
export async function enqueueSyncRequest(req: Omit<SyncRequest, "id" | "timestamp">): Promise<void> {
  const item: SyncRequest = { ...req, id: Math.random().toString(36).substring(2, 9), timestamp: Date.now() };
  await update<SyncRequest[]>(QUEUE_KEY, (queue) => [...(queue ?? []), item]);
}

export async function removeSyncRequest(id: string): Promise<void> {
  await update<SyncRequest[]>(QUEUE_KEY, (queue) => (queue ?? []).filter((item) => item.id !== id));
}

/**
 * Whether a queued write may be replayed for the signed-in user. Writes made
 * offline by someone who has since signed out must never be sent with another
 * user's token. Entries queued before uids were recorded keep the old behaviour.
 */
export function belongsTo(req: SyncRequest, uid: string | null | undefined): boolean {
  return !req.uid || req.uid === uid;
}
