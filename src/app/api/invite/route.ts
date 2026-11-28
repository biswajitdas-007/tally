import { getDb, isDbConfigured } from "@/lib/mongodb";
import { groupIconEmoji } from "@/lib/group-icons";
import { verifyUser } from "@/lib/auth-server";
import { sendEmail } from "@/lib/email";
import { emailButton, emailLayout, emailList, emailNote, emailParagraph } from "@/lib/email-layout";
import type { GroupDoc, UserDoc } from "@/lib/db";
import { badRequest, escapeHtml, forbidden, isStr, json, serverError, unauthorized } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface InviteDoc {
  _id: string;
  email?: string;
  groupId: string | null;
  groupName: string | null;
  groupIcon: string | null;
  inviterUid: string;
  inviterName: string;
  status: "pending" | "accepted";
  isGeneric?: boolean;
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
export function inviteEmailHtml(o: {
  initial: string;
  inviter: string; // already HTML-escaped
  groupName: string; // already HTML-escaped ("" when none)
  groupIcon: string; // already HTML-escaped ("" when none)
  link: string;
}): string {
  const iconPrefix = o.groupIcon ? `${o.groupIcon}&nbsp; ` : "";
  const groupChip = o.groupName ? iconPrefix + o.groupName : undefined;
  const closer = o.groupName
    ? `Join ${o.inviter} and your balances stay square, automatically.`
    : `Join ${o.inviter}'s circle and your balances stay square, automatically.`;
  return emailLayout({
    align: "center",
    badge: o.initial,
    eyebrow: "You're invited",
    title: `${o.inviter} wants to tally up with you`,
    chip: groupChip,
    body:
      emailParagraph(
        `Tally is the easiest way to split expenses with friends and settle up over UPI — no spreadsheets, no awkward &ldquo;you still owe me&rdquo; texts. ${closer}`,
      ) +
      emailList([
        { icon: "🧮", text: "Split any bill fairly, down to the rupee" },
        { icon: "⚡", text: "Settle up in one tap over UPI" },
        { icon: "🔄", text: "Balances sync across everyone, live" },
      ]) +
      emailButton(o.link, "Join on Tally") +
      emailNote("Sign in with Google — no password to remember.", "center"),
    footer: `Button not working? Paste this link:<br><span style="word-break:break-all;">${escapeHtml(o.link)}</span>`,
  });
}

type Db = Awaited<ReturnType<typeof getDb>>;

/** Only a group member may invite into a group, and an invite id belongs to whoever created it. */
async function mayWriteInvite(db: Db, uid: string, inviteId: string, groupId: string | null): Promise<boolean> {
  if (groupId) {
    const inGroup = await db.collection<GroupDoc>("groups").findOne({ _id: groupId, memberUids: uid }, { projection: { _id: 1 } });
    if (!inGroup) return false;
  }
  const taken = await db.collection<InviteDoc>("invites").findOne({ _id: inviteId }, { projection: { inviterUid: 1 } });
  return !taken || taken.inviterUid === uid;
}

/** Whether the email already belongs to someone in the inviter's circle. */
async function inCircle(db: Db, uid: string, other: string): Promise<boolean> {
  const [sharedGroup, sharedExpense, me] = await Promise.all([
    db.collection("groups").findOne({ memberUids: { $all: [uid, other] } }, { projection: { _id: 1 } }),
    db.collection("expenses").findOne({ memberUids: { $all: [uid, other] } }, { projection: { _id: 1 } }),
    db.collection<UserDoc>("users").findOne({ _id: uid }, { projection: { contacts: 1 } }),
  ]);
  return Boolean(sharedGroup || sharedExpense || (me?.contacts ?? []).some((c) => c.id === other));
}

/** The response to send instead of a new invite, or null to go ahead. */
async function alreadyInvited(db: Db, uid: string, email: string, groupId: string | null): Promise<Record<string, unknown> | null> {
  const emailRe = { $regex: `^${escapeRegex(email)}$`, $options: "i" };
  const existing = await db.collection<UserDoc>("users").findOne({ email: emailRe });
  if (existing?._id === uid) return { ok: true, self: true };
  if (existing && (await inCircle(db, uid, existing._id))) return { ok: true, alreadyFriend: true, name: existing.name };

  // One pending invite per email, inviter and group.
  const pending = await db.collection<InviteDoc>("invites").findOne({ email: emailRe, status: "pending", groupId, inviterUid: uid });
  return pending ? { ok: true, duplicate: true, existingId: pending._id } : null;
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
    if (!b || (!isStr(b.email) && !b.isGeneric) || !isStr(b.inviteId)) return badRequest();

    const isGeneric = Boolean(b.isGeneric);
    const email = isStr(b.email) ? (b.email as string).toLowerCase().trim() : undefined;
    if (!isGeneric && (!email || !EMAIL_RE.test(email) || email.length > 254)) return badRequest("bad-email");

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
      if (!(await mayWriteInvite(db, user.uid, inviteId, groupId))) return forbidden();

      // Don't re-invite someone who's already in your circle (skip if generic).
      const early = !isGeneric && email ? await alreadyInvited(db, user.uid, email, groupId) : null;
      if (early) return json(early);

      const inviteDoc: Partial<InviteDoc> = {
        groupId,
        groupName,
        groupIcon,
        inviterUid: user.uid,
        inviterName,
        status: "pending",
        createdAt: new Date(),
      };
      if (isGeneric) inviteDoc.isGeneric = true;
      if (email) inviteDoc.email = email;

      await db.collection<InviteDoc>("invites").updateOne(
        { _id: inviteId },
        { $set: inviteDoc },
        { upsert: true },
      );
    }

    if (isGeneric || !email) {
      return json({ ok: true, sent: false, link });
    }

    // Escape everything user-controlled before it lands in the email HTML.
    const safeName = escapeHtml(inviterName);
    const safeGroup = groupName ? escapeHtml(groupName) : "";
    const safeIcon = groupIcon ? escapeHtml(groupIconEmoji(groupIcon)) : "";
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
