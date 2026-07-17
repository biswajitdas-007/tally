import type { Collection } from "mongodb";
import { getDb } from "./mongodb";
import type { Expense, FinanceEntry, Group, Person } from "./types";
import type { PushSubscription } from "web-push";

/* ---------- server document shapes ---------- */

export interface UserDoc {
  _id: string; // Firebase uid
  name: string;
  email?: string;
  photoURL?: string;
  upiId?: string;
  avatarColor?: string;
  contacts?: Person[];
  pushSubs?: PushSubscription[];
  updatedAt?: Date;
}

export interface GroupDoc {
  _id: string;
  name: string;
  icon: string;
  color: string;
  members: Person[]; // member.id === uid for real users; pending members are placeholders
  memberUids: string[]; // real (non-pending) member uids — for queries + notifications
  createdBy: string;
  createdAt: string;
}

export interface ExpenseDoc {
  _id: string;
  groupId: string | null;
  memberUids: string[]; // uids who can see this expense + get notified
  description: string;
  amount: number;
  category: Expense["category"];
  paidBy: string;
  splits: Expense["splits"];
  date: string;
  notes?: string;
  recurring?: Expense["recurring"];
  isSettlement?: boolean;
  createdBy: string;
  createdAt: string;
}

/** Private personal money entry — belongs to exactly one user, never shared. */
export interface FinanceDoc {
  _id: string;
  uid: string;
  type: FinanceEntry["type"];
  amount: number;
  category: string;
  date: string;
  note?: string;
  createdAt: string;
}

export async function collections() {
  const db = await getDb();
  return {
    users: db.collection<UserDoc>("users"),
    groups: db.collection<GroupDoc>("groups"),
    expenses: db.collection<ExpenseDoc>("expenses"),
    finance: db.collection<FinanceDoc>("finance"),
    invites: db.collection<{ _id: string }>("invites"),
  };
}

export function realUids(members: Person[]): string[] {
  return [...new Set(members.filter((m) => !m.pending).map((m) => m.id))];
}

/** Ensure a user profile exists / is refreshed from the auth profile. */
export async function upsertUser(
  users: Collection<UserDoc>,
  uid: string,
  profile: { name?: string; email?: string; photoURL?: string },
): Promise<UserDoc> {
  await users.updateOne(
    { _id: uid },
    {
      $set: {
        name: profile.name || "You",
        email: profile.email,
        photoURL: profile.photoURL,
        updatedAt: new Date(),
      },
      $setOnInsert: { avatarColor: "#1c6b52" },
    },
    { upsert: true },
  );
  return (await users.findOne({ _id: uid }))!;
}

function toPerson(u: UserDoc, isYou: boolean): Person {
  return {
    id: u._id,
    name: u.name,
    email: u.email,
    photoURL: u.photoURL,
    upiId: u.upiId,
    avatarColor: u.avatarColor ?? "#1c6b52",
    isYou,
  };
}

function toClientGroup(g: GroupDoc): Group {
  return {
    id: g._id,
    name: g.name,
    icon: g.icon,
    color: g.color,
    memberIds: g.members.map((m) => m.id),
    createdAt: g.createdAt,
  };
}

function toClientExpense(e: ExpenseDoc): Expense {
  return {
    id: e._id,
    groupId: e.groupId,
    description: e.description,
    amount: e.amount,
    category: e.category,
    paidBy: e.paidBy,
    splits: e.splits,
    date: e.date,
    notes: e.notes,
    recurring: e.recurring,
    isSettlement: e.isSettlement,
    createdBy: e.createdBy,
    createdAt: e.createdAt,
  };
}

function toClientFinance(f: FinanceDoc): FinanceEntry {
  return {
    id: f._id,
    type: f.type,
    amount: f.amount,
    category: f.category,
    date: f.date,
    note: f.note,
    createdAt: f.createdAt,
  };
}

export interface ClientState {
  me: Person;
  people: Person[];
  groups: Group[];
  expenses: Expense[];
  finance: FinanceEntry[];
}

/** The full view for one user: profile, everyone they share with, groups, expenses. */
export async function buildState(uid: string): Promise<ClientState> {
  const { users, groups, expenses, finance } = await collections();
  const meDoc = ((await users.findOne({ _id: uid })) ?? { _id: uid, name: "You" }) as UserDoc;

  const groupDocs = await groups.find({ memberUids: uid }).toArray();
  const expenseDocs = await expenses.find({ memberUids: uid }).sort({ date: -1 }).toArray();
  const financeDocs = await finance.find({ uid }).sort({ date: -1 }).toArray();

  const placeholders = new Map<string, Person>();
  const realIds = new Set<string>([uid]);
  for (const g of groupDocs) {
    for (const m of g.members) {
      if (m.pending) placeholders.set(m.id, m);
      else realIds.add(m.id);
    }
  }
  for (const e of expenseDocs) {
    for (const id of [e.paidBy, ...e.splits.map((s) => s.personId)]) {
      if (!placeholders.has(id)) realIds.add(id);
    }
  }

  const userDocs = await users.find({ _id: { $in: [...realIds] } }).toArray();
  const byId = new Map<string, Person>();
  for (const u of userDocs) byId.set(u._id, toPerson(u, u._id === uid));
  if (!byId.has(uid)) byId.set(uid, toPerson(meDoc, true));
  for (const [id, p] of placeholders) if (!byId.has(id)) byId.set(id, p);
  for (const c of meDoc.contacts ?? []) if (!byId.has(c.id)) byId.set(c.id, c);
  for (const id of realIds) if (!byId.has(id)) byId.set(id, { id, name: "Someone", avatarColor: "#7b8a80" });

  return {
    me: byId.get(uid)!,
    people: [...byId.values()],
    groups: groupDocs.map(toClientGroup),
    expenses: expenseDocs.map(toClientExpense),
    finance: financeDocs.map(toClientFinance),
  };
}

/** uids to notify about a change (minus the actor). */
export function membersToNotify(memberUids: string[], actorUid: string): string[] {
  return [...new Set(memberUids)].filter((u) => u !== actorUid);
}

export async function pushSubsFor(
  users: Collection<UserDoc>,
  uids: string[],
): Promise<{ uid: string; subs: PushSubscription[] }[]> {
  const docs = await users.find({ _id: { $in: uids } }).toArray();
  return docs.map((d) => ({ uid: d._id, subs: d.pushSubs ?? [] }));
}

/** Every uid the actor already shares a group with (their trust circle), incl. self. */
export async function knownUids(actorUid: string): Promise<Set<string>> {
  const { groups } = await collections();
  const gs = await groups.find({ memberUids: actorUid }, { projection: { memberUids: 1 } }).toArray();
  const set = new Set<string>([actorUid]);
  for (const g of gs) for (const u of g.memberUids) set.add(u);
  return set;
}
