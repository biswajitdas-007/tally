import { verifyUser } from "@/lib/auth-server";
import { collections } from "@/lib/db";
import { scopedDebts } from "@/lib/balances";
import type { Expense } from "@/lib/types";
import { json, serverError, unauthorized } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Remove a friend from your list. Blocked while you have an unsettled balance
 * with them — you must settle up first. Only affects your own view: they stay
 * in any shared groups, and reappear if you start splitting with them again.
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifyUser(req);
  if (!user) return unauthorized();

  try {
    const { id: friendId } = await params;
    const { expenses, users } = await collections();

    // Authoritative balance check — same math the friends list shows.
    const mine = await expenses.find({ memberUids: user.uid }).toArray();
    const debt = scopedDebts(mine as unknown as Expense[], user.uid).find((d) => d.personId === friendId);
    if (debt && Math.abs(debt.total) > 0.01) {
      return json({ error: "unsettled", amount: debt.total }, 409);
    }

    await users.updateOne(
      { _id: user.uid },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { $pull: { contacts: { id: friendId } }, $addToSet: { removedFriends: friendId } } as any,
    );

    return json({ ok: true });
  } catch {
    return serverError();
  }
}
