import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dependencies = vi.hoisted(() => ({
  collections: vi.fn(),
  sendPush: vi.fn(),
  sendSettleReminderEmail: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ collections: dependencies.collections }));
vi.mock("@/lib/webpush", () => ({ sendPush: dependencies.sendPush }));
vi.mock("@/lib/reminder-email", () => ({ sendSettleReminderEmail: dependencies.sendSettleReminderEmail }));

import { runDaily } from "./cron-daily";

const sub = { endpoint: "https://push.test/device", keys: { p256dh: "public", auth: "auth" } };

function pushResult(sent: number, failed = 0, deadEndpoints: string[] = []) {
  return Object.assign(deadEndpoints, { sent, failed, dead: deadEndpoints.length });
}

function request() {
  return new Request("https://tally.test/api/cron/daily", { headers: { authorization: "Bearer test-secret" } });
}

describe("repeating split expenses", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv("CRON_SECRET", "test-secret");
    dependencies.collections.mockReset();
    dependencies.sendPush.mockReset().mockResolvedValue(pushResult(0));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("copies the split unchanged but no longer carries the legacy account link", async () => {
    vi.setSystemTime(new Date("2026-08-10T04:00:00.000Z"));
    const source = {
      _id: "e-rent",
      groupId: "g-flat",
      memberUids: ["user-1", "user-2"],
      description: "Rent",
      amount: 30_000,
      category: "rent",
      paidBy: "user-1",
      splits: [{ personId: "user-1", amount: 15_000 }, { personId: "user-2", amount: 15_000 }],
      date: "2026-07-05T00:00:00.000Z",
      recurring: "monthly",
      recurringLast: "2026-07",
      isSettlement: false,
      createdBy: "user-1",
      createdAt: "2026-07-05T00:00:00.000Z",
      accountId: "acc-hdfc",
    };
    const inserted: Record<string, unknown>[] = [];
    const expenses = {
      find: vi.fn((query: Record<string, unknown>) => ({ toArray: async () => ("recurring" in query ? [source] : []) })),
      insertMany: vi.fn(async (docs: Record<string, unknown>[]) => inserted.push(...docs)),
      updateOne: vi.fn(async () => ({ modifiedCount: 1 })),
    };
    const users = {
      find: vi.fn(() => ({ toArray: async () => [] })),
      updateOne: vi.fn(async () => ({ modifiedCount: 1 })),
    };
    dependencies.collections.mockResolvedValue({ users, expenses, finance: {} });

    const res = await (await runDaily(request())).json();

    expect(res.repeated).toBe(1);
    expect(inserted).toHaveLength(1);
    const copy = inserted[0];
    expect(copy).toMatchObject({
      groupId: "g-flat",
      memberUids: ["user-1", "user-2"],
      amount: 30_000,
      paidBy: "user-1",
      splits: source.splits,
      recurring: "none",
    });
    expect(copy).not.toHaveProperty("accountId");
    expect(copy).not.toHaveProperty("recurringLast");
    expect(expenses.updateOne).toHaveBeenCalledWith({ _id: "e-rent" }, { $set: { recurringLast: "2026-08" } });
  });
});

describe("monthly settle-up reminders", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv("CRON_SECRET", "test-secret");
    dependencies.collections.mockReset();
    dependencies.sendPush.mockReset().mockResolvedValue(pushResult(1));
    dependencies.sendSettleReminderEmail.mockReset().mockResolvedValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  function ledger() {
    // user-1 paid 1,000 for dinner split evenly with user-2 → user-2 owes 500.
    const dinner = {
      _id: "e-dinner", groupId: null, memberUids: ["user-1", "user-2"], description: "Dinner", amount: 1_000,
      category: "food", paidBy: "user-1", splits: [{ personId: "user-1", amount: 500 }, { personId: "user-2", amount: 500 }],
      date: "2026-07-20T00:00:00.000Z", recurring: "none", createdBy: "user-1", createdAt: "2026-07-20T00:00:00.000Z",
    };
    const people = [
      { _id: "user-1", name: "Asha", email: "asha@tally.test", pushSubs: [sub] },
      { _id: "user-2", name: "Ravi", email: "ravi@tally.test", pushSubs: [sub] },
      { _id: "user-3", name: "Square", email: "sq@tally.test", pushSubs: [sub] },
    ];
    const users = {
      find: vi.fn(() => ({ toArray: async () => people })),
      updateOne: vi.fn(async () => ({ modifiedCount: 1 })),
      updateMany: vi.fn(async () => ({ modifiedCount: 0 })),
    };
    const expenses = {
      find: vi.fn((query: Record<string, unknown>) => ({
        toArray: async () => {
          if ("recurring" in query) return [];
          const uid = query.memberUids as string;
          return uid === "user-3" ? [] : [dinner];
        },
      })),
    };
    dependencies.collections.mockResolvedValue({ users, expenses });
  }

  it("nudges both sides of an open balance on the 1st, and nobody who is square", async () => {
    vi.setSystemTime(new Date("2026-08-01T04:00:00.000Z"));
    ledger();

    const res = await (await runDaily(request())).json();

    expect(res).toMatchObject({ ok: true, repeated: 0, settleReminders: 2 });
    expect(dependencies.sendSettleReminderEmail).toHaveBeenCalledWith("asha@tally.test", "Asha", { owedToYou: 500, youOwe: 0, people: 1 });
    expect(dependencies.sendSettleReminderEmail).toHaveBeenCalledWith("ravi@tally.test", "Ravi", { owedToYou: 0, youOwe: 500, people: 1 });
    expect(dependencies.sendSettleReminderEmail).toHaveBeenCalledTimes(2);
  });

  it("stays quiet on other days of the month", async () => {
    vi.setSystemTime(new Date("2026-08-02T04:00:00.000Z"));
    ledger();

    const res = await (await runDaily(request())).json();

    expect(res.settleReminders).toBe(0);
    expect(dependencies.sendSettleReminderEmail).not.toHaveBeenCalled();
  });
});
