import { getDb, isDbConfigured } from "@/lib/mongodb";
import { verifyUser } from "@/lib/auth-server";
import { sendEmail } from "@/lib/email";
import type { UserDoc } from "@/lib/db";
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

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The branded invitation email (mirrors Tally's receipt emails). */
function inviteEmailHtml(o: {
  initial: string;
  inviter: string; // already HTML-escaped
  groupName: string; // already HTML-escaped ("" when none)
  groupIcon: string; // already HTML-escaped ("" when none)
  link: string;
}): string {
  const chip = o.groupName
    ? `<div style="display:inline-block;margin-top:15px;background:rgba(255,255,255,.15);border-radius:999px;padding:7px 15px;font-size:13px;font-weight:600;">${o.groupIcon ? `${o.groupIcon}&nbsp; ` : ""}${o.groupName}</div>`
    : "";
  const closer = o.groupName
    ? `Join ${o.inviter} and your balances stay square, automatically.`
    : `Join ${o.inviter}'s circle and your balances stay square, automatically.`;
  return `
<div style="margin:0;padding:0;background:#eef2ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:28px 18px;">
    <div style="text-align:center;padding-bottom:20px;">
      <span style="font-size:20px;font-weight:800;letter-spacing:-.03em;color:#1c6b52;">Tally</span>
    </div>
    <div style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px -14px rgba(20,32,26,.25);">
      <div style="background:linear-gradient(152deg,#22795d 0%,#155741 100%);padding:30px 26px 26px;color:#ffffff;text-align:center;">
        <div style="width:54px;height:54px;margin:0 auto 14px;border-radius:50%;background:rgba(255,255,255,.16);text-align:center;line-height:54px;font-size:21px;font-weight:800;letter-spacing:-.02em;">${o.initial}</div>
        <div style="font-size:12.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;opacity:.72;">You're invited</div>
        <div style="font-size:23px;font-weight:800;letter-spacing:-.02em;margin-top:8px;line-height:1.28;">${o.inviter} wants to tally up with you</div>
        ${chip}
      </div>
      <div style="padding:26px;">
        <p style="margin:0 0 18px;font-size:15px;line-height:1.55;color:#3d4c44;">
          Tally is the easiest way to split expenses with friends and settle up over UPI — no spreadsheets, no awkward &ldquo;you still owe me&rdquo; texts. ${closer}
        </p>
        <table role="presentation" width="100%" style="border-collapse:collapse;">
          <tr><td style="padding:7px 0;font-size:14.5px;color:#3d4c44;"><span style="display:inline-block;width:30px;">🧮</span> Split any bill fairly, down to the rupee</td></tr>
          <tr><td style="padding:7px 0;font-size:14.5px;color:#3d4c44;"><span style="display:inline-block;width:30px;">⚡</span> Settle up in one tap over UPI</td></tr>
          <tr><td style="padding:7px 0;font-size:14.5px;color:#3d4c44;"><span style="display:inline-block;width:30px;">🔄</span> Balances sync across everyone, live</td></tr>
        </table>
        <div style="text-align:center;margin:26px 0 6px;">
          <a href="${o.link}" style="display:inline-block;background:#1c6b52;color:#ffffff;padding:14px 34px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;">Join on Tally</a>
        </div>
        <p style="margin:8px 0 0;text-align:center;font-size:12.5px;color:#8b958c;">Sign in with Google — no password to remember.</p>
      </div>
    </div>
    <p style="text-align:center;font-size:12px;color:#8b958c;margin-top:18px;line-height:1.6;">
      Button not working? Paste this link:<br>
      <span style="color:#6a7a70;word-break:break-all;">${o.link}</span>
    </p>
    <p style="text-align:center;font-size:12px;color:#a3aca3;margin-top:14px;">Tally · your money, quietly kept in order</p>
  </div>
</div>`;
}

/**
 * Records an invite in a shared collection so the link is resolvable by the
 * invitee, and emails it — unless the person is already in the inviter's
 * circle, in which case there's nothing to invite them to.
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
      const users = db.collection<UserDoc>("users");

      // Don't re-invite someone who's already in your circle.
      const existing = await users.findOne({ email: { $regex: `^${escapeRegex(email)}$`, $options: "i" } });
      if (existing) {
        if (existing._id === user.uid) return json({ ok: true, self: true });
        const [sharedGroup, sharedExpense, me] = await Promise.all([
          db.collection("groups").findOne({ memberUids: { $all: [user.uid, existing._id] } }, { projection: { _id: 1 } }),
          db.collection("expenses").findOne({ memberUids: { $all: [user.uid, existing._id] } }, { projection: { _id: 1 } }),
          users.findOne({ _id: user.uid }, { projection: { contacts: 1 } }),
        ]);
        const inContacts = (me?.contacts ?? []).some((c) => c.id === existing._id);
        if (sharedGroup || sharedExpense || inContacts) {
          return json({ ok: true, alreadyFriend: true, name: existing.name });
        }
      }

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
    const safeIcon = groupIcon ? escapeHtml(groupIcon) : "";
    const initial = escapeHtml((inviterName.trim().charAt(0) || "T").toUpperCase());

    const sent = await sendEmail({
      to: email,
      subject: `${inviterName} invited you to Tally`,
      text: `${inviterName} wants to split expenses with you${
        groupName ? ` in "${groupName}"` : ""
      } on Tally.\n\nSplit any bill fairly, settle up over UPI, and keep balances in sync automatically.\n\nJoin with Google (no password needed):\n${link}\n\n— Tally`,
      html: inviteEmailHtml({ initial, inviter: safeName, groupName: safeGroup, groupIcon: safeIcon, link }),
    });

    return json({ ok: true, sent, link });
  } catch {
    return serverError();
  }
}
