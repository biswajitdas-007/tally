"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";
import { TallyMark } from "./logo";

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.01-2.34Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 260, damping: 24 } },
};

export function LoginScreen() {
  const { isFirebaseConfigured, loginWithGoogle } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleGoogle() {
    if (!isFirebaseConfigured) {
      toast({ message: "Google sign-in isn't configured yet.", tone: "error" });
      return;
    }
    try {
      setLoading(true);
      await loginWithGoogle();
      // The auth listener switches the app in once the session resolves.
    } catch (e) {
      setLoading(false);
      const code = (e as { code?: string })?.code;
      if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        toast({ message: "Couldn't sign in with Google. Please try again.", tone: "error" });
      }
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-bg px-6 pb-[max(env(safe-area-inset-bottom),24px)] pt-[max(env(safe-area-inset-top),16px)]">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-brand-soft blur-[90px] opacity-70" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-72 w-72 rounded-full bg-brass-soft blur-[80px] opacity-50" />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10"
      >
        <motion.div variants={item} className="mb-8 flex items-center gap-2.5">
          <TallyMark size={38} />
          <span className="font-display text-xl font-bold tracking-[-0.03em]">Tally</span>
        </motion.div>

        <motion.h1
          variants={item}
          className="font-display text-[2.6rem] font-bold leading-[1.02] tracking-[-0.035em] text-text"
        >
          Split anything.
          <br />
          <span className="text-brand">Settle in seconds.</span>
        </motion.h1>

        <motion.p variants={item} className="mt-4 text-[0.98rem] leading-relaxed text-text-2">
          Track who owes whom across trips, flats and dinners — then settle up instantly over UPI.
        </motion.p>

        {/* Product preview */}
        <motion.div
          variants={item}
          className="mt-8 rounded-[20px] border border-border bg-surface p-4 shadow-[var(--shadow-md)]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {["#4c6ef0", "#e0518f", "#e2673b"].map((c, i) => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-full ring-2 ring-[var(--surface)]"
                    style={{ background: `linear-gradient(140deg, ${c}, ${c}cc)` }}
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-text-2">Goa Trip</span>
            </div>
            <span className="rounded-full bg-positive-soft px-2 py-0.5 text-[0.7rem] font-semibold text-positive">
              settled
            </span>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-[0.72rem] font-medium uppercase tracking-wide text-text-3">You're owed</p>
              <p className="font-display text-2xl font-bold tracking-tight text-text tnum">₹2,480</p>
            </div>
            <div className="flex h-9 items-center gap-1.5 rounded-full bg-brand px-3.5 text-[0.8rem] font-semibold text-on-brand">
              <Sparkles className="h-3.5 w-3.5" /> Remind
            </div>
          </div>
        </motion.div>

        <motion.div variants={item} className="mt-8">
          <Button variant="secondary" size="lg" fullWidth loading={loading} onClick={handleGoogle}>
            {!loading && <GoogleGlyph />}
            Continue with Google
          </Button>
        </motion.div>

        <motion.p variants={item} className="mt-6 flex items-center justify-center gap-1.5 text-center text-[0.78rem] text-text-3">
          <ShieldCheck className="h-3.5 w-3.5" />
          Secure sign-in with Google — we never see your password.
        </motion.p>
      </motion.div>
    </div>
  );
}
