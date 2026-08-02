import { NextResponse } from "next/server";
import { verifyUid } from "@/lib/auth-server";
import { collections } from "@/lib/db";
import type { PushSubscription } from "web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isRecognizedPushService(url: URL | null): boolean {
  if (!url || url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  return (
    host === "fcm.googleapis.com" ||
    host === "updates.push.services.mozilla.com" ||
    host === "web.push.apple.com" ||
    host.endsWith(".notify.windows.com")
  );
}

export async function POST(req: Request) {
  const uid = await verifyUid(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { subscription } = (await req.json().catch(() => ({}))) as { subscription?: PushSubscription };
  const endpoint = subscription?.endpoint;
  const p256dh = subscription?.keys?.p256dh;
  const auth = subscription?.keys?.auth;
  // These values feed Mongo filters and Web Push. Accept only the bounded
  // browser-generated shape, never objects or an arbitrary URL scheme.
  let endpointUrl: URL | null = null;
  try {
    endpointUrl = typeof endpoint === "string" ? new URL(endpoint) : null;
  } catch {
    endpointUrl = null;
  }
  if (
    !subscription ||
    typeof endpoint !== "string" ||
    endpoint.length === 0 ||
    endpoint.length > 4096 ||
    !isRecognizedPushService(endpointUrl) ||
    typeof p256dh !== "string" ||
    p256dh.length === 0 ||
    p256dh.length > 1024 ||
    typeof auth !== "string" ||
    auth.length === 0 ||
    auth.length > 1024
  ) {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  const { users } = await collections();
  // A browser endpoint belongs to the account currently signed in on that
  // browser. Remove stale ownership first so a shared device cannot receive a
  // previous account's private finance notifications.
  await users.updateMany(
    { "pushSubs.endpoint": endpoint },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { $pull: { pushSubs: { endpoint } } } as any,
  );
  await users.updateOne(
    { _id: uid },
    {
      $addToSet: {
        pushSubs: {
          endpoint,
          expirationTime: typeof subscription.expirationTime === "number" ? subscription.expirationTime : null,
          keys: { p256dh, auth },
        },
      },
    },
    { upsert: true },
  );

  return NextResponse.json({ ok: true });
}
