import { BRAND_COLORS } from "@/lib/brand";

/**
 * Fixed colours for the landing's brand blocks (feature tiles, CTA band, step
 * dots). They stay the same in light and dark. Fills that carry text use the
 * darker shades of sky and mint so white text keeps WCAG AA contrast.
 */
export const LANDING = {
  ink: BRAND_COLORS.ink,
  inkMuted: "#c9c5e6",
  magenta: BRAND_COLORS.magenta,
  magentaOnInk: "#ff5c93",
  violet: BRAND_COLORS.violet,
  sky: BRAND_COLORS.sky,
  skyStrong: "#0a74b8",
  mint: BRAND_COLORS.mint,
  mintStrong: "#0b7a50",
  sun: BRAND_COLORS.sun,
  magentaStrong: "#b80f48",
  /** Secondary text on the violet, sun and mint fills (AA on each). */
  onViolet: "#e4deff",
  onSun: "#3b2e05",
  onMint: "#e0f7ec",
  white: BRAND_COLORS.white,
} as const;

/** Glossy decorative spheres around the hero phone: highlight → base colour. */
export const SPHERES = {
  magenta: `radial-gradient(circle at 32% 30%, #ff8ab2, ${LANDING.magenta} 62%)`,
  sun: `radial-gradient(circle at 32% 30%, #ffd884, ${LANDING.sun} 62%)`,
  sky: `radial-gradient(circle at 32% 30%, #7fd0ff, ${LANDING.sky} 62%)`,
} as const;
