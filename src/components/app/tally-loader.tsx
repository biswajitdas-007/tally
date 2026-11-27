"use client";

import { useEffect, useId, useState } from "react";
import { BRAND_COLORS, MARK_BAR, MARK_BARS, MARK_TICK, MARK_TICK_GAP, MARK_VIEWBOX } from "@/lib/brand";

const BAR_HALF = MARK_BAR.width / 2;

const MESSAGES = [
  "Splitting the bill, not the friendship 🤝",
  "Chasing that last ₹10…",
  "Doing the awkward money math 🧮",
  "Who ordered the extra naan? 🫓",
  "Counting chai money ☕",
  "Untangling who owes whom…",
  "Rounding up the rupees 🪙",
  "Settling scores, keeping friends 😎",
  "Making sure nobody underpays 👀",
  "Balancing the books 📒",
];

/** Branded loader: the four tally strokes draw in one by one, then the settle tick, with a rotating message. */
export function TallyLoader({ size = 78 }: { size?: number }) {
  const maskId = `tally-loader-gap-${useId().replace(/[^\w-]/g, "")}`;
  const [i, setI] = useState(0);
  useEffect(() => {
    // The first line is always the same one so the server and the client render
    // identical markup — varying it during render is a hydration mismatch.
    // Where the rotation picks up is seeded off the clock, so two loads in a
    // row don't replay the same sequence.
    let next = 1 + (Date.now() % (MESSAGES.length - 1));
    const t = setInterval(() => {
      setI(next);
      next = (next + 1) % MESSAGES.length;
    }, 1300);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col items-center gap-5">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${MARK_VIEWBOX} ${MARK_VIEWBOX}`}
        fill="none"
        role="img"
        aria-label="Loading Tally"
      >
        <defs>
          <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={MARK_VIEWBOX} height={MARK_VIEWBOX}>
            <rect width={MARK_VIEWBOX} height={MARK_VIEWBOX} fill="white" />
            {/* The gap draws in with the tick, so the strokes aren't notched before it arrives. */}
            <polyline
              className="tally-stroke"
              pathLength={1}
              style={{ animationDelay: "0.66s" }}
              points={MARK_TICK.points}
              stroke="black"
              strokeWidth={MARK_TICK_GAP}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </mask>
        </defs>
        {/* Each stroke is a round-capped line the width of a bar, so it can draw itself in. */}
        <g mask={`url(#${maskId})`} strokeWidth={MARK_BAR.width} strokeLinecap="round">
          {MARK_BARS.map((bar, i) => (
            <line
              key={bar.x}
              className="tally-stroke"
              pathLength={1}
              style={{ animationDelay: `${i * 0.16}s` }}
              x1={bar.x + BAR_HALF}
              y1={MARK_BAR.y + BAR_HALF}
              x2={bar.x + BAR_HALF}
              y2={MARK_BAR.y + MARK_BAR.height - BAR_HALF}
              stroke={bar.color}
            />
          ))}
        </g>
        <polyline
          className="tally-stroke"
          pathLength={1}
          style={{ animationDelay: "0.66s" }}
          points={MARK_TICK.points}
          stroke={BRAND_COLORS.magenta}
          strokeWidth={MARK_TICK.width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="flex min-h-[2.4rem] items-start justify-center px-6 text-center">
        <p key={i} className="animate-fade-up max-w-[17rem] text-sm font-medium text-text-2">
          {MESSAGES[i]}
        </p>
      </div>
    </div>
  );
}
