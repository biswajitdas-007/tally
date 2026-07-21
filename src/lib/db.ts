import type { Collection } from "mongodb";
import { getDb } from "./mongodb";
import type { Account, Budget, Expense, FinanceEntry, Group, Liability, Person } from "./types";
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
  removedFriends?: string[]; // friend ids hidden from your list after removal
  pushSubs?: PushSubscription[];
  budget?: Budget;
  accounts?: Account[];
  liabilities?: Liability[];
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
  accountId?: string;
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
  accountId?: string;
  transfer?: boolean;
  payeeVpa?: string;
  payeeName?: string;
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
    accountId: e.accountId,
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
    accountId: f.accountId,
    transfer: f.transfer,
    payeeVpa: f.payeeVpa,
    payeeName: f.payeeName,
  };
}

export interface ClientState {
  me: Person;
  people: Person[];
  groups: Group[];
  expenses: Expense[];
  finance: FinanceEntry[];
  budget: Budget;
  accounts: Account[];
  liabilities: Liability[];
  removedFriends: string[];
}

/** The full view for one user: profile, everyone they share with, groups, expenses. */
export async function buildState(uid: string): Promise<ClientState> {
  const { users, groups, expenses, finance } = await collections();
  const meDoc = ((await users.findOne({ _id: uid })) ?? { _id: uid, name: "You" }) as UserDoc;

  const groupDocs = await groups.find({ memberUids: uid }).toArray();
  const expenseDocs = await expenses.find({ memberUids: uid }).sort({ date: -1 }).toArray();
  const financeDocs = await finance.find({ uid }).sort({ date: -1 }).toArray();

  // Self-heal: expenses where I'm a party (someone put me in a split / paid me)
  // but I'm missing from memberUids — e.g. a direct split created while a
  // contacts-only friendship was wrongly excluded. Only heal ones created by
  // someone in my circle, so a stranger can never inject into my ledger.
  const orphans = await expenses
    .find({ memberUids: { $ne: uid }, $or: [{ paidBy: uid }, { "splits.personId": uid }] })
    .toArray();
  if (orphans.length) {
    const circle = await knownUids(uid);
    const heal = orphans.filter((e) => circle.has(e.createdBy));
    if (heal.length) {
      await expenses.updateMany({ _id: { $in: heal.map((e) => e._id) } }, { $addToSet: { memberUids: uid } });
      expenseDocs.push(...heal);
      expenseDocs.sort((a, b) => (a.date < b.date ? 1 : -1));
    }
  }

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
    budget: meDoc.budget ?? { limits: {} },
    accounts: meDoc.accounts ?? [],
    liabilities: (meDoc.liabilities ?? []).map(normalizeLiability),
    removedFriends: meDoc.removedFriends ?? [],
  };
}

/**
 * Add (or refresh) a person in someone's contacts, and clear them from the
 * owner's removed-friends set — used when an invite is accepted so both sides
 * see each other as friends again.
 */
export async function addContact(
  users: Collection<UserDoc>,
  ownerUid: string,
  person: Person,
): Promise<void> {
  await users.updateOne(
    { _id: ownerUid },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { $pull: { contacts: { id: person.id }, removedFriends: person.id } } as any,
  );
  await users.updateOne({ _id: ownerUid }, { $push: { contacts: person } });
}

/** Migrate legacy loans that stored "remaining months" to the "EMIs paid" model. */
function normalizeLiability(l: Liability): Liability {
  const legacy = l as Liability & { remainingMonths?: number };
  if (l.emisPaid == null && l.termMonths != null && legacy.remainingMonths != null) {
    return { ...l, emisPaid: Math.max(0, l.termMonths - legacy.remainingMonths) };
  }
  return l;
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

/**
 * The actor's trust circle (incl. self): everyone they share a group with, plus
 * their contacts. Contacts are only ever written when an invite is mutually
 * accepted, so a friend you share no group with still counts — which is what
 * lets a direct (non-group) split with them be visible to both sides.
 */
export async function knownUids(actorUid: string): Promise<Set<string>> {
  const { groups, users } = await collections();
  const gs = await groups.find({ memberUids: actorUid }, { projection: { memberUids: 1 } }).toArray();
  const set = new Set<string>([actorUid]);
  for (const g of gs) for (const u of g.memberUids) set.add(u);
  const me = await users.findOne({ _id: actorUid }, { projection: { contacts: 1 } });
  for (const c of me?.contacts ?? []) if (c.id) set.add(c.id);
  return set;
}
