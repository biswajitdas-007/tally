import { sanitizeMoneyInput } from "@/lib/utils";

/** The big centred amount. The input grows with what's typed, so the ₹ stays snug. */
export function AmountField({ value, onChange }: Readonly<{ value: string; onChange: (v: string) => void }>) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-1">
      <label htmlFor="expense-amount" className="text-[0.8125rem] font-bold text-text-2">
        Amount
      </label>
      {/* The bare input has no box, so focus shows as a brand underline instead. */}
      <div className="flex items-baseline justify-center gap-1 border-b-2 border-transparent px-2 pb-1 has-[input:focus-visible]:border-brand">
        <span aria-hidden className="text-3xl font-bold text-text-2">
          ₹
        </span>
        <input
          id="expense-amount"
          value={value}
          onChange={(e) => onChange(sanitizeMoneyInput(e.target.value))}
          inputMode="decimal"
          placeholder="0"
          autoComplete="off"
          style={{ width: `${Math.max((value || "0").length, 1)}ch` }}
          className="bg-transparent text-left text-[3.25rem] leading-none font-bold tracking-[-0.04em] text-text tnum outline-none placeholder:text-text-3"
        />
      </div>
    </div>
  );
}
