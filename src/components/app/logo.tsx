import { cn } from "@/lib/utils";

/** The Tally mark — a tally-count glyph (four strokes struck through by a fifth). */
export function TallyMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={cn("shrink-0", className)}
      role="img"
      aria-label="Tally"
    >
      <defs>
        <linearGradient id="tally-bg" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#238063" />
          <stop offset="1" stopColor="#155741" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#tally-bg)" />
      <g stroke="#eef3ea" strokeWidth="3.1" strokeLinecap="round">
        <line x1="16" y1="15" x2="16" y2="33" />
        <line x1="21.3" y1="15" x2="21.3" y2="33" />
        <line x1="26.6" y1="15" x2="26.6" y2="33" />
        <line x1="31.9" y1="15" x2="31.9" y2="33" />
      </g>
      <line x1="13" y1="34.5" x2="35" y2="13.5" stroke="#e0b467" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <TallyMark size={size} />
      <span className="font-display text-[1.35rem] font-bold tracking-[-0.03em] text-text">Tally</span>
    </div>
  );
}
