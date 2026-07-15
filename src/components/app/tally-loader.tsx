"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
  "Splitting the bill…",
  "Counting the chai ☕",
  "Settling the score…",
  "Balancing the books…",
  "Tallying it up 🧮",
  "Who owes whom…",
];

/** Branded loader: the tally marks draw in one-by-one, with a rotating message. */
export function TallyLoader({ size = 78 }: { size?: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % MESSAGES.length), 1400);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col items-center gap-5">
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" role="img" aria-label="Loading Tally">
        <defs>
          <linearGradient id="tl-bg" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop stopColor="#238063" />
            <stop offset="1" stopColor="#155741" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="14" fill="url(#tl-bg)" />
        <g stroke="#eef3ea" strokeWidth="3.1" strokeLinecap="round">
          <line className="tally-stroke" pathLength={1} style={{ animationDelay: "0s" }} x1="16" y1="15" x2="16" y2="33" />
          <line className="tally-stroke" pathLength={1} style={{ animationDelay: "0.16s" }} x1="21.3" y1="15" x2="21.3" y2="33" />
          <line className="tally-stroke" pathLength={1} style={{ animationDelay: "0.32s" }} x1="26.6" y1="15" x2="26.6" y2="33" />
          <line className="tally-stroke" pathLength={1} style={{ animationDelay: "0.48s" }} x1="31.9" y1="15" x2="31.9" y2="33" />
        </g>
        <line
          className="tally-stroke"
          pathLength={1}
          style={{ animationDelay: "0.66s" }}
          x1="13"
          y1="34.5"
          x2="35"
          y2="13.5"
          stroke="#e0b467"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
      </svg>
      <div className="h-5 overflow-hidden text-center">
        <p key={i} className="animate-fade-up text-sm font-medium text-text-2">
          {MESSAGES[i]}
        </p>
      </div>
    </div>
  );
}
