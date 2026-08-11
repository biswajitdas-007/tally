import { verifyUser } from "@/lib/auth-server";
import { collections } from "@/lib/db";
import { badRequest, isNum, isStr, json, serverError, unauthorized } from "@/lib/api-helpers";
import { normalizeLiability } from "@/lib/liabilities";
import { sendEmiEmail } from "@/lib/emi-email";
import { sendCardEmail } from "@/lib/card-email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifyUser(req);
  if (!user) return unauthorized();

  const { id } = await params;
  if (!isStr(id) || id.length > 40) return badRequest();

  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || !isNum(body.amountPaid)) return badRequest();
    
    const amountPaid = body.amountPaid as number;
    const paymentDate = isStr(body.date) ? new Date(body.date as string) : new Date();

    const { users } = await collections();
    const doc = await users.findOne({ _id: user.uid }, { projection: { email: 1, name: 1, liabilities: 1 } });
    const stored = doc?.liabilities?.find((liability) => liability.id === id);
    
    if (!stored) return json({ error: "not-found" }, 404);
    if (!doc?.email) return json({ ok: true, emailSent: false });

    const l = normalizeLiability(stored);
    const dueDay = l.dueDay ?? 3;
    
    // Check if the payment date was past the due date of the current month
    // We construct the due date for the month the payment was made in
    const dueDate = new Date(paymentDate.getFullYear(), paymentDate.getMonth(), dueDay, 23, 59, 59);
    const isLate = paymentDate > dueDate;

    let sent = false;
    if (l.kind === "card") {
      sent = await sendCardEmail(doc.email, doc.name ?? "", l, amountPaid, isLate, true);
    } else {
      sent = await sendEmiEmail(doc.email, doc.name ?? "", l, amountPaid, isLate, true);
    }
    
    return json({ ok: true, emailSent: sent });
  } catch {
    return serverError();
  }
}
