import { afterEach, describe, expect, it, vi } from "vitest";
import { isPreviewSession, startPreviewSession, stopPreviewSession } from "./preview";
import { PREVIEW_GROUPS, PREVIEW_ME, previewExpenses, previewPeople, previewState } from "./preview-data";

function fakeSessionStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("preview session flag", () => {
  it("is off on the server", () => {
    expect(isPreviewSession()).toBe(false);
  });

  it("turns on and off per tab in development", () => {
    vi.stubGlobal("window", { sessionStorage: fakeSessionStorage() });
    expect(isPreviewSession()).toBe(false);
    startPreviewSession();
    expect(isPreviewSession()).toBe(true);
    stopPreviewSession();
    expect(isPreviewSession()).toBe(false);
  });

  it("can never be on in a production build", () => {
    const sessionStorage = fakeSessionStorage();
    sessionStorage.setItem("tally-preview", "1");
    vi.stubGlobal("window", { sessionStorage });
    vi.stubEnv("NODE_ENV", "production");
    expect(isPreviewSession()).toBe(false);
    startPreviewSession();
    expect(isPreviewSession()).toBe(false);
  });

  it("treats blocked storage as off", () => {
    vi.stubGlobal("window", {
      get sessionStorage(): Storage {
        throw new Error("blocked");
      },
    });
    expect(isPreviewSession()).toBe(false);
  });
});

describe("preview sample data", () => {
  const ids = new Set(previewPeople().map((p) => p.id));
  const now = new Date("2026-11-28T12:00:00.000Z");

  it("signs in as the sample user with everything ready", () => {
    const s = previewState(now);
    expect(s.currentUserId).toBe(PREVIEW_ME);
    expect(s.me?.isYou).toBe(true);
    expect(s.authReady && s.dataReady).toBe(true);
    expect(s.loadError).toBe(false);
  });

  it("only references people who exist", () => {
    for (const g of PREVIEW_GROUPS) for (const m of g.memberIds) expect(ids.has(m)).toBe(true);
    for (const e of previewExpenses(now)) {
      expect(ids.has(e.paidBy)).toBe(true);
      for (const s of e.splits) expect(ids.has(s.personId)).toBe(true);
      if (e.groupId) expect(PREVIEW_GROUPS.some((g) => g.id === e.groupId)).toBe(true);
    }
  });

  it("has splits that add up to each amount, to the paisa", () => {
    for (const e of previewExpenses(now)) {
      const total = e.splits.reduce((a, s) => a + s.amount, 0);
      expect(Math.round(total * 100)).toBe(Math.round(e.amount * 100));
    }
  });

  it("dates expenses relative to now, with unique ids", () => {
    const expenses = previewExpenses(now);
    expect(new Set(expenses.map((e) => e.id)).size).toBe(expenses.length);
    expect(expenses.some((e) => e.date.startsWith("2026-11-28"))).toBe(true);
    expect(expenses.some((e) => e.isSettlement)).toBe(true);
  });
});
