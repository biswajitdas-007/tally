import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Liability } from "./types";

const dependencies = vi.hoisted(() => ({
  collections: vi.fn(),
  sendPush: vi.fn(),
  sendEmiEmail: vi.fn(),
  sendSettleReminderEmail: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ collections: dependencies.collections }));
vi.mock("@/lib/webpush", () => ({ sendPush: dependencies.sendPush }));
vi.mock("@/lib/emi-email", () => ({ sendEmiEmail: dependencies.sendEmiEmail }));
vi.mock("@/lib/reminder-email", () => ({ sendSettleReminderEmail: dependencies.sendSettleReminderEmail }));

import { runDaily } from "./cron-daily";

const sub = { endpoint: "https://push.test/device", keys: { p256dh: "public", auth: "auth" } };
const sub2 = { endpoint: "https://push.test/device-2", keys: { p256dh: "public-2", auth: "auth-2" } };

function pushResult(sent: number, failed = 0, deadEndpoints: string[] = []) {
  return Object.assign(deadEndpoints, { sent, failed, dead: deadEndpoints.length });
}

function request() {
  return new Request("https://tally.test/api/cron/daily", { headers: { authorization: "Bearer test-secret" } });
}

function setup(liabilities: Liability[], modifiedCounts: number[], pushSubs: unknown[] = [sub]) {
  const events: string[] = [];
  const updates: unknown[][] = [];
  const docs = [{ _id: "user-1", name: "Test", liabilities, pushSubs }];
  const users = {
    find: vi.fn((query: Record<string, unknown>) => ({
      toArray: async () => ("liabilities.0" in query ? docs : []),
    })),
    updateOne: vi.fn(async (...args: unknown[]) => {
      events.push("update");
      updates.push(args);
      return { modifiedCount: modifiedCounts.shift() ?? 1 };
    }),
  };
  const expenses = { find: vi.fn(() => ({ toArray: async () => [] })) };
  const finance = {};
  dependencies.collections.mockResolvedValue({ users, expenses, finance });
  dependencies.sendPush.mockImplementation(async () => {
    events.push("push");
    return pushResult(1);
  });
  return { events, updates, users };
}

const manual = (patch: Partial<Liability> = {}): Liability => ({
  id: "loan /?",
  name: "Home loan",
  kind: "loan",
  outstanding: 11_000,
  emi: 1_000,
  termMonths: 12,
  emisPaid: 1,
  dueDay: 3,
  lastPaidMonth: "2026-07",
  ...patch,
});

describe("daily EMI orchestration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv("CRON_SECRET", "test-secret");
    dependencies.collections.mockReset();
    dependencies.sendPush.mockReset();
    dependencies.sendEmiEmail.mockReset().mockResolvedValue(false);
    dependencies.sendSettleReminderEmail.mockReset().mockResolvedValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("claims a manual due event before push and rejects a concurrent stale claim", async () => {
    vi.setSystemTime(new Date("2026-08-03T04:00:00.000Z"));
    const { events, updates } = setup([manual()], [1, 0], [sub, sub2]);
    dependencies.sendPush.mockImplementation(async () => {
      events.push("push");
      return pushResult(1, 1);
    });

    const first = await (await runDaily(request())).json();
    const second = await (await runDaily(request())).json();

    expect(events).toEqual(["update", "push", "update"]);
    expect(dependencies.sendPush).toHaveBeenCalledTimes(1);
    expect(updates[0][1]).toMatchObject({
      $set: { "liabilities.$.lastEmiReminder": "loan /?:2026-08:due" },
    });
    expect(dependencies.sendPush.mock.calls[0][1]).toMatchObject({
      tag: "loan /?:2026-08:due",
      url: "/wealth?confirmEmi=loan%20%2F%3F&period=2026-08",
    });
    expect(first).toMatchObject({ reminders: 1, emiConflicts: 0, push: { sent: 1, failed: 1, dead: 0 } });
    expect(second).toMatchObject({ reminders: 0, emiConflicts: 1, push: { sent: 0, failed: 0, dead: 0 } });
  });

  it("releases a zero-success notice claim so a later invocation can retry", async () => {
    vi.setSystemTime(new Date("2026-08-03T04:00:00.000Z"));
    const { updates } = setup([manual()], [1, 1, 1]);
    dependencies.sendPush
      .mockResolvedValueOnce(pushResult(0, 1))
      .mockResolvedValueOnce(pushResult(1));

    const first = await (await runDaily(request())).json();
    const second = await (await runDaily(request())).json();

    expect(updates[1][1]).toMatchObject({ $unset: { "liabilities.$.lastEmiReminder": "" } });
    expect(dependencies.sendPush).toHaveBeenCalledTimes(2);
    expect(first).toMatchObject({ reminderReleases: 1, push: { sent: 0, failed: 1 } });
    expect(second).toMatchObject({ reminderReleases: 0, push: { sent: 1, failed: 0 } });
  });

  it("prunes an all-dead subscription before releasing the notice for retry", async () => {
    vi.setSystemTime(new Date("2026-08-03T04:00:00.000Z"));
    const { updates } = setup([manual()], [1, 1, 1]);
    dependencies.sendPush.mockResolvedValueOnce(pushResult(0, 0, [sub.endpoint]));

    const result = await (await runDaily(request())).json();

    expect(updates[1][1]).toEqual({ $pull: { pushSubs: { endpoint: { $in: [sub.endpoint] } } } });
    expect(updates[2][1]).toEqual({ $unset: { "liabilities.$.lastEmiReminder": "" } });
    expect(result).toMatchObject({ reminderReleases: 1, push: { sent: 0, failed: 0, dead: 1 } });
  });

  it("accounts for an unexpected push failure and releases the notice for retry", async () => {
    vi.setSystemTime(new Date("2026-08-03T04:00:00.000Z"));
    const { updates } = setup([manual()], [1, 1], [sub, sub, null]);
    dependencies.sendPush.mockRejectedValueOnce(new Error("push provider unavailable"));

    const result = await (await runDaily(request())).json();

    expect(updates[1][1]).toEqual({ $unset: { "liabilities.$.lastEmiReminder": "" } });
    expect(result).toMatchObject({
      reminderReleases: 1,
      push: { sent: 0, failed: 2, dead: 0, pruneFailed: 0 },
    });
  });

  it("reports a dead-endpoint prune failure without failing a successful reminder", async () => {
    vi.setSystemTime(new Date("2026-08-03T04:00:00.000Z"));
    const { users } = setup([manual()], [], [sub, sub2]);
    users.updateOne
      .mockResolvedValueOnce({ modifiedCount: 1 })
      .mockRejectedValueOnce(new Error("database unavailable"));
    dependencies.sendPush.mockResolvedValueOnce(pushResult(1, 0, [sub.endpoint]));

    const result = await (await runDaily(request())).json();

    expect(users.updateOne).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      reminders: 1,
      reminderReleases: 0,
      push: { sent: 1, failed: 0, dead: 1, pruneFailed: 1 },
    });
  });

  it("claims one upcoming notice for both manual and auto liabilities one day before", async () => {
    vi.setSystemTime(new Date("2026-08-02T04:00:00.000Z"));
    const { updates } = setup([manual({ id: "manual-1" }), manual({ id: "auto-1", autoDebit: true })], [1, 1]);

    const result = await (await runDaily(request())).json();

    expect(updates.map((args) => args[1])).toEqual([
      expect.objectContaining({ $set: { "liabilities.$.lastEmiReminder": "manual-1:2026-08:upcoming" } }),
      expect.objectContaining({ $set: { "liabilities.$.lastEmiReminder": "auto-1:2026-08:upcoming" } }),
    ]);
    expect(dependencies.sendPush.mock.calls.map((call) => call[1])).toEqual([
      expect.objectContaining({ title: "EMI due tomorrow", tag: "manual-1:2026-08:upcoming", url: "/wealth" }),
      expect.objectContaining({ title: "EMI due tomorrow", tag: "auto-1:2026-08:upcoming", url: "/wealth" }),
    ]);
    expect(result).toMatchObject({ upcomingReminders: 2, reminders: 0, push: { sent: 2, failed: 0, dead: 0 } });
  });

  it("anchors a missing manual cursor even when delivery fails and its notice claim is released", async () => {
    vi.setSystemTime(new Date("2026-08-03T04:00:00.000Z"));
    const { updates } = setup([manual({ lastPaidMonth: undefined })], [1, 1]);
    dependencies.sendPush.mockResolvedValueOnce(pushResult(0, 1));

    const result = await (await runDaily(request())).json();

    expect(updates[0][1]).toMatchObject({
      $set: {
        "liabilities.$.lastEmiReminder": "loan /?:2026-08:due",
        "liabilities.$.lastPaidMonth": "2026-07",
      },
    });
    expect(updates[1][1]).toEqual({ $unset: { "liabilities.$.lastEmiReminder": "" } });
    expect(result).toMatchObject({ updated: 1, reminderReleases: 1, push: { sent: 0, failed: 1 } });
  });

  it("keeps a claim after any endpoint succeeds and auto-debits before sending a receipt", async () => {
    vi.setSystemTime(new Date("2026-08-03T04:00:00.000Z"));
    const auto = manual({ id: "auto-1", autoDebit: true });
    const { events, updates } = setup([auto], [1]);
    dependencies.sendPush.mockImplementationOnce(async () => {
      events.push("push");
      return pushResult(1);
    });

    const result = await (await runDaily(request())).json();

    expect(events).toEqual(["update", "push"]);
    expect(updates).toHaveLength(1);
    expect(updates[0][1]).toMatchObject({
      $set: {
        "liabilities.$.emisPaid": 2,
        "liabilities.$.outstanding": 10_000,
        "liabilities.$.lastPaidMonth": "2026-08",
      },
    });
    expect(dependencies.sendPush.mock.calls[0][1]).toMatchObject({ url: "/wealth", tag: "auto-1:2026-08:paid" });
    expect(dependencies.sendPush.mock.calls[0][1].url).not.toContain("confirmEmi");
    expect(result).toMatchObject({ updated: 1, reminders: 0, push: { sent: 1, failed: 0, dead: 0 } });
  });
});
