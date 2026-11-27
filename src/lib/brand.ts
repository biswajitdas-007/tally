/**
 * The Tally mark — single source of truth for its geometry and colours.
 *
 * Four rounded tally strokes (one per friend) closed by a check-mark "tick"
 * instead of the classic diagonal: counted, then settled. Drawn on a 64-unit
 * grid with 8-unit strokes. Used by the <TallyMark> component, the icon
 * generator (scripts/brand) and the Open Graph image, so they never drift.
 */

export const BRAND_COLORS = {
  ink: "#17123a",
  magenta: "#e3165b",
  violet: "#5b3ff0",
  sky: "#0b8fe0",
  mint: "#12a16b",
  sun: "#ffb020",
  white: "#ffffff",
} as const;

export const MARK_VIEWBOX = 64;

/** The four strokes, left to right. */
export const MARK_BARS = [
  { x: 13, color: BRAND_COLORS.violet },
  { x: 23, color: BRAND_COLORS.sky },
  { x: 33, color: BRAND_COLORS.mint },
  { x: 43, color: BRAND_COLORS.sun },
] as const;

export const MARK_BAR = { y: 13, width: 8, height: 38, radius: 4 } as const;

/** The settle tick: a short down-stroke, then a long rise across all four bars. */
export const MARK_TICK = { points: "8,38 20,49 57,17", width: 9 } as const;

/** Width of the gap cut around the tick so it reads cleanly over the bars. */
export const MARK_TICK_GAP = 15;

/** Corner radius of the app-icon tile, in mark units. */
export const MARK_TILE_RADIUS = 15;

/** How large the mark sits inside the rounded app tile, so the tick clears the corners. */
export const MARK_TILE_SCALE = 0.8;

export type MarkTile = "none" | "rounded" | "square";

export interface MarkSvgOptions {
  /**
   * `none` — transparent background (the bare mark).
   * `rounded` — ink rounded tile, the app icon.
   * `square` — full-bleed ink square for platforms that crop their own shape
   *   (maskable PWA icons, Apple touch icons).
   */
  tile?: MarkTile;
  /** Mark size relative to the canvas, scaled around the centre. Default 1 (MARK_TILE_SCALE on a rounded tile). */
  scale?: number;
  /** Rendered width/height attributes in px. Default: the 64-unit viewBox. */
  size?: number;
}

/**
 * The mark as a standalone SVG string — for generated icons and images, where
 * React isn't rendering. Same geometry and colours as <TallyMark>.
 *
 * Uses a fixed `id="gap"` for its mask, so use it as a standalone file or a data
 * URI only — never inline the string into an HTML page more than once.
 */
export function markSvg({
  tile = "none",
  scale = tile === "rounded" ? MARK_TILE_SCALE : 1,
  size = MARK_VIEWBOX,
}: MarkSvgOptions = {}): string {
  const v = MARK_VIEWBOX;
  const offset = Number(((v - v * scale) / 2).toFixed(3));
  const background =
    tile === "rounded"
      ? `<rect width="${v}" height="${v}" rx="${MARK_TILE_RADIUS}" fill="${BRAND_COLORS.ink}"/>`
      : tile === "square"
        ? `<rect width="${v}" height="${v}" fill="${BRAND_COLORS.ink}"/>`
        : "";
  const bars = MARK_BARS.map(
    (b) =>
      `<rect x="${b.x}" y="${MARK_BAR.y}" width="${MARK_BAR.width}" height="${MARK_BAR.height}" rx="${MARK_BAR.radius}" fill="${b.color}"/>`,
  ).join("");
  const line = 'stroke-linecap="round" stroke-linejoin="round" fill="none"';
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${v} ${v}">`,
    `<defs><mask id="gap" maskUnits="userSpaceOnUse" x="0" y="0" width="${v}" height="${v}">`,
    `<rect width="${v}" height="${v}" fill="#fff"/>`,
    `<polyline points="${MARK_TICK.points}" stroke="#000" stroke-width="${MARK_TICK_GAP}" ${line}/>`,
    `</mask></defs>`,
    background,
    `<g transform="translate(${offset} ${offset}) scale(${scale})">`,
    `<g mask="url(#gap)">${bars}</g>`,
    `<polyline points="${MARK_TICK.points}" stroke="${BRAND_COLORS.magenta}" stroke-width="${MARK_TICK.width}" ${line}/>`,
    `</g></svg>`,
  ].join("");
}
