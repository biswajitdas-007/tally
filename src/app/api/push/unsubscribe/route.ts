import { NextResponse } from "next/server";
import { verifyUid } from "@/lib/auth-server";
import { collections } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const uid = await verifyUid(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { endpoint } = (await req.json().catch(() => ({}))) as { endpoint?: string };
  // Feeds a $pull query filter — must be a plain string, never an object.
  if (typeof endpoint !== "string" || !endpoint) return NextResponse.json({ error: "bad-request" }, { status: 400 });

  const { users } = await collections();
  await users.updateOne(
    { _id: uid },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { $pull: { pushSubs: { endpoint } } } as any,
  );
  return NextResponse.json({ ok: true });
}
