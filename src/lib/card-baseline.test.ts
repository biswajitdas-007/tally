import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Collection } from "mongodb";
import type { Liability } from "./types";

vi.mock("./mongodb", () => ({ getDb: vi.fn(), isDbConfigured: true }));

import { baselinedCards, type UserDoc } from "./db";

const UID = "user-1";

const card = (patch: Partial<Liability> = {}): Liability => ({
  id: "card-1",
  name: "Millennia",
  kind: "card",
  outstanding: 4_000,
  limit: 50_000,
  ...patch,
});

const loan: Liability = { id: "loan-1", name: "Home loan", kind: "loan", outstanding: 90_000 };

function usersMock() {
  const updateOne = vi.fn().mockResolvedValue({ modifiedCount: 1 });
  return { updateOne } as unknown as Collection<UserDoc> & { updateOne: ReturnType<typeof vi.fn> };
}

describe("card baseline backfill", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-11T09:00:00.000Z"));
  });

  afterEach(() => vi.useRealTimers());

  it("stamps a card that has never had a baseline", async () => {
    const users = usersMock();

    const out = await baselinedCards(users, UID, [card()]);

    expect(out[0].baselineAt).toBe("2026-09-10T18:30:00.000Z");
    expect(users.updateOne).toHaveBeenCalledWith(
      { _id: UID },
      { $set: { "liabilities.$[card].baselineAt": "2026-09-10T18:30:00.000Z" } },
      { arrayFilters: [{ "card.kind": "card", "card.baselineAt": { $exists: false } }] },
    );
  });

  it("leaves an existing baseline alone and writes nothing", async () => {
    const users = usersMock();
    const existing = card({ baselineAt: "2026-08-01T00:00:00.000Z" });

    const out = await baselinedCards(users, UID, [existing]);

    expect(out[0].baselineAt).toBe("2026-08-01T00:00:00.000Z");
    expect(users.updateOne).not.toHaveBeenCalled();
  });

  it("ignores loans, which are not derived from entries", async () => {
    const users = usersMock();

    const out = await baselinedCards(users, UID, [loan]);

    expect(out[0].baselineAt).toBeUndefined();
    expect(users.updateOne).not.toHaveBeenCalled();
  });

  it("stamps only the card that is missing one", async () => {
    const users = usersMock();
    const kept = card({ id: "card-2", baselineAt: "2026-08-01T00:00:00.000Z" });

    const out = await baselinedCards(users, UID, [card(), kept, loan]);

    expect(out.map((l) => l.baselineAt)).toEqual([
      "2026-09-10T18:30:00.000Z",
      "2026-08-01T00:00:00.000Z",
      undefined,
    ]);
    expect(users.updateOne).toHaveBeenCalledTimes(1);
  });

  it("still returns state when the backfill write fails", async () => {
    const users = usersMock();
    users.updateOne.mockRejectedValueOnce(new Error("database unavailable"));

    const out = await baselinedCards(users, UID, [card()]);

    // Reading state is the priority; the next load retries the stamp.
    expect(out[0].baselineAt).toBeUndefined();
    expect(out[0].outstanding).toBe(4_000);
  });
});
