import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Liability } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  verifyUser: vi.fn(),
  collections: vi.fn(),
}));

vi.mock("@/lib/auth-server", () => ({ verifyUser: mocks.verifyUser }));
vi.mock("@/lib/db", () => ({ collections: mocks.collections }));

import { POST } from "./route";

const UID = "user-1";
const NOW = new Date("2026-08-03T06:30:00.000Z"); // 12:00 in Asia/Kolkata

const loan = (patch: Partial<Liability> = {}): Liability => ({
  id: "loan-target",
  name: "Home loan",
  kind: "loan",
  outstanding: 100_000,
  emi: 10_000,
  termMonths: 12,
  emisPaid: 2,
  dueDay: 3,
  lastPaidMonth: "2026-05",
  ...patch,
});

const otherLoan = loan({
  id: "loan-other",
  name: "Other loan",
  outstanding: 50_000,
  lastPaidMonth: "2026-07",
});

function request(body: unknown): Request {
  return new Request("https://tally.test/api/liabilities/loan-target/confirm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function context(id = "loan-target") {
  return { params: Promise.resolve({ id }) };
}

function usersWithReads(reads: unknown[], modifiedCounts: number[] = [1]) {
  return {
    findOne: vi.fn().mockImplementation(async () => reads.shift() ?? null),
    updateOne: vi.fn().mockImplementation(async () => ({ modifiedCount: modifiedCounts.shift() ?? 0 })),
  };
}

describe("POST /api/liabilities/[id]/confirm", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    mocks.verifyUser.mockReset();
    mocks.collections.mockReset();
    mocks.verifyUser.mockResolvedValue({ uid: UID });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects an unauthenticated request before touching the database", async () => {
    mocks.verifyUser.mockResolvedValue(null);

    const response = await POST(request({ period: "2026-08" }), context());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthorized" });
    expect(mocks.collections).not.toHaveBeenCalled();
  });

  it.each([
    ["an invalid liability id", context("x".repeat(41)), { period: "2026-08" }, "bad-request"],
    ["a malformed period", context(), { period: "2026-13" }, "bad-period"],
    ["an object-valued period", context(), { period: { $gt: "" } }, "bad-period"],
  ])("rejects %s", async (_label, routeContext, body, error) => {
    const response = await POST(request(body), routeContext);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error });
    expect(mocks.collections).not.toHaveBeenCalled();
  });

  it("applies every overdue EMI with a conditional update scoped to the user and target liability", async () => {
    const current = loan();
    const updated = loan({ outstanding: 70_000, emisPaid: 5, lastPaidMonth: "2026-08" });
    const users = usersWithReads([
      { _id: UID, liabilities: [otherLoan, current] },
      { _id: UID, liabilities: [otherLoan, updated] },
    ]);
    mocks.collections.mockResolvedValue({ users });

    const response = await POST(request({ period: "2026-08" }), context());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      liability: updated,
      applied: ["2026-06", "2026-07", "2026-08"],
    });
    expect(users.updateOne).toHaveBeenCalledOnce();
    expect(users.updateOne).toHaveBeenCalledWith(
      {
        _id: UID,
        liabilities: {
          $elemMatch: {
            id: "loan-target",
            autoDebit: { $ne: true },
            emi: 10_000,
            termMonths: 12,
            outstanding: 100_000,
            lastPaidMonth: "2026-05",
            emisPaid: 2,
            dueDay: 3,
          },
        },
      },
      {
        $set: {
          "liabilities.$.emisPaid": 5,
          "liabilities.$.outstanding": 70_000,
          "liabilities.$.lastPaidMonth": "2026-08",
        },
        $unset: { "liabilities.$.remainingMonths": "" },
      },
    );
  });

  it("migrates a legacy remainingMonths value without resetting paid progress", async () => {
    const legacy = {
      ...loan({ outstanding: 20_000, emisPaid: undefined, lastPaidMonth: "2026-07" }),
      remainingMonths: 2,
    };
    const updated = loan({ outstanding: 10_000, emisPaid: 11, lastPaidMonth: "2026-08" });
    const users = usersWithReads([
      { _id: UID, liabilities: [legacy] },
      { _id: UID, liabilities: [updated] },
    ]);
    mocks.collections.mockResolvedValue({ users });

    const response = await POST(request({ period: "2026-08" }), context());

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      liability: { emisPaid: 11, outstanding: 10_000, lastPaidMonth: "2026-08" },
      applied: ["2026-08"],
    });
    expect(users.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: UID }),
      expect.objectContaining({
        $set: expect.objectContaining({ "liabilities.$.emisPaid": 11 }),
        $unset: { "liabilities.$.remainingMonths": "" },
      }),
    );
  });

  it("does not treat a malformed stored cursor as already handled", async () => {
    const malformed = loan({ lastPaidMonth: "not-a-period", emisPaid: 2 });
    const updated = loan({ lastPaidMonth: "2026-08", emisPaid: 3, outstanding: 90_000 });
    const users = usersWithReads([
      { _id: UID, liabilities: [malformed] },
      { _id: UID, liabilities: [updated] },
    ]);
    mocks.collections.mockResolvedValue({ users });

    const response = await POST(request({ period: "2026-08" }), context());

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      liability: updated,
      applied: ["2026-08"],
    });
    expect(users.updateOne).toHaveBeenCalledOnce();
  });

  it("returns an idempotent success for a repeated confirmation without writing again", async () => {
    const handled = loan({ lastPaidMonth: "2026-08", emisPaid: 3, outstanding: 90_000 });
    const users = usersWithReads([{ _id: UID, liabilities: [handled] }]);
    mocks.collections.mockResolvedValue({ users });

    const response = await POST(request({ period: "2026-08" }), context());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      liability: handled,
      applied: [],
      alreadyHandled: true,
    });
    expect(users.updateOne).not.toHaveBeenCalled();
  });

  it.each([
    ["an auto-debit liability", loan({ autoDebit: true, lastPaidMonth: "2026-07" }), "2026-08"],
    ["a future period", loan({ lastPaidMonth: "2026-07" }), "2026-09"],
  ])("rejects %s as not due", async (_label, current, period) => {
    const users = usersWithReads([{ _id: UID, liabilities: [current] }]);
    mocks.collections.mockResolvedValue({ users });

    const response = await POST(request({ period }), context());

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "not-due" });
    expect(users.updateOne).not.toHaveBeenCalled();
  });

  it("returns a conflict after three conditional updates lose their race", async () => {
    const current = loan();
    const users = usersWithReads(
      [
        { _id: UID, liabilities: [current] },
        { _id: UID, liabilities: [current] },
        { _id: UID, liabilities: [current] },
      ],
      [0, 0, 0],
    );
    mocks.collections.mockResolvedValue({ users });

    const response = await POST(request({ period: "2026-08" }), context());

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "conflict" });
    expect(users.findOne).toHaveBeenCalledTimes(3);
    expect(users.updateOne).toHaveBeenCalledTimes(3);
  });
});
