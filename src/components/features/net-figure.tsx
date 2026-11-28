import { formatINR, cn } from "@/lib/utils";

/**
 * Where you stand in a ledger, for the right edge of a row: "you're owed ₹X",
 * "you owe ₹X", or an "all settled" pill.
 */
export function NetFigure({ net, settled }: Readonly<{ net: number; settled: boolean }>) {
  if (settled) {
    return (
      <span className="shrink-0 rounded-full bg-surface-inset px-2.5 py-1.5 text-xs font-bold text-text-2">
        all settled
      </span>
    );
  }
  const owed = net > 0;
  return (
    <span className="shrink-0 text-right">
      <span className="block text-xs text-text-2">{owed ? "you're owed" : "you owe"}</span>
      <span className={cn("block text-base font-bold tnum", owed ? "text-positive" : "text-negative")}>
        {formatINR(Math.abs(net))}
      </span>
    </span>
  );
}
