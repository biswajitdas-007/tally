import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  expensesFind: vi.fn(),
  calls: [] as { coll: string; op: string; args: unknown[] }[],
}));

const coll = (name: string) =>
  new Proxy({} as Record<string, unknown>, {
    get: (_t, op: string) =>
      op === "find"
        ? db.expensesFind
        : vi.fn(async (...args: unknown[]) => {
            db.calls.push({ coll: name, op, args });
            return { deletedCount: 0, modifiedCount: 0 };
          }),
  });

vi.mock("./mongodb", () => ({ getDb: async () => ({ collection: (n: string) => coll(n) }) }));
vi.mock("./db", () => ({
  collections: async () => ({ users: coll("users"), groups: coll("groups"), expenses: coll("expenses"), invites: coll("invites") }),
}));

import { isOpen, outstandingBalances, purgeAccount } from "./delete-account";

const exp = (o: Record<string, unknown>) => ({ description: "", category: "food", date: "", createdBy: "me", createdAt: "", ...o });

describe("account deletion", () => {
  beforeEach(() => {
    db.calls.length = 0;
    db.expensesFind.mockReset();
  });

  it("treats offsetting balances in different ledgers as still open", async () => {
    // I'm owed 500 by A in group 1 and owe A 500 in group 2: nets to zero, but both groups show a debt.
    db.expensesFind.mockReturnValue({
      toArray: async () => [
        exp({ _id: "e1", groupId: "g1", amount: 500, paidBy: "me", splits: [{ personId: "A", amount: 500 }] }),
        exp({ _id: "e2", groupId: "g2", amount: 500, paidBy: "A", splits: [{ personId: "me", amount: 500 }] }),
      ],
    });
    expect(await outstandingBalances("me")).toEqual({ people: 1, amount: 1000 });
    expect(isOpen({ personId: "A", total: 0, scopes: [{ scopeId: "g1", amount: 500 }, { scopeId: "g2", amount: -500 }] })).toBe(true);
    expect(isOpen({ personId: "A", total: 0, scopes: [] })).toBe(false);
  });

  it("removes the user's invites, stops their repeats and hands their groups on", async () => {
    await purgeAccount("me");
    const find = (c: string, op: string) => db.calls.filter((x) => x.coll === c && x.op === op).map((x) => x.args[0]);
    expect(find("invites", "deleteMany")).toContainEqual({ inviterUid: "me" });
    expect(find("expenses", "updateMany")).toContainEqual({ createdBy: "me", recurring: { $in: ["monthly", "weekly"] } });
    expect(find("groups", "updateMany")).toContainEqual({ createdBy: "me", "memberUids.0": { $exists: true } });
  });
});
