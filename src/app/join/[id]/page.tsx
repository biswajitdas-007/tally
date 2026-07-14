"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, PartyPopper, LinkIcon } from "lucide-react";
import { TallyMark } from "@/components/app/logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";
import { useStore, useMe } from "@/store/useStore";
import { fetchInvite, acceptInvite, type InviteInfo } from "@/lib/api";
import type { Expense, Group, Person } from "@/lib/types";

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

export default function JoinPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { loginWithGoogle } = useAuth();
  const { toast } = useToast();

  const currentUserId = useStore((s) => s.currentUserId);
  const dataReady = useStore((s) => s.dataReady);
  const mergeInvited = useStore((s) => s.mergeInvited);
  const me = useMe();

  const [info, setInfo] = useState<InviteInfo | null | "loading" | "notfound">("loading");
  const [signingIn, setSigningIn] = useState(false);
  const [phase, setPhase] = useState<"idle" | "joining" | "done">("idle");

  useEffect(() => {
    let active = true;
    fetchInvite(id).then((d) => active && setInfo(d ?? "notfound"));
    return () => {
      active = false;
    };
  }, [id]);

  // Once signed in and our own data has loaded, accept the invite.
  useEffect(() => {
    if (info === "loading" || info === "notfound" || !info) return;
    if (!currentUserId || !dataReady || phase !== "idle") return;
    setPhase("joining");
    (async () => {
      const res = await acceptInvite(id, { name: me?.name, email: me?.email, photoURL: me?.photoURL });
      if (res?.self) {
        toast({ message: "That's your own invite link", tone: "info" });
        router.replace("/");
        return;
      }
      if (res?.group) {
        mergeInvited({
          group: res.group as Group,
          expenses: (res.expenses ?? []) as Expense[],
          people: (res.people ?? []) as Person[],
        });
        setPhase("done");
        toast({ message: `Joined ${(res.group as Group).name}` });
        setTimeout(() => router.replace(`/groups/${(res.group as Group).id}`), 700);
      } else {
        setPhase("done");
        toast({ message: "You're in 🎉" });
        setTimeout(() => router.replace("/"), 700);
      }
    })();
  }, [info, currentUserId, dataReady, phase, id, me, mergeInvited, router, toast]);

  async function handleGoogle() {
    try {
      setSigningIn(true);
      await loginWithGoogle();
    } catch {
      setSigningIn(false);
      toast({ message: "Couldn't sign in. Please try again.", tone: "error" });
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-bg px-6">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-brand-soft blur-[90px] opacity-70" />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <TallyMark size={34} />
          <span className="font-display text-xl font-bold tracking-[-0.03em]">Tally</span>
        </div>

        {info === "loading" && (
          <div className="flex flex-col items-center gap-3 py-10 text-text-3">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">Loading invite…</p>
          </div>
        )}

        {info === "notfound" && (
          <div className="rounded-[22px] border border-border bg-surface p-6 text-center shadow-[var(--shadow-md)]">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-inset text-text-3">
              <LinkIcon className="h-6 w-6" />
            </div>
            <h1 className="font-display text-xl font-bold text-text">Invite not found</h1>
            <p className="mt-1.5 text-sm text-text-2">This invite may have expired or already been used.</p>
            <Button className="mt-5" onClick={() => router.replace("/")}>
              Go to Tally
            </Button>
          </div>
        )}

        {info && info !== "loading" && info !== "notfound" && (
          <div className="rounded-[22px] border border-border bg-surface p-6 text-center shadow-[var(--shadow-md)]">
            {phase === "joining" || phase === "done" ? (
              <div className="flex flex-col items-center gap-3 py-6">
                {phase === "done" ? (
                  <PartyPopper className="h-8 w-8 text-brand" />
                ) : (
                  <Loader2 className="h-7 w-7 animate-spin text-brand" />
                )}
                <p className="text-sm font-medium text-text-2">
                  {phase === "done" ? "You're in! Taking you there…" : "Joining…"}
                </p>
              </div>
            ) : (
              <>
                {info.groupIcon && (
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-[16px] bg-brand-soft text-3xl">
                    {info.groupIcon}
                  </div>
                )}
                <p className="text-sm text-text-2">
                  <span className="font-semibold text-text">{info.inviterName}</span> invited you to
                </p>
                <h1 className="mt-0.5 font-display text-2xl font-bold text-text">
                  {info.groupName ?? "join them on Tally"}
                </h1>
                <p className="mt-2 text-sm text-text-2">Split expenses and settle up over UPI.</p>
                <Button
                  variant="secondary"
                  size="lg"
                  fullWidth
                  className="mt-6"
                  loading={signingIn}
                  onClick={handleGoogle}
                >
                  {!signingIn && <GoogleGlyph />}
                  Continue with Google to join
                </Button>
              </>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
