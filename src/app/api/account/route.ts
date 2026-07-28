import { verifyUser } from "@/lib/auth-server";
import { outstandingBalances, purgeAccount } from "@/lib/delete-account";
import { json, serverError, unauthorized } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Permanently delete this account. Blocked while any balance is outstanding. */
export async function DELETE(req: Request) {
  const user = await verifyUser(req);
  if (!user) return unauthorized();

  try {
    const open = await outstandingBalances(user.uid);
    if (open) return json({ error: "unsettled", ...open }, 409);

    await purgeAccount(user.uid);
    return json({ ok: true });
  } catch {
    return serverError();
  }
}
