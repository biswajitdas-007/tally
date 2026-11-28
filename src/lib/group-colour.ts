/**
 * Group colours come from the server as free text; the create-group picker
 * only ever stores one of the category tokens below. Only those tokens reach
 * CSS: each is defined in both themes and the tile/header contrast is checked
 * against every one of them, so anything else falls back to the neutral one.
 */
const CATEGORY_NAMES = [
  "food",
  "grocery",
  "rent",
  "travel",
  "shopping",
  "bills",
  "fun",
  "health",
  "alcohol",
  "other",
] as const;

const ALLOWED = new Set<string>(CATEGORY_NAMES.map((name) => `var(--cat-${name})`));

export const FALLBACK_GROUP_COLOR = "var(--cat-other)";

export function safeGroupColor(color: string | null | undefined): string {
  const c = (color ?? "").trim();
  return ALLOWED.has(c) ? c : FALLBACK_GROUP_COLOR;
}

/**
 * The solid fill for a group's tile or header. Light mode shades the colour
 * toward ink by --tile-shade so --on-tile (white) text keeps AA; dark mode sets
 * --tile-shade to 0% and writes ink on the lighter colour instead.
 */
export function groupFill(color: string | null | undefined): string {
  return `color-mix(in oklab, ${safeGroupColor(color)}, #17123a var(--tile-shade))`;
}

/** A soft wash of the group's colour, for icon backgrounds on neutral surfaces. */
export function groupTint(color: string | null | undefined, percent = 16): string {
  return `color-mix(in srgb, ${safeGroupColor(color)} ${percent}%, transparent)`;
}
