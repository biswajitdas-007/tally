import Pusher from "pusher";

const appId = process.env.PUSHER_APP_ID;
const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
const secret = process.env.PUSHER_SECRET;
const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

export const isPusherConfigured = Boolean(appId && key && secret && cluster);

let cached: Pusher | null = null;

export function getPusher(): Pusher | null {
  if (!isPusherConfigured) return null;
  if (!cached) {
    cached = new Pusher({ appId: appId!, key: key!, secret: secret!, cluster: cluster!, useTLS: true });
  }
  return cached;
}

/** Nudge each user's private channel so their app refetches. `except` skips the actor's socket. */
export async function notifyUsers(uids: string[], data: Record<string, unknown> = {}, socketId?: string) {
  const pusher = getPusher();
  if (!pusher || uids.length === 0) return;
  const channels = [...new Set(uids)].map((u) => `private-user-${u}`);
  try {
    // batch in groups of 100 (Pusher limit)
    for (let i = 0; i < channels.length; i += 100) {
      await pusher.trigger(channels.slice(i, i + 100), "sync", data, socketId ? { socket_id: socketId } : undefined);
    }
  } catch {
    /* realtime is best-effort */
  }
}
