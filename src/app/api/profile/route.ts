import { verifyUser } from "@/lib/auth-server";
import { collections, type UserDoc } from "@/lib/db";
import { notifyChange } from "@/lib/notify";
import { badRequest, isStr, json, serverError, unauthorized } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await verifyUser(req);
  if (!user) return unauthorized();

  try {
    const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!b) return badRequest();

    const { users, groups } = await collections();
    const set: Partial<UserDoc> = { updatedAt: new Date() };
    if (isStr(b.name) && (b.name as string).trim()) set.name = (b.name as string).trim().slice(0, 80);
    if (isStr(b.upiId)) set.upiId = (b.upiId as string).trim().slice(0, 120);
    await users.updateOne({ _id: user.uid }, { $set: set }, { upsert: true });

    // Let people who share groups with me refresh my profile.
    const myGroups = await groups.find({ memberUids: user.uid }, { projection: { memberUids: 1 } }).toArray();
    const all = [...new Set(myGroups.flatMap((g) => g.memberUids))];
    await notifyChange(all, user.uid, undefined, isStr(b.socketId) ? (b.socketId as string) : undefined);

    return json({ ok: true });
  } catch {
    return serverError();
  }
}
