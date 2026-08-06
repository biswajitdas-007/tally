import { NextResponse } from "next/server";
import { verifyUser } from "@/lib/auth-server";
import { buildState, collections, upsertUser } from "@/lib/db";
import { isDbConfigured } from "@/lib/mongodb";
import { anchorLastPaidMonth, initialLastPaidMonth } from "@/lib/liabilities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await verifyUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isDbConfigured) return NextResponse.json({ me: null, people: [], groups: [], expenses: [] });

  const { users } = await collections();
  await upsertUser(users, user.uid, { name: user.name, email: user.email, photoURL: user.picture });

  // Silent migration: anchor any existing legacy loans that missed the lastPaidMonth creation
  const doc = await users.findOne({ _id: user.uid }, { projection: { liabilities: 1 } });
  if (doc?.liabilities) {
    let modified = false;
    const now = new Date();
    const updated = doc.liabilities.map((l) => {
      if ((l.kind === "emi" || l.kind === "loan") && !l.lastPaidMonth) {
        modified = true;
        return {
          ...l,
          lastPaidMonth: l.autoDebit
            ? initialLastPaidMonth(l.dueDay ?? 3, now)
            : anchorLastPaidMonth(l, now),
        };
      }
      return l;
    });
    if (modified) {
      await users.updateOne({ _id: user.uid }, { $set: { liabilities: updated } });
    }
  }

  return NextResponse.json(await buildState(user.uid));
}
