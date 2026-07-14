import webpush, { type PushSubscription } from "web-push";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

export const isPushConfigured = Boolean(publicKey && privateKey);

if (isPushConfigured) {
  webpush.setVapidDetails("mailto:notifications@tally.app", publicKey!, privateKey!);
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Sends a notification to each subscription. Returns endpoints that are gone
 * (410/404) so the caller can prune them.
 */
export async function sendPush(subs: PushSubscription[], payload: PushPayload): Promise<string[]> {
  if (!isPushConfigured || subs.length === 0) return [];
  const dead: string[] = [];
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, JSON.stringify(payload));
      } catch (err: unknown) {
        const code = (err as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) dead.push(sub.endpoint);
      }
    }),
  );
  return dead;
}
