"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, PartyPopper, Link as LinkIcon } from "lucide-react";
import { TallyLogo } from "@/components/app/logo";
import { GoogleSignInButton } from "@/components/app/google-sign-in-button";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useStore } from "@/store/useStore";
import { fetchInvite, acceptInvite, type InviteInfo } from "@/lib/api";

/** Why an accepted invite didn't take the user anywhere, or null if it worked. */
function refusal(res: { self?: boolean } | null): string | null {
  if (!res) return "This invite link isn't valid any more";
  return res.self ? "That's your own invite link" : null;
}

/** The invite behind this link, or its loading / not-found state. */
function useInvite(id: string): InviteInfo | "loading" | "notfound" {
  const [info, setInfo] = useState<InviteInfo | "loading" | "notfound">("loading");
  useEffect(() => {
    let active = true;
    fetchInvite(id).then((d) => active && setInfo(d ?? "notfound"));
    return () => {
      active = false;
    };
  }, [id]);
  return info;
}

/** Accepts the invite exactly once (even under StrictMode) as soon as `canJoin`, then routes into the app. */
function useAutoJoin(id: string, canJoin: boolean): "idle" | "done" {
  const router = useRouter();
  const { toast } = useToast();
  const refetch = useStore((s) => s.refetch);
  const [phase, setPhase] = useState<"idle" | "done">("idle");
  const started = useRef(false);

  useEffect(() => {
    if (!canJoin || started.current) return;
    started.current = true;
    (async () => {
      const res = await acceptInvite(id);
      const refused = refusal(res);
      if (refused) {
        toast({ message: refused, tone: "info" });
        router.replace("/");
        return;
      }
      await refetch();
      setPhase("done");
      const groupId = res?.groupId;
      toast({ message: groupId ? "You've joined the group" : "You're in 🎉" });
      setTimeout(() => router.replace(groupId ? `/groups/${groupId}` : "/"), 700);
    })();
  }, [canJoin, id, refetch, router, toast]);

  return phase;
}

export default function JoinPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const currentUserId = useStore((s) => s.currentUserId);
  const dataReady = useStore((s) => s.dataReady);

  const info = useInvite(id);

  // Join automatically once the invite is valid and the signed-in user's data is loaded.
  const canJoin = info !== "loading" && info !== "notfound" && !!currentUserId && dataReady;
  const phase = useAutoJoin(id, canJoin);
  const joining = canJoin || phase === "done";

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-bg px-6 pb-[max(var(--safe-bottom),24px)] pt-[max(var(--safe-top),24px)]">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-brand-soft blur-[90px] opacity-70" />
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <TallyLogo size={34} />
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

        {info !== "loading" && info !== "notfound" && (
          <div className="rounded-[22px] border border-border bg-surface p-6 text-center shadow-[var(--shadow-md)]">
            {joining ? (
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
                <GoogleSignInButton fullWidth className="mt-6">
                  Continue with Google to join
                </GoogleSignInButton>
              </>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
