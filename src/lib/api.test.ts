import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dependencies = vi.hoisted(() => ({
  firebaseAuth: vi.fn(),
  getIdToken: vi.fn(),
  socketId: vi.fn(),
  fetch: vi.fn(),
  idbSet: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({ firebaseAuth: dependencies.firebaseAuth }));
vi.mock("@/lib/pusher-client", () => ({ socketId: dependencies.socketId }));
vi.mock("idb-keyval", () => ({ get: vi.fn(async () => []), set: dependencies.idbSet }));

import { deleteAccount, settleApi } from "./api";

describe("api requests", () => {
  beforeEach(() => {
    dependencies.getIdToken.mockReset().mockResolvedValue("firebase-token");
    dependencies.firebaseAuth.mockReset().mockReturnValue({
      currentUser: { getIdToken: dependencies.getIdToken },
    });
    dependencies.socketId.mockReset().mockReturnValue("socket-1");
    dependencies.fetch.mockReset();
    dependencies.idbSet.mockReset();
    vi.stubGlobal("fetch", dependencies.fetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends a settlement with the caller's token and realtime socket id", async () => {
    dependencies.fetch.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const res = await settleApi({ id: "e1", from: "me", to: "a", amount: 500, groupId: null });

    expect(res?.ok).toBe(true);
    expect(dependencies.fetch).toHaveBeenCalledWith(
      "/api/settle",
      expect.objectContaining({
        method: "POST",
        headers: { authorization: "Bearer firebase-token", "content-type": "application/json" },
        body: JSON.stringify({ id: "e1", from: "me", to: "a", amount: 500, groupId: null, socketId: "socket-1" }),
      }),
    );
  });

  it("does nothing without a signed-in user", async () => {
    dependencies.firebaseAuth.mockReturnValueOnce(null);
    await expect(settleApi({ id: "e1" })).resolves.toBeNull();
    expect(dependencies.fetch).not.toHaveBeenCalled();
  });

  it("queues a write made offline and reports it as accepted", async () => {
    dependencies.fetch.mockRejectedValueOnce(new Error("offline"));

    const res = await settleApi({ id: "e1", from: "me", to: "a", amount: 500 });

    expect(res?.ok).toBe(true);
    expect(await res?.json()).toEqual({ ok: true, queued: true });
    expect(dependencies.idbSet).toHaveBeenCalledTimes(1);
  });

  it("surfaces the unsettled-balance gate when deleting an account", async () => {
    dependencies.fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "unsettled", people: 2, amount: 750 }), { status: 409 }),
    );
    await expect(deleteAccount()).resolves.toEqual({ ok: false, unsettled: true, people: 2, amount: 750 });
  });
});
