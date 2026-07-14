import { NextResponse } from "next/server";
import { verifyUid } from "@/lib/auth-server";
import { getPusher } from "@/lib/pusher-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Authorizes a client to subscribe to its own private-user channel. */
export async function POST(req: Request) {
  const uid = await verifyUid(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 403 });

  const { socket_id, channel_name } = (await req.json().catch(() => ({}))) as {
    socket_id?: string;
    channel_name?: string;
  };
  if (!socket_id || channel_name !== `private-user-${uid}`) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const pusher = getPusher();
  if (!pusher) return NextResponse.json({ error: "pusher-not-configured" }, { status: 503 });

  return NextResponse.json(pusher.authorizeChannel(socket_id, channel_name));
}
