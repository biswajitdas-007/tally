import { get, set } from "idb-keyval";

export interface SyncRequest {
  id: string; // Unique ID for the queue item
  method: string;
  path: string;
  body?: Record<string, unknown>;
  timestamp: number;
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

export async function enqueueSyncRequest(req: Omit<SyncRequest, "id" | "timestamp">): Promise<void> {
  const queue = await getSyncQueue();
  queue.push({
    ...req,
    id: Math.random().toString(36).substring(2, 9),
    timestamp: Date.now(),
  });
  await set(QUEUE_KEY, queue);
}

export async function removeSyncRequest(id: string): Promise<void> {
  const queue = await getSyncQueue();
  await set(QUEUE_KEY, queue.filter((item) => item.id !== id));
}

export async function clearSyncQueue(): Promise<void> {
  await set(QUEUE_KEY, []);
}
