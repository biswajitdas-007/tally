import { NextResponse } from "next/server";
import { verifyUser } from "@/lib/auth-server";
import { collections } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { escapeHtml } from "@/lib/api-helpers";
import { inviteEmailHtml } from "@/app/api/invite/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A trusted base URL for join links — never the (spoofable) request Origin. */
function baseUrl(req: Request): string {
  const env = process.env.NEXT_PUBLIC_APP_URL;
  if (env && /^https?:\/\//.test(env)) return env.replace(/\/$/, "");
  return new URL(req.url).origin;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifyUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  
  const { id } = await params;

  try {
    const { invites, groups } = await collections();
    
    const inv = await invites.findOne({ _id: id });
    if (!inv || !inv.email || inv.status !== "pending") {
      return NextResponse.json({ error: "not-found" }, { status: 404 });
    }

    let isAuthorized = false;
    
    // Check if user is the inviter
    if (inv.inviterUid === user.uid) {
      isAuthorized = true;
    } else if (inv.groupId) {
      // Or check if user is a member of the group the invite is for
      const group = await groups.findOne({ _id: inv.groupId });
      if (group && group.memberUids.includes(user.uid)) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "unauthorized" }, { status: 403 });
    }

    const link = `${baseUrl(req)}/join/${encodeURIComponent(id)}`;
    
    const safeName = escapeHtml(inv.inviterName);
    const safeGroup = inv.groupName ? escapeHtml(inv.groupName) : "";
    const safeIcon = inv.groupIcon ? escapeHtml(inv.groupIcon) : "";
    const initial = escapeHtml((inv.inviterName.trim().charAt(0) || "T").toUpperCase());

    const sent = await sendEmail({
      to: inv.email,
      subject: `${inv.inviterName} invited you to Tally`,
      text: `${inv.inviterName} wants to split expenses with you${
        inv.groupName ? ` in "${inv.groupName}"` : ""
      } on Tally.\n\nSplit any bill fairly, settle up over UPI, and keep balances in sync automatically.\n\nJoin with Google (no password needed):\n${link}\n\n— Tally`,
      html: inviteEmailHtml({ initial, inviter: safeName, groupName: safeGroup, groupIcon: safeIcon, link }),
    });

    if (sent) {
      return NextResponse.json({ ok: true });
    } else {
      return NextResponse.json({ error: "failed-to-send" }, { status: 500 });
    }
  } catch (error) {
    console.error("Failed to resend invite:", error);
    return NextResponse.json({ error: "internal-server-error" }, { status: 500 });
  }
}
