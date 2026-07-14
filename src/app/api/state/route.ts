import { NextResponse } from "next/server";
import { verifyUser } from "@/lib/auth-server";
import { buildState, collections, upsertUser } from "@/lib/db";
import { isDbConfigured } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await verifyUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isDbConfigured) return NextResponse.json({ me: null, people: [], groups: [], expenses: [] });

  const { users } = await collections();
  await upsertUser(users, user.uid, { name: user.name, email: user.email, photoURL: user.picture });
  return NextResponse.json(await buildState(user.uid));
}
