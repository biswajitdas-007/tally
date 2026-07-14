"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { firebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { useStore } from "@/store/useStore";

/**
 * Makes Firebase the source of truth for auth when configured: restores a
 * returning user's session on load and forces the login screen when signed out.
 */
export function AuthListener() {
  const signInReal = useStore((s) => s.signInReal);
  const signOut = useStore((s) => s.signOut);
  const setAuthReady = useStore((s) => s.setAuthReady);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setAuthReady();
      return;
    }
    const auth = firebaseAuth();
    if (!auth) {
      setAuthReady();
      return;
    }
    // Safety net so the UI never hangs on the splash if auth is slow/offline.
    const fallback = setTimeout(setAuthReady, 3500);
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        signInReal({
          name: user.displayName || user.email?.split("@")[0] || "You",
          email: user.email ?? undefined,
          photoURL: user.photoURL ?? undefined,
        });
      } else {
        signOut();
      }
      setAuthReady();
    });
    return () => {
      clearTimeout(fallback);
      unsub();
    };
  }, [signInReal, signOut, setAuthReady]);

  return null;
}
