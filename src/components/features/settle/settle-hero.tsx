import { Avatar } from "@/components/ui/avatar";
import { cn, formatINR } from "@/lib/utils";
import type { Person } from "@/lib/types";

/** Steps the headline figure down as it grows, so lakh-sized sums still fit between the avatars. */
function amountSize(text: string): string {
  if (text.length <= 9) return "text-[1.875rem]";
  if (text.length <= 11) return "text-2xl";
  return "text-xl";
}

/** One side of the payment: avatar and a short name. */
function Party({ person, label }: Readonly<{ person: Person | null; label: string }>) {
  return (
    <div className="flex w-16 shrink-0 flex-col items-center gap-1.5">
      <Avatar person={person} size="xl" className="size-14" />
      <span className="max-w-full truncate text-[0.8125rem] font-bold text-text">{label}</span>
    </div>
  );
}

/** A dashed line with an arrowhead, always pointing from payer to payee. */
function FlowArrow() {
  return (
    <svg width="120" height="14" viewBox="0 0 120 14" fill="none" aria-hidden className="max-w-full text-brand">
      <path d="M2 7h112" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="2 7" />
      <path d="M108 2l6 5-6 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Who pays whom, and how much: payer on the left, payee on the right. Screen
 * readers get the same thing as one sentence.
 */
export function SettleHero({
  payer,
  payee,
  name,
  amount,
  youPay,
  settled,
}: Readonly<{
  payer: Person | null;
  payee: Person | null;
  /** The other person's first name. */
  name: string;
  amount: number;
  youPay: boolean;
  settled: boolean;
}>) {
  const amountText = formatINR(amount);
  let caption = youPay ? "you pay" : "pays you";
  let sentence = youPay ? `You pay ${name} ${amountText}.` : `${name} pays you ${amountText}.`;
  if (settled) {
    caption = "all square";
    sentence = "Nothing to pay on what's ticked.";
  }

  return (
    <div className="rounded-[26px] bg-violet-soft px-4 py-5">
      <p className="sr-only">{sentence}</p>
      <div aria-hidden className="flex items-center justify-between gap-2">
        <Party person={payer} label={youPay ? "You" : name} />
        <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5">
          <span
            // The size goes first: tailwind-merge drops a leading-* placed before a text size.
            className={cn(amountSize(amountText), "leading-tight font-semibold tracking-[-0.03em] whitespace-nowrap text-text tabular-nums")}
          >
            {amountText}
          </span>
          <FlowArrow />
          <span className="text-xs font-bold text-text-2">{caption}</span>
        </div>
        <Party person={payee} label={youPay ? name : "You"} />
      </div>
    </div>
  );
}
