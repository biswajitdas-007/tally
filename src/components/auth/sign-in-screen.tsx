import Link from "next/link";
import { ArrowLeft, Check, ShieldCheck, Sparkles } from "lucide-react";
import { TallyLogo, TallyMark } from "@/components/app/logo";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { GoogleSignInButton } from "@/components/app/google-sign-in-button";
import { LANDING } from "@/components/landing/palette";
import { SettlePreviewCard } from "@/components/landing/preview-cards";

const POINTS = [
  "Split equally or by exact amounts",
  "The fewest payments to square up a group",
  "Settle in any UPI app — Tally never touches your money",
];

/** The ink brand panel beside the form on wide screens. Fixed colours in both themes. */
function BrandPanel() {
  return (
    <aside
      aria-label="About Tally"
      className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-center lg:p-12 xl:p-16"
      style={{ backgroundColor: LANDING.ink, color: LANDING.white }}
    >
      <TallyMark
        size={280}
        title={null}
        className="pointer-events-none absolute -top-10 -right-16 opacity-[0.14]"
      />
      <div className="relative mx-auto flex w-full max-w-[26rem] flex-col gap-7">
        <p className="text-[clamp(2.25rem,3.4vw,3rem)] leading-[1.02] font-semibold tracking-[-0.04em]">
          Every split,
          <br />
          <span className="font-accent" style={{ color: LANDING.magentaOnInk }}>
            settled.
          </span>
        </p>
        <ul className="flex flex-col gap-3.5">
          {POINTS.map((point) => (
            <li key={point} className="flex items-start gap-3 text-[0.95rem] leading-snug">
              <span
                aria-hidden
                className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: LANDING.mintStrong }}
              >
                <Check className="size-3" strokeWidth={2.6} />
              </span>
              <span style={{ color: LANDING.inkMuted }}>{point}</span>
            </li>
          ))}
        </ul>
        {/* Only when there's height for it: on short laptop screens it would push the page into a scroll. */}
        <div className="mt-3 hidden -rotate-2 rounded-[28px] dark:ring-1 dark:ring-white/15 [@media(min-height:760px)]:block">
          <SettlePreviewCard />
        </div>
      </div>
    </aside>
  );
}

/** The sign-in page: one Google button, with the brand story beside it on wide screens. */
export function SignInScreen() {
  return (
    <div className="min-h-dvh bg-bg text-text lg:grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <BrandPanel />

      <div className="flex min-h-dvh flex-col px-5 pt-[max(var(--safe-top),20px)] pb-[max(var(--safe-bottom),24px)] md:px-10">
        <header className="flex items-center justify-between">
          <Link href="/" aria-label="Tally home" className="rounded-[12px]">
            <TallyLogo size={32} />
          </Link>
          <ThemeToggle className="size-11" />
        </header>

        <main className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center gap-8 py-12">
          <div>
            <h1 className="text-[clamp(2.25rem,8vw,2.75rem)] leading-[1.05] font-semibold tracking-[-0.035em]">
              Welcome to <span className="font-accent text-brand">tally</span>
            </h1>
            <p className="mt-3 text-base leading-relaxed text-pretty text-text-2">
              Sign in to split expenses with friends and settle up over UPI.
            </p>
          </div>

          <GoogleSignInButton fullWidth />

          <ul className="flex flex-col gap-3 text-sm text-pretty text-text-2">
            <li className="flex items-start gap-2.5">
              <ShieldCheck className="mt-px size-[18px] shrink-0 text-mint-on-soft" strokeWidth={1.8} aria-hidden />
              Secure sign-in with Google — we never see your password.
            </li>
            <li className="flex items-start gap-2.5">
              <Sparkles className="mt-px size-[18px] shrink-0 text-violet-on-soft" strokeWidth={1.8} aria-hidden />
              New here? Your account is created the first time you sign in.
            </li>
          </ul>

          <Link
            href="/"
            className="flex w-fit items-center gap-1.5 rounded-[10px] py-1 text-sm font-semibold text-text-2 hover:text-text"
          >
            <ArrowLeft className="size-4" strokeWidth={1.8} aria-hidden /> Back to home
          </Link>
        </main>
      </div>
    </div>
  );
}
