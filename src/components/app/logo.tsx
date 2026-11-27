"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import {
  BRAND_COLORS,
  MARK_BAR,
  MARK_BARS,
  MARK_TICK,
  MARK_TICK_GAP,
  MARK_TILE_RADIUS,
  MARK_TILE_SCALE,
  MARK_VIEWBOX,
} from "@/lib/brand";

export type TallyMarkVariant = "color" | "mono" | "tile";

interface TallyMarkProps {
  size?: number;
  /**
   * `color` — the full-colour mark for light or dark backgrounds.
   * `mono` — one colour (`currentColor`), for print, stamps and tight spaces.
   * `tile` — the app icon: the mark on an ink rounded square.
   */
  variant?: TallyMarkVariant;
  /** Accessible name; pass `null` when a visible "Tally" label sits next to it. */
  title?: string | null;
  className?: string;
}

/** The Tally mark: four tally strokes closed by a settle tick. */
export function TallyMark({ size = 40, variant = "color", title = "Tally", className }: TallyMarkProps) {
  // The gap around the tick is cut with a mask, so it shows whatever sits behind
  // the mark (page, card or tile) instead of a hard-coded background colour.
  const maskId = `tally-gap-${useId().replace(/[^\w-]/g, "")}`;
  const mono = variant === "mono";
  const tick = mono ? "currentColor" : BRAND_COLORS.magenta;
  const tile = variant === "tile";
  // On the tile the mark is inset so the tick clears the rounded corners.
  const inset = (MARK_VIEWBOX * (1 - MARK_TILE_SCALE)) / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${MARK_VIEWBOX} ${MARK_VIEWBOX}`}
      fill="none"
      className={cn("shrink-0", className)}
      role={title ? "img" : undefined}
      aria-label={title ?? undefined}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={MARK_VIEWBOX} height={MARK_VIEWBOX}>
          <rect width={MARK_VIEWBOX} height={MARK_VIEWBOX} fill="white" />
          <polyline
            points={MARK_TICK.points}
            stroke="black"
            strokeWidth={MARK_TICK_GAP}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </mask>
      </defs>
      {tile && <rect width={MARK_VIEWBOX} height={MARK_VIEWBOX} rx={MARK_TILE_RADIUS} fill={BRAND_COLORS.ink} />}
      <g transform={tile ? `translate(${inset} ${inset}) scale(${MARK_TILE_SCALE})` : undefined}>
        <g mask={`url(#${maskId})`}>
          {MARK_BARS.map((bar) => (
            <rect
              key={bar.x}
              x={bar.x}
              y={MARK_BAR.y}
              width={MARK_BAR.width}
              height={MARK_BAR.height}
              rx={MARK_BAR.radius}
              fill={mono ? "currentColor" : bar.color}
            />
          ))}
        </g>
        <polyline
          points={MARK_TICK.points}
          stroke={tick}
          strokeWidth={MARK_TICK.width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

interface TallyLogoProps {
  /** Height of the mark in px; the wordmark scales with it. */
  size?: number;
  variant?: TallyMarkVariant;
  className?: string;
}

/** Mark + lowercase "tally" wordmark, the primary lockup. */
export function TallyLogo({ size = 32, variant = "color", className }: TallyLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-[0.3em] text-text", className)} style={{ fontSize: size * 0.78 }}>
      <TallyMark size={size} variant={variant} title={null} />
      <span className="font-display font-bold leading-none tracking-[-0.05em]">tally</span>
    </span>
  );
}
