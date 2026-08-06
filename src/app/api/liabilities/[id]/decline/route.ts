import { verifyUser } from "@/lib/auth-server";
import { collections } from "@/lib/db";
import { badRequest, isStr, json, serverError, unauthorized } from "@/lib/api-helpers";
import { manualDue, normalizeLiability, pendingEmis } from "@/lib/liabilities";
import { sendDeclinedEmiEmail } from "@/lib/declined-email";
import type { Liability } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifyUser(req);
  if (!user) return unauthorized();

  const { id } = await params;
  if (!isStr(id) || id.length > 40) return badRequest();

  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || !isStr(body.period) || !PERIOD_RE.test(body.period)) return badRequest("bad-period");
    const period = body.period;
    const now = new Date();
    const { users } = await collections();

    for (let attempt = 0; attempt < 3; attempt++) {
      const doc = await users.findOne({ _id: user.uid }, { projection: { liabilities: 1, email: 1, name: 1 } });
      const stored = doc?.liabilities?.find((liability) => liability.id === id);
      if (!stored) return json({ error: "not-found" }, 404);
      const current = normalizeLiability(stored);

      if (current.lastPaidMonth && PERIOD_RE.test(current.lastPaidMonth) && current.lastPaidMonth >= period) {
        return json({ ok: true, liability: current, applied: [], alreadyHandled: true });
      }

      const applied = pendingEmis(current, now);
      if (!manualDue(current, now) || !applied.includes(period)) {
        return json({ error: "not-due" }, 409);
      }

      // To mark as declined, we don't update outstanding or emisPaid, but we do update the reminder date
      // so the smart overdue engine kicks in and starts the 3-day reminder backoff instead of reminding tomorrow.
      const match = { id: stored.id };
      const result = await users.updateOne(
        { _id: user.uid, liabilities: { $elemMatch: match } } as never,
        {
          $set: {
            "liabilities.$.lastEmiReminderDate": now.toISOString(),
          },
        } as never,
      );

      if (result.modifiedCount === 1) {
        if (doc?.email) {
          await sendDeclinedEmiEmail(doc.email, doc.name ?? "", current);
        }
        return json({ ok: true });
      }
    }

    return json({ error: "conflict" }, 409);
  } catch {
    return serverError();
  }
}
