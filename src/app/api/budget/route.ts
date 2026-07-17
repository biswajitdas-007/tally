import { verifyUser } from "@/lib/auth-server";
import { collections } from "@/lib/db";
import { badRequest, isNum, json, serverError, unauthorized } from "@/lib/api-helpers";
import type { Budget, CategoryKey } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATS: CategoryKey[] = ["food", "rent", "travel", "shopping", "bills", "fun", "health", "other"];

export async function POST(req: Request) {
  const user = await verifyUser(req);
  if (!user) return unauthorized();

  try {
    const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!b) return badRequest();

    // Rebuild the budget from scratch — only accept known categories + sane numbers.
    const budget: Budget = { limits: {} };
    if (isNum(b.income) && (b.income as number) >= 0) budget.income = b.income as number;
    if (b.limits && typeof b.limits === "object" && !Array.isArray(b.limits)) {
      for (const [k, v] of Object.entries(b.limits as Record<string, unknown>)) {
        if (CATS.includes(k as CategoryKey) && isNum(v) && (v as number) > 0) {
          budget.limits[k as CategoryKey] = v as number;
        }
      }
    }

    const { users } = await collections();
    await users.updateOne({ _id: user.uid }, { $set: { budget } }, { upsert: true });
    return json({ ok: true });
  } catch {
    return serverError();
  }
}
