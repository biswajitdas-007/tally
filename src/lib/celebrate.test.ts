import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { fire, create } = vi.hoisted(() => {
  const fire = vi.fn();
  return { fire, create: vi.fn(() => fire) };
});
vi.mock("canvas-confetti", () => ({ default: { create } }));

import { celebrate } from "./celebrate";

const BRAND = ["#e3165b", "#5b3ff0", "#0b8fe0", "#12a16b", "#ffb020"];

describe("celebrate", () => {
  beforeEach(() => {
    fire.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("does nothing on the server", async () => {
    await celebrate();
    expect(fire).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("fires two brand-coloured bursts that respect reduced motion", async () => {
    vi.stubGlobal("window", {});
    await celebrate();
    expect(fire).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(160);
    expect(fire).toHaveBeenCalledTimes(2);
    for (const [opts] of fire.mock.calls) {
      expect(opts.colors).toEqual(BRAND);
      expect(opts.disableForReducedMotion).toBe(true);
    }
  });

  it("draws on the main thread — the CSP blocks confetti's blob: worker — and reuses one cannon", async () => {
    vi.resetModules();
    create.mockClear();
    const fresh = await import("./celebrate");
    vi.stubGlobal("window", {});
    await Promise.all([fresh.celebrate(), fresh.celebrate()]);
    await fresh.celebrate();
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(undefined, { resize: true, useWorker: false });
  });

  it("skips quietly when the confetti code can't load, and retries next time", async () => {
    vi.resetModules();
    create.mockClear();
    create.mockImplementationOnce(() => {
      throw new Error("chunk failed to load");
    });
    const fresh = await import("./celebrate");
    vi.stubGlobal("window", {});
    await expect(fresh.celebrate()).resolves.toBeUndefined();
    expect(fire).not.toHaveBeenCalled();

    await fresh.celebrate();
    expect(create).toHaveBeenCalledTimes(2);
    expect(fire).toHaveBeenCalledTimes(1);
  });
});
