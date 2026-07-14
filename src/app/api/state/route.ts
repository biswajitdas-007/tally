import { NextResponse } from "next/server";
import { getDb, isDbConfigured } from "@/lib/mongodb";
import { verifyUid } from "@/lib/auth-server";
import type { Expense, Group, Invite, Person } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface StateDoc {
  _id: string;
  people: Person[];
  groups: Group[];
  expenses: Expense[];
  invites: Invite[];
  updatedAt?: Date;
}

const EMPTY = { people: [], groups: [], expenses: [], invites: [] };

export async function GET(req: Request) {
  const uid = await verifyUid(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isDbConfigured) return NextResponse.json(EMPTY);

  const db = await getDb();
  const doc = await db.collection<StateDoc>("states").findOne({ _id: uid });
  return NextResponse.json({
    people: doc?.people ?? [],
    groups: doc?.groups ?? [],
    expenses: doc?.expenses ?? [],
    invites: doc?.invites ?? [],
  });
}

export async function PUT(req: Request) {
  const uid = await verifyUid(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isDbConfigured) return NextResponse.json({ ok: false, error: "db-not-configured" }, { status: 503 });

  const body = (await req.json().catch(() => null)) as Partial<StateDoc> | null;
  if (!body) return NextResponse.json({ error: "bad-request" }, { status: 400 });

  const db = await getDb();
  await db.collection<StateDoc>("states").updateOne(
    { _id: uid },
    {
      $set: {
        people: body.people ?? [],
        groups: body.groups ?? [],
        expenses: body.expenses ?? [],
        invites: body.invites ?? [],
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );
  return NextResponse.json({ ok: true });
}
