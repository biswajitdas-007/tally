"use client";

import { useEffect, useMemo, useState } from "react";

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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Branded loader: the tally marks draw in one-by-one, with a rotating message. */
export function TallyLoader({ size = 78 }: { size?: number }) {
  const messages = useMemo(() => shuffle(MESSAGES), []);
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % messages.length), 1300);
    return () => clearInterval(t);
  }, [messages.length]);

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
      <div className="flex min-h-[2.4rem] items-start justify-center px-6 text-center">
        <p key={i} className="animate-fade-up max-w-[17rem] text-sm font-medium text-text-2">
          {messages[i]}
        </p>
      </div>
    </div>
  );
}
