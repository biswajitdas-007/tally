import { beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => new Map<string, unknown>());
vi.mock("idb-keyval", () => ({
  get: vi.fn(async (k: string) => store.get(k)),
  // Serialised like the real one: each update sees the previous one's result.
  update: vi.fn(async (k: string, fn: (v: unknown) => unknown) => void store.set(k, fn(store.get(k)))),
}));

import { belongsTo, enqueueSyncRequest, getSyncQueue, type SyncRequest } from "./sync-queue";

const req = (uid?: string): SyncRequest => ({ id: "r", method: "POST", path: "/api/settle", timestamp: 0, uid });

describe("offline sync queue", () => {
  beforeEach(() => store.clear());

  it("records who queued a write", async () => {
    await enqueueSyncRequest({ method: "POST", path: "/api/expenses", body: { id: "e1" }, uid: "user-a" });
    expect(await getSyncQueue()).toEqual([expect.objectContaining({ path: "/api/expenses", uid: "user-a" })]);
  });

  it("keeps every write queued at the same moment", async () => {
    await Promise.all([
      enqueueSyncRequest({ method: "POST", path: "/api/settle", body: { id: "s1" } }),
      enqueueSyncRequest({ method: "POST", path: "/api/settle", body: { id: "s2" } }),
    ]);
    expect((await getSyncQueue()).map((r) => r.body?.id)).toEqual(["s1", "s2"]);
  });

  it("replays a write only for the user who made it", () => {
    expect(belongsTo(req("user-a"), "user-a")).toBe(true);
    expect(belongsTo(req("user-a"), "user-b")).toBe(false);
    expect(belongsTo(req("user-a"), undefined)).toBe(false);
  });

  it("keeps replaying entries queued before uids were recorded", () => {
    expect(belongsTo(req(undefined), "user-b")).toBe(true);
  });
});
