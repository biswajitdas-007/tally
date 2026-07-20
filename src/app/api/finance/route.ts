import { verifyUser } from "@/lib/auth-server";
import { collections, type FinanceDoc } from "@/lib/db";
import { badRequest, isNum, isStr, json, serverError, unauthorized } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await verifyUser(req);
  if (!user) return unauthorized();

  try {
    const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (
      !b ||
      !isStr(b.id) ||
      (b.type !== "income" && b.type !== "expense") ||
      !isNum(b.amount) ||
      b.amount <= 0 ||
      !isStr(b.category)
    ) {
      return badRequest();
    }

    const { finance } = await collections();
    const doc: FinanceDoc = {
      _id: b.id as string,
      uid: user.uid,
      type: b.type,
      amount: b.amount,
      category: (b.category as string).slice(0, 40),
      date: isStr(b.date) ? (b.date as string) : new Date().toISOString(),
      note: isStr(b.note) ? (b.note as string).slice(0, 300) : undefined,
      createdAt: new Date().toISOString(),
      accountId: isStr(b.accountId) ? (b.accountId as string).slice(0, 40) : undefined,
      transfer: b.transfer === true ? true : undefined,
      payeeVpa: isStr(b.payeeVpa) ? (b.payeeVpa as string).slice(0, 256) : undefined,
      payeeName: isStr(b.payeeName) ? (b.payeeName as string).slice(0, 80) : undefined,
    };
    await finance.insertOne(doc);

    return json({ ok: true });
  } catch {
    return serverError();
  }
}
