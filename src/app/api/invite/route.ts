import { getDb, isDbConfigured } from "@/lib/mongodb";
import { verifyUser } from "@/lib/auth-server";
import { sendEmail } from "@/lib/email";
import { badRequest, escapeHtml, isStr, json, serverError, unauthorized } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface InviteDoc {
  _id: string;
  email: string;
  groupId: string | null;
  groupName: string | null;
  groupIcon: string | null;
  inviterUid: string;
  inviterName: string;
  status: "pending" | "accepted";
  createdAt: Date;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A trusted base URL for join links — never the (spoofable) request Origin. */
function baseUrl(req: Request): string {
  const env = process.env.NEXT_PUBLIC_APP_URL;
  if (env && /^https?:\/\//.test(env)) return env.replace(/\/$/, "");
  return new URL(req.url).origin;
}

/**
 * Records an invite in a shared collection so the link is resolvable by the
 * invitee, and sends the email when Resend is configured.
 */
export async function POST(req: Request) {
  const user = await verifyUser(req);
  if (!user) return unauthorized();

  try {
    const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!b || !isStr(b.email) || !isStr(b.inviteId)) return badRequest();

    const email = (b.email as string).toLowerCase().trim();
    if (!EMAIL_RE.test(email) || email.length > 254) return badRequest("bad-email");

    const inviteId = (b.inviteId as string).slice(0, 64);
    // The inviter's display name comes from the verified token, not the body —
    // stops anyone spoofing who the invite is "from".
    const inviterName = (user.name || "A friend").slice(0, 80);
    const groupName = isStr(b.groupName) ? (b.groupName as string).slice(0, 80) : null;
    const groupIcon = isStr(b.groupIcon) ? (b.groupIcon as string).slice(0, 16) : null;
    const groupId = isStr(b.groupId) ? (b.groupId as string) : null;

    const link = `${baseUrl(req)}/join/${encodeURIComponent(inviteId)}`;

    if (isDbConfigured) {
      const db = await getDb();
      await db.collection<InviteDoc>("invites").updateOne(
        { _id: inviteId },
        {
          $set: {
            email,
            groupId,
            groupName,
            groupIcon,
            inviterUid: user.uid,
            inviterName,
            status: "pending",
            createdAt: new Date(),
          },
        },
        { upsert: true },
      );
    }

    // Escape everything user-controlled before it lands in the email HTML.
    const safeName = escapeHtml(inviterName);
    const safeGroup = groupName ? escapeHtml(groupName) : "";
    const sent = await sendEmail({
      to: email,
      subject: `${inviterName} invited you to Tally`,
      text: `${inviterName} wants to split expenses with you${
        groupName ? ` in "${groupName}"` : ""
      } on Tally.\n\nSign in with Google to join and settle up over UPI:\n${link}\n\n— Tally`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#1c6b52;margin:0 0 8px">You're invited to Tally</h2>
          <p style="color:#444;line-height:1.5">${safeName} wants to split expenses with you${
            safeGroup ? ` in "${safeGroup}"` : ""
          }. Sign in with Google to join and settle up over UPI.</p>
          <a href="${link}" style="display:inline-block;margin-top:16px;background:#1c6b52;color:#fff;padding:12px 22px;border-radius:12px;text-decoration:none;font-weight:600">Join on Tally</a>
        </div>`,
    });

    return json({ ok: true, sent, link });
  } catch {
    return serverError();
  }
}
