import { NextResponse } from "next/server";

/**
 * Sends the invite email when a provider is configured (Resend by default).
 * Without env vars it no-ops successfully so the demo flow still works —
 * the invite is always recorded client-side regardless.
 */
export async function POST(req: Request) {
  try {
    const { email, inviteId, groupId } = (await req.json()) as {
      email: string;
      inviteId: string;
      groupId?: string | null;
    };

    const key = process.env.RESEND_API_KEY;
    const from = process.env.INVITE_FROM_EMAIL;
    const origin = req.headers.get("origin") ?? new URL(req.url).origin;
    const link = `${origin}/join/${inviteId}`;

    if (!key || !from) {
      return NextResponse.json({ ok: true, sent: false, simulated: true, link });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        from,
        to: email,
        subject: "You've been invited to Tally",
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="color:#1c6b52;margin:0 0 8px">You're invited to Tally</h2>
            <p style="color:#444;line-height:1.5">A friend wants to split expenses with you. Sign in with Google to join${
              groupId ? " their group" : ""
            } and settle up over UPI.</p>
            <a href="${link}" style="display:inline-block;margin-top:16px;background:#1c6b52;color:#fff;padding:12px 22px;border-radius:12px;text-decoration:none;font-weight:600">Join on Tally</a>
          </div>`,
      }),
    });

    return NextResponse.json({ ok: res.ok, sent: res.ok, link });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
