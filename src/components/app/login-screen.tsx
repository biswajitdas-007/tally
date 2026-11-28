"use client";

import { LandingHeader } from "@/components/landing/landing-header";
import { Hero } from "@/components/landing/hero";
import { LedgerStrip } from "@/components/landing/ledger-strip";
import { FeatureSplit } from "@/components/landing/feature-split";
import { SettlePreviewCard, UpiPreviewCard } from "@/components/landing/preview-cards";
import { FeatureTiles } from "@/components/landing/feature-tiles";
import { TrustSection } from "@/components/landing/trust-section";
import { CtaBand } from "@/components/landing/cta-band";
import { LandingFooter } from "@/components/landing/landing-footer";

/** The signed-out landing page: what Tally does, and the one sign-in action. */
export function LoginScreen() {
  return (
    <div className="min-h-dvh bg-bg text-text">
      <LandingHeader />
      <main>
        <Hero />
        <LedgerStrip />
        <FeatureSplit
          id="how"
          title={
            <>
              Who owes whom,
              <br />
              <span className="font-accent">worked out.</span>
            </>
          }
          body="Add expenses as they happen — split equally or by exact amounts. Tally simplifies every balance to the fewest possible payments, so a messy trip ends in a couple of taps."
          link={{ href: "#features", label: "See every feature" }}
          visual={<SettlePreviewCard />}
        />
        <FeatureSplit
          id="upi"
          reverse
          title={
            <>
              Settle up with
              <br />
              <span className="font-accent text-violet-on-soft">any UPI app.</span>
            </>
          }
          body="Copy a friend's UPI ID or scan their QR, pay in the app you already use, then mark it paid. Everyone's balance updates instantly."
          link={{ href: "#trust", label: "Why Tally never touches your money" }}
          visual={<UpiPreviewCard />}
        />
        <FeatureTiles />
        <TrustSection />
        <CtaBand />
      </main>
      <LandingFooter />
    </div>
  );
}
