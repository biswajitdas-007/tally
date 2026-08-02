import { createHash } from "node:crypto";
import webpush, { type PushSubscription, type Urgency } from "web-push";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

let configured = Boolean(publicKey && privateKey);

if (configured) {
  try {
    webpush.setVapidDetails("mailto:notifications@tally.app", publicKey!, privateKey!);
  } catch {
    // A malformed or mismatched deployment must not make every importing route
    // fail at module initialisation. Delivery metrics will report these as
    // failures until the VAPID configuration is repaired.
    configured = false;
  }
}

export const isPushConfigured = configured;

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  /** Replaces an older visible notification for the same event. */
  tag?: string;
  /** Push-service retention in seconds. Defaults to one day. */
  ttl?: number;
  urgency?: Urgency;
}

/**
 * The array remains the dead-endpoint list for compatibility with existing
 * callers that spread the return value. The attached counters let cron jobs
 * report actual delivery outcomes instead of counting attempted reminders.
 */
export type PushResult = string[] & {
  sent: number;
  failed: number;
  dead: number;
};

const DEFAULT_TTL_SECONDS = 24 * 60 * 60;
const SOCKET_TIMEOUT_MS = 10_000;

function result(deadEndpoints: string[], sent: number, failed: number): PushResult {
  return Object.assign(deadEndpoints, { sent, failed, dead: deadEndpoints.length });
}

function topicFor(tag: string | undefined): string | undefined {
  if (!tag) return undefined;
  // Web Push topics are limited to 32 URL-safe characters. Hashing preserves
  // stable replacement semantics even when a liability id is long.
  return createHash("sha256").update(tag).digest("base64url").slice(0, 32);
}

/**
 * Sends a notification to each distinct subscription. The returned array is
 * still the list of endpoints that are gone (410/404), with sent/failed/dead
 * counters attached for callers that need truthful operational metrics.
 */
export async function sendPush(subs: PushSubscription[], payload: PushPayload): Promise<PushResult> {
  const byEndpoint = new Map<string, PushSubscription>();
  let invalid = 0;
  for (const sub of subs) {
    if (!sub || typeof sub !== "object" || typeof sub.endpoint !== "string" || !sub.endpoint) {
      invalid++;
      continue;
    }
    if (!byEndpoint.has(sub.endpoint)) byEndpoint.set(sub.endpoint, sub);
  }
  const unique = [...byEndpoint.values()];
  if (unique.length === 0) return result([], 0, invalid);
  if (!isPushConfigured) return result([], 0, unique.length + invalid);

  const deadEndpoints: string[] = [];
  let sent = 0;
  let failed = invalid;
  const { ttl, urgency, ...notification } = payload;
  const TTL = Number.isFinite(ttl) ? Math.max(0, Math.round(ttl!)) : DEFAULT_TTL_SECONDS;

  await Promise.all(
    unique.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, JSON.stringify(notification), {
          TTL,
          urgency: urgency ?? "normal",
          topic: topicFor(payload.tag),
          timeout: SOCKET_TIMEOUT_MS,
        });
        sent++;
      } catch (err: unknown) {
        const code = (err as { statusCode?: number })?.statusCode;
        if ((code === 404 || code === 410) && sub.endpoint) deadEndpoints.push(sub.endpoint);
        else failed++;
      }
    }),
  );
  return result(deadEndpoints, sent, failed);
}
