import { verifyUser } from "@/lib/auth-server";
import { collections } from "@/lib/db";
import { badRequest, isNum, isStr, json, serverError, unauthorized } from "@/lib/api-helpers";
import type { FinanceType, RecurFreq, Recurring } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES: FinanceType[] = ["income", "expense"];
const FREQS: RecurFreq[] = ["monthly", "weekly"];

function cleanRules(v: unknown): Recurring[] {
  if (!Array.isArray(v)) return [];
  const out: Recurring[] = [];
  for (const raw of v) {
    const r = raw as Record<string, unknown>;
    if (!r || !isStr(r.id) || !isNum(r.amount) || (r.amount as number) <= 0) continue;
    if (!TYPES.includes(r.type as FinanceType) || !FREQS.includes(r.freq as RecurFreq)) continue;
    if (!isStr(r.category) || !isNum(r.day)) continue;

    const freq = r.freq as RecurFreq;
    const day =
      freq === "monthly"
        ? Math.min(Math.max(Math.round(r.day as number), 1), 28)
        : Math.min(Math.max(Math.round(r.day as number), 0), 6);

    const item: Recurring = {
      id: (r.id as string).slice(0, 40),
      type: r.type as FinanceType,
      amount: r.amount as number,
      category: (r.category as string).slice(0, 30),
      freq,
      day,
      auto: r.auto !== false,
      createdAt: isStr(r.createdAt) ? (r.createdAt as string) : new Date().toISOString(),
    };
    if (isStr(r.note)) item.note = (r.note as string).slice(0, 200);
    if (isStr(r.accountId)) item.accountId = (r.accountId as string).slice(0, 40);
    if (isStr(r.lastRun)) item.lastRun = (r.lastRun as string).slice(0, 10);
    if (r.paused === true) item.paused = true;
    out.push(item);
    if (out.length >= 40) break;
  }
  return out;
}

export async function POST(req: Request) {
  const user = await verifyUser(req);
  if (!user) return unauthorized();

  try {
    const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!b) return badRequest();

    const { users } = await collections();
    await users.updateOne({ _id: user.uid }, { $set: { recurrings: cleanRules(b.recurrings) } }, { upsert: true });
    return json({ ok: true });
  } catch {
    return serverError();
  }
}
