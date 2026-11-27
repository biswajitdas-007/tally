import { describe, expect, it } from "vitest";
import {
  BRAND_COLORS,
  MARK_BAR,
  MARK_BARS,
  MARK_TICK,
  MARK_TICK_GAP,
  MARK_TILE_SCALE,
  MARK_VIEWBOX,
  markSvg,
} from "./brand";

describe("mark geometry", () => {
  it("keeps all four strokes and the tick inside the 64-unit grid", () => {
    for (const bar of MARK_BARS) {
      expect(bar.x).toBeGreaterThanOrEqual(0);
      expect(bar.x + MARK_BAR.width).toBeLessThanOrEqual(MARK_VIEWBOX);
    }
    expect(MARK_BAR.y + MARK_BAR.height).toBeLessThanOrEqual(MARK_VIEWBOX);
    const half = MARK_TICK.width / 2;
    for (const pair of MARK_TICK.points.split(" ")) {
      const [x, y] = pair.split(",").map(Number);
      expect(x - half).toBeGreaterThanOrEqual(0);
      expect(x + half).toBeLessThanOrEqual(MARK_VIEWBOX);
      expect(y - half).toBeGreaterThanOrEqual(0);
      expect(y + half).toBeLessThanOrEqual(MARK_VIEWBOX);
    }
  });

  it("cuts a gap wider than the tick so it reads over the strokes", () => {
    expect(MARK_TICK_GAP).toBeGreaterThan(MARK_TICK.width);
  });

  it("uses one brand colour per stroke", () => {
    expect(new Set(MARK_BARS.map((b) => b.color)).size).toBe(MARK_BARS.length);
  });
});

describe("markSvg", () => {
  it("renders the bare mark with a transparent background by default", () => {
    const svg = markSvg();
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain(`viewBox="0 0 ${MARK_VIEWBOX} ${MARK_VIEWBOX}"`);
    expect(svg).toContain('width="64" height="64"');
    expect(svg).not.toContain(BRAND_COLORS.ink);
    expect(svg).toContain("scale(1)");
    for (const bar of MARK_BARS) expect(svg).toContain(bar.color);
    expect(svg).toContain(BRAND_COLORS.magenta);
  });

  it("insets the mark on a rounded ink tile", () => {
    const svg = markSvg({ tile: "rounded" });
    expect(svg).toMatch(new RegExp(`<rect width="64" height="64" rx="\\d+" fill="${BRAND_COLORS.ink}"/>`));
    expect(svg).toContain(`scale(${MARK_TILE_SCALE})`);
  });

  it("draws a full-bleed square with the requested scale and size", () => {
    const svg = markSvg({ tile: "square", scale: 0.5, size: 512 });
    expect(svg).toContain(`<rect width="64" height="64" fill="${BRAND_COLORS.ink}"/>`);
    expect(svg).toContain("translate(16 16) scale(0.5)");
    expect(svg).toContain('width="512" height="512"');
  });
});
