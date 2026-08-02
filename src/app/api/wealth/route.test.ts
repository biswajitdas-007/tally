import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Account, Liability } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  verifyUser: vi.fn(),
  collections: vi.fn(),
}));

vi.mock("@/lib/auth-server", () => ({ verifyUser: mocks.verifyUser }));
vi.mock("@/lib/db", () => ({ collections: mocks.collections }));

import { POST } from "./route";

const UID = "user-1";
const NOW = new Date("2026-08-03T06:30:00.000Z");

const account: Account = {
  id: "account-1",
  name: "Salary account",
  kind: "bank",
  balance: 25_000,
};

const loan = (patch: Partial<Liability> = {}): Liability => ({
  id: "loan-1",
  name: "Home loan",
  kind: "loan",
  outstanding: 100_000,
  emi: 10_000,
  termMonths: 12,
  emisPaid: 2,
  dueDay: 3,
  lastPaidMonth: "2026-07",
  ...patch,
});

function request(body: unknown): Request {
  return new Request("https://tally.test/api/wealth", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function usersWith(current: unknown[] | undefined = [], matchedCount = 1) {
  return {
    findOne: vi.fn().mockResolvedValue(
      current === undefined ? null : { _id: UID, liabilities: current },
    ),
    updateOne: vi.fn().mockResolvedValue({ matchedCount }),
  };
}

describe("POST /api/wealth", () => {
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

  it("updates accounts without reading or writing liabilities", async () => {
    const users = usersWith();
    mocks.collections.mockResolvedValue({ users });

    const response = await POST(request({ accounts: [account] }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(users.findOne).not.toHaveBeenCalled();
    expect(users.updateOne).toHaveBeenCalledWith(
      { _id: UID },
      { $set: { accounts: [account] } },
      { upsert: true },
    );
  });

  it("uses the exact raw liability array for CAS when expected liabilities match", async () => {
    const rawCurrent = [{ ...loan(), remainingMonths: 10 }];
    const incoming = [
      loan({ outstanding: 90_000, emisPaid: 3, lastPaidMonth: "2026-08" }),
    ];
    const users = usersWith(rawCurrent);
    mocks.collections.mockResolvedValue({ users });

    const response = await POST(
      request({ liabilities: incoming, expectedLiabilities: [loan()] }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(users.updateOne).toHaveBeenCalledWith(
      { _id: UID, liabilities: rawCurrent },
      { $set: { liabilities: incoming } },
      { upsert: false },
    );
  });

  it("rejects a stale expected liability snapshot without writing", async () => {
    const users = usersWith([loan()]);
    mocks.collections.mockResolvedValue({ users });

    const response = await POST(
      request({
        liabilities: [loan({ outstanding: 90_000 })],
        expectedLiabilities: [loan({ outstanding: 99_999 })],
      }),
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "liabilities-conflict" });
    expect(users.updateOne).not.toHaveBeenCalled();
  });

  it("allows an old client to update accounts when its liabilities are unchanged", async () => {
    const rawCurrent = [{ ...loan(), remainingMonths: 10 }];
    const users = usersWith(rawCurrent);
    mocks.collections.mockResolvedValue({ users });

    const response = await POST(
      request({ accounts: [account], liabilities: [loan()] }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(users.updateOne).toHaveBeenCalledWith(
      { _id: UID },
      { $set: { accounts: [account] } },
      { upsert: true },
    );
  });

  it("requires an old client to reload before replacing changed liabilities", async () => {
    const users = usersWith([loan()]);
    mocks.collections.mockResolvedValue({ users });

    const response = await POST(
      request({
        accounts: [account],
        liabilities: [loan({ outstanding: 90_000 })],
      }),
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "liabilities-reload-required",
    });
    expect(users.updateOne).not.toHaveBeenCalled();
  });

  it("returns a conflict when the raw-array CAS loses a concurrent race", async () => {
    const rawCurrent = [{ ...loan(), remainingMonths: 10 }];
    const incoming = [
      loan({ outstanding: 90_000, emisPaid: 3, lastPaidMonth: "2026-08" }),
    ];
    const users = usersWith(rawCurrent, 0);
    mocks.collections.mockResolvedValue({ users });

    const response = await POST(
      request({ liabilities: incoming, expectedLiabilities: [loan()] }),
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "liabilities-conflict" });
    expect(users.updateOne).toHaveBeenCalledWith(
      { _id: UID, liabilities: rawCurrent },
      { $set: { liabilities: incoming } },
      { upsert: false },
    );
  });
});
