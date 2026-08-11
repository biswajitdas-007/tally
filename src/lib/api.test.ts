import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Liability } from "./types";

const dependencies = vi.hoisted(() => ({
  firebaseAuth: vi.fn(),
  getIdToken: vi.fn(),
  socketId: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({ firebaseAuth: dependencies.firebaseAuth }));
vi.mock("@/lib/pusher-client", () => ({ socketId: dependencies.socketId }));
vi.mock("idb-keyval", () => ({ get: vi.fn(), set: vi.fn() }));

import { confirmEmiApi } from "./api";

const liability = (id: string): Liability => ({
  id,
  name: "Home loan",
  kind: "loan",
  outstanding: 10_000,
  emi: 1_000,
  termMonths: 12,
  emisPaid: 2,
  dueDay: 3,
  lastPaidMonth: "2026-08",
});

describe("confirmEmiApi", () => {
  beforeEach(() => {
    dependencies.getIdToken.mockReset().mockResolvedValue("firebase-token");
    dependencies.firebaseAuth.mockReset().mockReturnValue({
      currentUser: { getIdToken: dependencies.getIdToken },
    });
    dependencies.socketId.mockReset().mockReturnValue("socket-1");
    dependencies.fetch.mockReset();
    vi.stubGlobal("fetch", dependencies.fetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts an encoded liability target and sanitizes a successful response", async () => {
    dependencies.fetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          liability: liability("loan /?"),
          applied: ["2026-07", 7, "2026-08"],
          alreadyHandled: true,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    await expect(confirmEmiApi("loan /?", "2026-08")).resolves.toMatchObject({
      ok: true,
      liability: { id: "loan /?" },
      applied: ["2026-07", "2026-08"],
      alreadyHandled: true,
    });
    expect(dependencies.fetch).toHaveBeenCalledWith(
      "/api/liabilities/loan%20%2F%3F/confirm",
      expect.objectContaining({
        method: "POST",
        headers: { authorization: "Bearer firebase-token", "content-type": "application/json" },
        body: JSON.stringify({ period: "2026-08", socketId: "socket-1" }),
      }),
    );
  });

  it("normalizes optional success fields", async () => {
    dependencies.fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ liability: liability("loan-1"), applied: "2026-08" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(confirmEmiApi("loan-1", "2026-08")).resolves.toEqual({
      ok: true,
      liability: liability("loan-1"),
      applied: [],
      alreadyHandled: false,
    });
  });

  it("returns the server error for a rejected confirmation", async () => {
    dependencies.fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "conflict" }), {
        status: 409,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(confirmEmiApi("loan-1", "2026-08")).resolves.toEqual({
      ok: false,
      applied: [],
      error: "conflict",
    });
  });

  it("rejects malformed or mismatched successful responses", async () => {
    dependencies.fetch
      .mockResolvedValueOnce(new Response("not json", { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ liability: liability("different-loan") }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

    await expect(confirmEmiApi("loan-1", "2026-08")).resolves.toEqual({
      ok: false,
      applied: [],
      error: "confirm-failed",
    });
    await expect(confirmEmiApi("loan-1", "2026-08")).resolves.toEqual({
      ok: false,
      applied: [],
      error: "confirm-failed",
    });
  });

  it("reports missing authentication and transport failures as network errors", async () => {
    dependencies.firebaseAuth.mockReturnValueOnce(null);
    await expect(confirmEmiApi("loan-1", "2026-08")).resolves.toEqual({
      ok: false,
      applied: [],
      error: "network-error",
    });

    dependencies.fetch.mockRejectedValueOnce(new Error("offline"));
    await expect(confirmEmiApi("loan-1", "2026-08")).resolves.toEqual({
      ok: false,
      applied: [],
      error: "confirm-failed",
    });
  });
});
