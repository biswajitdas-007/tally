import { formatINR } from "@/lib/utils";

/**
 * A balance shown as "+₹1,160" / "−₹820" for sighted users, read out as
 * "You're owed ₹1,160" / "You owe ₹820" — screen readers would otherwise say
 * "plus" / "minus" and lose who owes whom.
 */
export function SignedAmount({ net }: Readonly<{ net: number }>) {
  const amount = formatINR(Math.abs(net), { decimals: false });
  return (
    <>
      <span aria-hidden>{formatINR(net, { decimals: false, signed: true })}</span>
      <span className="sr-only">{net > 0 ? `You're owed ${amount}` : `You owe ${amount}`}</span>
    </>
  );
}
