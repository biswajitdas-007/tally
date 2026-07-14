import { NextResponse } from "next/server";
import { getDb, isDbConfigured } from "@/lib/mongodb";
import { verifyUid } from "@/lib/auth-server";

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

/**
 * Records an invite in a shared collection so the link is resolvable by the
 * invitee, and sends the email when Resend is configured.
 */
export async function POST(req: Request) {
  const uid = await verifyUid(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | { email?: string; inviteId?: string; groupId?: string | null; groupName?: string; groupIcon?: string; inviterName?: string }
    | null;
  if (!body?.email || !body?.inviteId) return NextResponse.json({ error: "bad-request" }, { status: 400 });

  const origin = req.headers.get("origin") ?? new URL(req.url).origin;
  const link = `${origin}/join/${body.inviteId}`;

  if (isDbConfigured) {
    const db = await getDb();
    await db.collection<InviteDoc>("invites").updateOne(
      { _id: body.inviteId },
      {
        $set: {
          email: body.email.toLowerCase(),
          groupId: body.groupId ?? null,
          groupName: body.groupName ?? null,
          groupIcon: body.groupIcon ?? null,
          inviterUid: uid,
          inviterName: body.inviterName || "A friend",
          status: "pending",
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );
  }

  const key = process.env.RESEND_API_KEY;
  const from = process.env.INVITE_FROM_EMAIL;
  let sent = false;
  if (key && from) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({
          from,
          to: body.email,
          subject: `${body.inviterName || "A friend"} invited you to Tally`,
          html: `
            <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
              <h2 style="color:#1c6b52;margin:0 0 8px">You're invited to Tally</h2>
              <p style="color:#444;line-height:1.5">${body.inviterName || "A friend"} wants to split expenses with you${
                body.groupName ? ` in "${body.groupName}"` : ""
              }. Sign in with Google to join and settle up over UPI.</p>
              <a href="${link}" style="display:inline-block;margin-top:16px;background:#1c6b52;color:#fff;padding:12px 22px;border-radius:12px;text-decoration:none;font-weight:600">Join on Tally</a>
            </div>`,
        }),
      });
      sent = res.ok;
    } catch {
      /* best effort */
    }
  }

  return NextResponse.json({ ok: true, sent, link });
}
