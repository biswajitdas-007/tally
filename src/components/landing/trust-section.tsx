import { Code, Lock, Shield, type LucideIcon } from "lucide-react";
import { SectionHeading } from "./section-heading";

const POINTS: { icon: LucideIcon; title: string; body: string; tint: string }[] = [
  { icon: Lock, title: "Google sign-in only", body: "No passwords to leak. Every request is verified server-side, so you only see ledgers you're part of.", tint: "bg-sky-soft text-sky-on-soft" },
  { icon: Shield, title: "No bank access, ever", body: "No payment gateway, no KYC, no linked accounts. Your UPI app handles the money.", tint: "bg-brand-soft text-brand-on-soft" },
  { icon: Code, title: "Open source", body: "MIT licensed. Download all your data as one JSON file whenever you like.", tint: "bg-mint-soft text-mint-on-soft" },
];

export function TrustSection() {
  return (
    <section id="trust" className="mx-auto flex max-w-4xl flex-col gap-12 px-5 py-24">
      <div className="flex flex-col items-center gap-4 text-center">
        <SectionHeading className="text-text">
          A ledger,
          <br />
          <span className="font-accent text-positive">not a wallet.</span>
        </SectionHeading>
        <p className="max-w-[32rem] text-lg leading-relaxed text-text-2">
          Tally never holds or moves your money. You pay in your own UPI app — we just keep the record straight.
        </p>
      </div>
      <ul className="flex flex-col divide-y divide-border">
        {POINTS.map(({ icon: Icon, title, body, tint }) => (
          <li key={title} className="flex flex-wrap items-center gap-x-10 gap-y-3 py-7">
            <div className="flex flex-[1_1_280px] items-center gap-4">
              <span className={`flex size-12 items-center justify-center rounded-full ${tint}`}>
                <Icon aria-hidden className="size-6" strokeWidth={1.75} />
              </span>
              <h3 className="text-xl font-bold text-text">{title}</h3>
            </div>
            <p className="flex-[1_1_280px] leading-relaxed text-text-2">{body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
