import { NextResponse } from "next/server";
import { verifyUid } from "@/lib/auth-server";
import { collections } from "@/lib/db";
import type { PushSubscription } from "web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const uid = await verifyUid(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { subscription } = (await req.json().catch(() => ({}))) as { subscription?: PushSubscription };
  // endpoint feeds a $pull query filter — must be a plain string, never an object.
  if (!subscription || typeof subscription.endpoint !== "string" || !subscription.endpoint) {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  const { users } = await collections();
  // Replace any existing sub with the same endpoint, then add the fresh one.
  await users.updateOne(
    { _id: uid },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { $pull: { pushSubs: { endpoint: subscription.endpoint } } } as any,
  );
  await users.updateOne({ _id: uid }, { $push: { pushSubs: subscription } }, { upsert: true });

  return NextResponse.json({ ok: true });
}
