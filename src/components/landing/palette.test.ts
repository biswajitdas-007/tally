import { describe, expect, it } from "vitest";
import { LANDING, SPHERES } from "./palette";
import { BRAND_COLORS } from "@/lib/brand";

/** WCAG contrast ratio between two #rrggbb colours. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("landing palette", () => {
  it("keeps every text-on-fill pair at WCAG AA", () => {
    const pairs: [string, string, string][] = [
      ["magenta tile", LANDING.white, LANDING.magenta],
      ["phone debit pill", LANDING.white, LANDING.magentaStrong],
      ["violet tile, avatar and step dot", LANDING.white, LANDING.violet],
      ["violet tile body", LANDING.onViolet, LANDING.violet],
      ["sky tile and step dot", LANDING.white, LANDING.skyStrong],
      ["sun tile and avatar", LANDING.ink, LANDING.sun],
      ["sun tile body", LANDING.onSun, LANDING.sun],
      ["mint tile, credit pill, avatar and step dot", LANDING.white, LANDING.mintStrong],
      ["mint tile body", LANDING.onMint, LANDING.mintStrong],
      ["ink band", LANDING.white, LANDING.ink],
      ["ink band muted", LANDING.inkMuted, LANDING.ink],
      ["ink band accent", LANDING.magentaOnInk, LANDING.ink],
    ];
    for (const [name, fg, bg] of pairs) expect(contrast(fg, bg), name).toBeGreaterThanOrEqual(4.5);
  });

  it("derives the brand colours from the single brand source", () => {
    expect(LANDING.magenta).toBe(BRAND_COLORS.magenta);
    expect(LANDING.ink).toBe(BRAND_COLORS.ink);
    expect(SPHERES.sky).toContain(BRAND_COLORS.sky);
  });
});
