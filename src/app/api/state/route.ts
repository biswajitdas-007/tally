import { NextResponse } from "next/server";
import { verifyUser } from "@/lib/auth-server";
import { buildState, collections, upsertUser } from "@/lib/db";
import { isDbConfigured } from "@/lib/mongodb";
import { sendWelcomeEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await verifyUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isDbConfigured) return NextResponse.json({ me: null, people: [], groups: [], expenses: [] });

  const { users } = await collections();
  const { isNew } = await upsertUser(users, user.uid, { name: user.name, email: user.email, photoURL: user.picture });

  if (isNew && user.email) {
    await sendWelcomeEmail(user.email, user.name || "there").catch(console.error);
  }

  return NextResponse.json(await buildState(user.uid));
}
