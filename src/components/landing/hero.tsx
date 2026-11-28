import { Tally5 } from "lucide-react";
import { GoogleSignInButton } from "@/components/app/google-sign-in-button";
import { PhonePreview } from "./phone-preview";
import { LANDING, SPHERES } from "./palette";

/** Soft brand-coloured spheres around the phone. Decoration only. */
function Spheres() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <span className="absolute left-[6%] top-8 size-16 rounded-full" style={{ background: SPHERES.magenta }} />
      <span className="absolute right-[4%] top-28 size-10 rounded-full" style={{ background: SPHERES.sun }} />
      <span className="absolute bottom-24 right-[10%] size-7 rounded-full" style={{ background: SPHERES.sky }} />
      <span
        className="absolute bottom-16 left-[12%] flex size-13 -rotate-12 items-center justify-center rounded-[16px] text-white"
        style={{ backgroundColor: LANDING.violet }}
      >
        <Tally5 className="size-6" strokeWidth={2} />
      </span>
    </div>
  );
}

export function Hero() {
  return (
    <section id="top" className="bg-sky-soft">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-12 px-5 pb-20 pt-12 md:px-6 md:pt-16">
        <div className="flex min-w-0 flex-[1.35_1_440px] flex-col gap-6">
          <h1 className="font-display text-[clamp(2.75rem,6.8vw,4.75rem)] font-bold leading-[0.98] tracking-[-0.045em] text-text">
            <span className="block sm:whitespace-nowrap">Split anything.</span>
            <span className="block sm:whitespace-nowrap">
              <span className="font-accent text-brand">Settle</span> in seconds.
            </span>
          </h1>
          <p className="max-w-[30rem] text-lg leading-relaxed text-text-2 md:text-xl">
            Track who owes whom across trips, flats and dinners — then settle up instantly over UPI.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <GoogleSignInButton />
            <a href="#how" className="rounded-[12px] px-2 py-3 text-base font-semibold text-text hover:text-brand">
              See how it works <span aria-hidden>→</span>
            </a>
          </div>
          <p className="text-sm text-text-2">Secure sign-in with Google — we never see your password.</p>
        </div>
        <div className="relative flex min-h-[560px] flex-[1_1_380px] items-center justify-center">
          <Spheres />
          <PhonePreview />
        </div>
      </div>
    </section>
  );
}
