"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";
import { useStore } from "@/store/useStore";

/*
 * One sign-in at a time across every button on the page, and every button shows
 * it. A second popup request would cancel the first, and that cancellation
 * falls back to a full-page redirect mid-flow.
 */
let inFlight = false;
const listeners = new Set<() => void>();

function setInFlight(value: boolean) {
  inFlight = value;
  listeners.forEach((cb) => cb());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const readInFlight = () => inFlight;

/** Google sign-in with a shared busy flag and friendly errors, used by every sign-in button. */
export function useGoogleSignIn() {
  const { isFirebaseConfigured, loginWithGoogle } = useAuth();
  const { toast } = useToast();
  const inProgress = useSyncExternalStore(subscribe, readInFlight, () => false);
  // Once signed in, stay busy until the screen moves on (the invite page waits
  // for data before joining) instead of offering a second sign-in.
  const signedIn = useStore((s) => !!s.currentUserId);

  const signIn = useCallback(async () => {
    if (inFlight || useStore.getState().currentUserId) return;
    if (!isFirebaseConfigured) {
      toast({ message: "Google sign-in isn't configured yet.", tone: "error" });
      return;
    }
    setInFlight(true);
    try {
      await loginWithGoogle();
      // The auth listener moves the app on once the session resolves.
    } catch {
      toast({ message: "Couldn't sign in with Google. Please try again.", tone: "error" });
    } finally {
      setInFlight(false);
    }
  }, [isFirebaseConfigured, loginWithGoogle, toast]);

  return { signIn, signingIn: inProgress || signedIn };
}
