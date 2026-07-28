import { verifyUser } from "@/lib/auth-server";
import { collections, type FinanceDoc } from "@/lib/db";
import { badRequest, isNum, isStr, json, serverError, unauthorized } from "@/lib/api-helpers";
import { uid as newId } from "@/lib/utils";
import type { FinanceType } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Matches the client-side cap; the server enforces it regardless of what's sent. */
const MAX_IMPORT = 2000;
const TYPES: FinanceType[] = ["income", "expense"];

/**
 * Bulk-create money entries from a statement import. The client has already
 * filtered duplicates, but we check `importKey` against what's stored too — so
 * a double-submit or a retry can't create the same entry twice.
 */
export async function POST(req: Request) {
  const user = await verifyUser(req);
  if (!user) return unauthorized();

  try {
    const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!b || !Array.isArray(b.entries)) return badRequest();
    if (b.entries.length === 0) return json({ ok: true, added: 0, skipped: 0 });
    if (b.entries.length > MAX_IMPORT) {
      return json({ error: "too-many", max: MAX_IMPORT }, 413);
    }

    const now = new Date().toISOString();
    const clean: FinanceDoc[] = [];
    const keys: string[] = [];

    for (const raw of b.entries) {
      const e = raw as Record<string, unknown>;
      if (!e || !isNum(e.amount) || (e.amount as number) <= 0) continue;
      if (!TYPES.includes(e.type as FinanceType) || !isStr(e.date) || !isStr(e.category)) continue;
      const when = new Date(e.date as string);
      if (Number.isNaN(when.getTime())) continue;

      const doc: FinanceDoc = {
        _id: newId("f_"),
        uid: user.uid,
        type: e.type as FinanceType,
        amount: Math.round((e.amount as number) * 100) / 100,
        category: (e.category as string).slice(0, 30),
        date: when.toISOString(),
        createdAt: now,
      };
      if (isStr(e.note)) doc.note = (e.note as string).slice(0, 200);
      if (isStr(e.accountId)) doc.accountId = (e.accountId as string).slice(0, 40);
      if (isStr(e.importKey)) {
        doc.importKey = (e.importKey as string).slice(0, 200);
        keys.push(doc.importKey);
      }
      clean.push(doc);
    }

    if (!clean.length) return json({ ok: true, added: 0, skipped: 0 });

    // Anything with a key we've already stored has been imported before.
    const { finance } = await collections();
    const seen = new Set<string>();
    if (keys.length) {
      const existing = await finance
        .find({ uid: user.uid, importKey: { $in: keys } }, { projection: { importKey: 1 } })
        .toArray();
      for (const d of existing) if (d.importKey) seen.add(d.importKey);
    }

    const toAdd = clean.filter((d) => !d.importKey || !seen.has(d.importKey));
    if (toAdd.length) await finance.insertMany(toAdd);

    return json({ ok: true, added: toAdd.length, skipped: clean.length - toAdd.length });
  } catch {
    return serverError();
  }
}
