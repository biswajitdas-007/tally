import { verifyUser } from "@/lib/auth-server";
import { collections } from "@/lib/db";
import { badRequest, isStr, isNum, json, serverError, unauthorized } from "@/lib/api-helpers";
import { markManualPaid, normalizeLiability, pendingEmis, manualDue } from "@/lib/liabilities";
import { sendEmiEmail } from "@/lib/emi-email";
import { sendCardEmail } from "@/lib/card-email";
import type { Liability } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function expectedLiability(liability: Liability): Record<string, unknown> {
  return {
    id: liability.id,
    autoDebit: { $ne: true },
    emi: liability.emi,
    termMonths: liability.termMonths,
    outstanding: liability.outstanding,
    lastPaidMonth: liability.lastPaidMonth === undefined ? { $exists: false } : liability.lastPaidMonth,
    emisPaid: liability.emisPaid === undefined ? { $exists: false } : liability.emisPaid,
    dueDay: liability.dueDay === undefined ? { $exists: false } : liability.dueDay,
  };
}

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

    // Retry a fresh read if another tab changed this liability between our read
    // and conditional positional update. A duplicate confirmation becomes a
    // successful no-op as soon as its requested period is already covered.
    for (let attempt = 0; attempt < 3; attempt++) {
      const doc = await users.findOne({ _id: user.uid }, { projection: { liabilities: 1 } });
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

      const next = markManualPaid(current, now);
      const extraPayment = isNum(body.extraPayment) ? body.extraPayment as number : 0;
      if (extraPayment > 0) {
        next.outstanding = Math.max(0, next.outstanding - extraPayment);
        next.lastExtraPaidMonth = period;
      }
      const match = expectedLiability(stored);
      const result = await users.updateOne(
        // Mongo's positional `$` binds to the exact element that still has all
        // values used for the calculation, so concurrent edits cannot be lost.
        { _id: user.uid, liabilities: { $elemMatch: match } } as never,
        {
          $set: {
            "liabilities.$.emisPaid": next.emisPaid,
            "liabilities.$.outstanding": next.outstanding,
            "liabilities.$.lastPaidMonth": next.lastPaidMonth,
            ...(next.lastExtraPaidMonth ? { "liabilities.$.lastExtraPaidMonth": next.lastExtraPaidMonth } : {}),
          },
          $unset: { "liabilities.$.remainingMonths": "" },
        } as never,
      );

      if (result.modifiedCount === 1) {
        const updatedDoc = await users.findOne({ _id: user.uid }, { projection: { liabilities: 1 } });
        const updated = updatedDoc?.liabilities?.find((item) => item.id === id);
        if (!updated) return json({ error: "not-found" }, 404);
        const profile = await users.findOne({ _id: user.uid }, { projection: { email: 1, name: 1 } });
        if (profile?.email && !normalizeLiability(updated).autoDebit) {
          const l = normalizeLiability(updated);
          const [year, month] = period.split("-").map(Number);
          const dueDay = l.dueDay ?? 3;
          // Calculate the exact due date for the specified period
          const dueDate = new Date(year, month - 1, dueDay, 23, 59, 59);
          const isLate = now > dueDate;
          
          if (l.kind === "card") {
            await sendCardEmail(profile.email, profile.name ?? "", l, (l.emi ?? 0) + extraPayment, isLate, true);
          } else {
            await sendEmiEmail(profile.email, profile.name ?? "", l, (l.emi ?? 0) + extraPayment, isLate, true);
          }
        }
        return json({ ok: true, liability: normalizeLiability(updated), applied });
      }
    }

    return json({ error: "conflict" }, 409);
  } catch {
    return serverError();
  }
}
