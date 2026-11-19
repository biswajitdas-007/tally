import { describe, expect, it } from "vitest";
import { buildSnapshot, compareSnapshots, hashDoc, stableStringify, verifySnapshot, type RawLedger, type Snapshot } from "./ledger-snapshot";

/**
 * A small but representative ledger: a group with a settlement, a direct split,
 * a repeating split, a pending (placeholder) member, a removed friend and a
 * legacy `accountId` on an expense.
 */
function fixture(): RawLedger {
  return {
    users: [
      { _id: "me", name: "Me", upiId: "me@okaxis", contacts: [{ id: "a" }], removedFriends: ["z"] },
      { _id: "a", name: "A" },
      { _id: "b", name: "B" },
    ],
    groups: [
      {
        _id: "g1", name: "Goa", icon: "🏖", color: "#000", createdBy: "me", createdAt: "2026-01-01",
        members: [{ id: "me" }, { id: "a" }, { id: "b" }, { id: "p_x", pending: true }], memberUids: ["me", "a", "b"],
      },
    ],
    expenses: [
      {
        _id: "e1", groupId: "g1", memberUids: ["me", "a", "b"], description: "Hotel", amount: 900, category: "travel",
        paidBy: "me", splits: [{ personId: "me", amount: 300 }, { personId: "a", amount: 300 }, { personId: "b", amount: 300 }],
        date: "2026-01-02", createdBy: "me", createdAt: "2026-01-02", accountId: "acc_hdfc",
      },
      {
        _id: "e2", groupId: "g1", memberUids: ["me", "a", "b"], description: "Settle", amount: 300, category: "other",
        paidBy: "a", splits: [{ personId: "me", amount: 300 }], isSettlement: true,
        date: "2026-01-05", createdBy: "a", createdAt: "2026-01-05",
      },
      {
        _id: "e3", groupId: null, memberUids: ["me", "b"], description: "Lunch", amount: 400, category: "food",
        paidBy: "b", splits: [{ personId: "me", amount: 200 }, { personId: "b", amount: 200 }],
        date: "2026-01-06", createdBy: "b", createdAt: "2026-01-06", recurring: "monthly", recurringLast: "2026-01",
      },
    ],
    invites: [
      { _id: "i1", email: "c@x.com", groupId: "g1", groupName: "Goa", groupIcon: null, inviterUid: "me", inviterName: "Me", status: "pending", createdAt: new Date("2026-01-03T00:00:00Z") },
    ],
  };
}

const snap = (raw: RawLedger, label = "t"): Snapshot => buildSnapshot(raw, label, "2026-01-10T00:00:00.000Z");

describe("stableStringify / hashDoc", () => {
  it("is independent of key order and treats Dates like their JSON form", () => {
    expect(stableStringify({ b: 1, a: [2, { d: 1, c: 2 }] })).toBe(stableStringify({ a: [2, { c: 2, d: 1 }], b: 1 }));
    const d = new Date("2026-01-03T00:00:00Z");
    expect(stableStringify({ at: d })).toBe(stableStringify(JSON.parse(JSON.stringify({ at: d }))));
  });

  it("ignores only the listed fields", () => {
    const doc = { _id: "e", amount: 1, accountId: "x" };
    expect(hashDoc(doc, ["accountId"])).toBe(hashDoc({ _id: "e", amount: 1 }, ["accountId"]));
    expect(hashDoc(doc)).not.toBe(hashDoc({ _id: "e", amount: 1 }));
  });
});

describe("buildSnapshot", () => {
  it("computes the same balances the app shows", () => {
    const s = snap(fixture());
    expect(s.counts).toEqual({ users: 3, groups: 1, expenses: 3, invites: 1 });
    // Group: me paid 900, consumed 300, received a 300 settlement from A → B owes me 300.
    // Direct: B paid 400 lunch, my share 200 → I owe B 200.
    const me = s.balances.me;
    expect(me.expenses).toBe(2);
    expect(me.settlements).toBe(1);
    expect(me.direct).toBe(1);
    expect(me.overview.group.owedToYou).toBe(300);
    expect(me.overview.direct.youOwe).toBe(200);
    expect(s.groups.g1.plan).toEqual([{ from: "b", to: "me", amount: 300 }]);
  });

  it("survives a round-trip through disk unchanged", () => {
    const s = snap(fixture());
    const reread = JSON.parse(JSON.stringify(s)) as Snapshot;
    expect(verifySnapshot(reread).errors).toEqual([]);
    expect(compareSnapshots(s, reread)).toMatchObject({ errors: [], review: [] });
  });
});

describe("compareSnapshots", () => {
  it("reports nothing for identical data", () => {
    const f = compareSnapshots(snap(fixture()), snap(fixture()));
    expect(f.errors).toEqual([]);
    expect(f.review).toEqual([]);
  });

  it("does not count dropping the legacy accountId as a change", () => {
    const after = fixture();
    delete after.expenses[0].accountId;
    const f = compareSnapshots(snap(fixture()), snap(after));
    expect(f).toMatchObject({ errors: [], review: [] });
  });

  it("flags a tampered amount", () => {
    const after = fixture();
    after.expenses[0].amount = 901;
    const f = compareSnapshots(snap(fixture()), snap(after));
    expect(f.review.join()).toContain("expenses: 1 changed — e1");
  });

  it("flags a deleted expense, group or invite", () => {
    const after = fixture();
    after.expenses = after.expenses.filter((e) => e._id !== "e2");
    after.groups = [];
    after.invites = [];
    const f = compareSnapshots(snap(fixture()), snap(after));
    expect(f.review.join("|")).toContain("expenses: 1 removed — e2");
    expect(f.review.join("|")).toContain("groups: 1 removed — g1");
    expect(f.review.join("|")).toContain("invites: 1 removed — i1");
  });

  it("flags lost friends", () => {
    const after = fixture();
    after.users[0].contacts = [];
    expect(compareSnapshots(snap(fixture()), snap(after)).review.join()).toContain("users: 1 changed — me");
  });

  it("treats new expenses as info and skips balance checks only for affected users", () => {
    const after = fixture();
    after.expenses.push({
      _id: "e4", groupId: null, memberUids: ["a", "b"], description: "Cab", amount: 100, category: "travel",
      paidBy: "a", splits: [{ personId: "b", amount: 100 }], date: "2026-01-08", createdBy: "a", createdAt: "2026-01-08",
    });
    const f = compareSnapshots(snap(fixture()), snap(after));
    expect(f.errors).toEqual([]);
    expect(f.review).toEqual([]);
    expect(f.info.join("|")).toContain("expenses: 1 added");
    expect(f.info.join("|")).toContain("2 user(s) skipped");
  });

  it("errors when balances move although the data did not", () => {
    const before = snap(fixture());
    const after = snap(fixture());
    after.balances.me.overview.all.net += 50; // simulate a logic regression
    after.groups.g1.plan = [];
    const f = compareSnapshots(before, after);
    expect(f.errors).toContain("balances changed for user me with no change to their expenses");
    expect(f.errors).toContain("settle-up plan changed for group g1 with no change to its expenses");
  });
});

describe("verifySnapshot", () => {
  it("passes when the current code computes what was recorded", () => {
    const f = verifySnapshot(snap(fixture()));
    expect(f.errors).toEqual([]);
    expect(f.info[0]).toBe("checked 3 user(s) and 1 group(s)");
  });

  it("fails when recorded balances differ from what the code computes now", () => {
    const s = snap(fixture());
    s.balances.b.debts = [];
    expect(verifySnapshot(s).errors).toEqual(["current code computes different balances for user b"]);
  });
});
