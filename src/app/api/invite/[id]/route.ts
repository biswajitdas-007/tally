import { NextResponse } from "next/server";
import { getDb, isDbConfigured } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public: resolve an invite so the join page can show who/what it's for. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isDbConfigured) return NextResponse.json({ error: "not-found" }, { status: 404 });

  const db = await getDb();
  const inv = await db.collection<{ _id: string }>("invites").findOne({ _id: id });
  if (!inv) return NextResponse.json({ error: "not-found" }, { status: 404 });

  const doc = inv as unknown as {
    inviterName?: string;
    groupName?: string | null;
    groupIcon?: string | null;
    groupId?: string | null;
    status?: string;
  };
  return NextResponse.json({
    inviterName: doc.inviterName ?? "A friend",
    groupName: doc.groupName ?? null,
    groupIcon: doc.groupIcon ?? null,
    hasGroup: Boolean(doc.groupId),
    status: doc.status ?? "pending",
  });
}
