import { GoogleSignInButton } from "@/components/app/google-sign-in-button";
import { LANDING } from "./palette";
import { SectionHeading } from "./section-heading";

const STEPS = [
  { title: "Create a ledger", body: "A trip, a flat, or one friend", dot: LANDING.skyStrong },
  { title: "Add what you spend", body: "Equal or exact splits", dot: LANDING.violet },
  { title: "Settle over UPI", body: "Fewest payments, one tap", dot: LANDING.mintStrong },
];

/** The closing call to action: three steps and the sign-in button, on ink in both themes. */
export function CtaBand() {
  return (
    <section id="start" className="px-5 py-24" style={{ backgroundColor: LANDING.ink, color: LANDING.white }}>
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-10 text-center">
        <SectionHeading size="lg">
          Start your first tally
          <br />
          <span className="font-accent" style={{ color: LANDING.magentaOnInk }}>
            in under a minute.
          </span>
        </SectionHeading>
        <ol className="grid w-full grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-8">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex flex-col items-center gap-3">
              <span
                aria-hidden
                className="flex size-14 items-center justify-center rounded-full text-xl font-bold"
                style={{ backgroundColor: s.dot }}
              >
                {i + 1}
              </span>
              <span className="text-lg font-bold">{s.title}</span>
              <span className="text-sm" style={{ color: LANDING.inkMuted }}>
                {s.body}
              </span>
            </li>
          ))}
        </ol>
        <GoogleSignInButton />
      </div>
    </section>
  );
}
