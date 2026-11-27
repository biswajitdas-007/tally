import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const confetti = vi.hoisted(() => vi.fn());
vi.mock("canvas-confetti", () => ({ default: confetti }));

import { celebrate } from "./celebrate";

const BRAND = ["#e3165b", "#5b3ff0", "#0b8fe0", "#12a16b", "#ffb020"];

describe("celebrate", () => {
  beforeEach(() => {
    confetti.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("does nothing on the server", async () => {
    await celebrate();
    expect(confetti).not.toHaveBeenCalled();
  });

  it("fires two brand-coloured bursts that respect reduced motion", async () => {
    vi.stubGlobal("window", {});
    await celebrate();
    expect(confetti).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(160);
    expect(confetti).toHaveBeenCalledTimes(2);
    for (const [opts] of confetti.mock.calls) {
      expect(opts.colors).toEqual(BRAND);
      expect(opts.disableForReducedMotion).toBe(true);
    }
  });
});
