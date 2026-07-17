import { verifyUser } from "@/lib/auth-server";
import { collections, type FinanceDoc } from "@/lib/db";
import { badRequest, forbidden, isNum, isStr, json, serverError, unauthorized } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifyUser(req);
  if (!user) return unauthorized();
  const { id } = await params;

  try {
    const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!b) return badRequest();

    const { finance } = await collections();
    const existing = await finance.findOne({ _id: id });
    if (!existing || existing.uid !== user.uid) return forbidden();

    const set: Partial<FinanceDoc> = {};
    if (b.type === "income" || b.type === "expense") set.type = b.type;
    if (isNum(b.amount) && (b.amount as number) > 0) set.amount = b.amount as number;
    if (isStr(b.category)) set.category = (b.category as string).slice(0, 40);
    if (isStr(b.date)) set.date = b.date as string;
    if (b.note !== undefined) set.note = isStr(b.note) ? (b.note as string).slice(0, 300) : undefined;
    if (b.accountId !== undefined) set.accountId = isStr(b.accountId) ? (b.accountId as string).slice(0, 40) : undefined;

    if (Object.keys(set).length) await finance.updateOne({ _id: id, uid: user.uid }, { $set: set });
    return json({ ok: true });
  } catch {
    return serverError();
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifyUser(req);
  if (!user) return unauthorized();
  const { id } = await params;

  try {
    const { finance } = await collections();
    await finance.deleteOne({ _id: id, uid: user.uid });
    return json({ ok: true });
  } catch {
    return serverError();
  }
}
