import { afterEach, describe, expect, it, vi } from "vitest";

const { getIdToken, idb } = vi.hoisted(() => ({
  getIdToken: vi.fn(async () => "real-token"),
  idb: { get: vi.fn(async () => "cached"), set: vi.fn(async () => {}), del: vi.fn(async () => {}) },
}));

vi.mock("@/lib/firebase", () => ({ firebaseAuth: () => ({ currentUser: { uid: "u1", getIdToken } }) }));
vi.mock("idb-keyval", () => idb);

import { token, fetchInvite } from "./api";
import { idbStorage } from "./idb-storage";

function previewTab(on: boolean) {
  const data = new Map<string, string>(on ? [["tally-preview", "1"]] : []);
  vi.stubGlobal("window", { sessionStorage: { getItem: (k: string) => data.get(k) ?? null } });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("api in a preview session", () => {
  it("hands out the signed-in user's token normally", async () => {
    previewTab(false);
    expect(await token()).toBe("real-token");
  });

  it("never hands out a token, even when the browser is signed in", async () => {
    previewTab(true);
    expect(await token()).toBeNull();
    expect(getIdToken).not.toHaveBeenCalled();
  });

  it("doesn't look up invites", async () => {
    previewTab(true);
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    expect(await fetchInvite("abc")).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("local cache in a preview session", () => {
  it("reads and writes IndexedDB normally", async () => {
    previewTab(false);
    expect(await idbStorage.getItem("tally-storage")).toBe("cached");
    await idbStorage.setItem("tally-storage", "{}");
    await idbStorage.removeItem("tally-storage");
    expect(idb.set).toHaveBeenCalledOnce();
    expect(idb.del).toHaveBeenCalledOnce();
  });

  it("neither loads nor touches the real cached account", async () => {
    previewTab(true);
    expect(await idbStorage.getItem("tally-storage")).toBeNull();
    await idbStorage.setItem("tally-storage", "{}");
    await idbStorage.removeItem("tally-storage");
    expect(idb.get).not.toHaveBeenCalled();
    expect(idb.set).not.toHaveBeenCalled();
    expect(idb.del).not.toHaveBeenCalled();
  });
});
