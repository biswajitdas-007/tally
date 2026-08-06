"use client";

import { useCallback, useEffect } from "react";
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut,
} from "firebase/auth";
import { firebaseAuth, firebaseAuthReady, googleProvider, isFirebaseConfigured } from "@/lib/firebase";
import { useStore } from "@/store/useStore";

export function useAuth() {
  const storeSignOut = useStore((s) => s.signOut);

  // Handle the redirect result when the page loads after a redirect sign-in.
  useEffect(() => {
    let active = true;
    firebaseAuthReady()
      .then((auth) => {
        if (!active || !auth) return;
        return getRedirectResult(auth);
      })
      .catch(() => {
        // Silently ignore — redirect result is only present after a redirect flow.
      });
    return () => {
      active = false;
    };
  }, []);

  const loginWithGoogle = useCallback(async () => {
    // Wait for persistence to be configured before sign-in.
    const auth = await firebaseAuthReady();
    if (!auth) throw new Error("firebase-not-configured");
    try {
      await signInWithPopup(auth, googleProvider());
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      const msg = (err as { message?: string })?.message ?? "";
      console.warn("[Tally Auth] signInWithPopup failed:", code, msg);

      // Popup blocked, closed by browser/COOP, or IndexedDB error —
      // fall back to redirect flow which always works.
      if (
        code === "auth/popup-blocked" ||
        code === "auth/popup-closed-by-browser" ||
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request" ||
        code === "auth/internal-error" ||
        msg.includes("Database is closing")
      ) {
        console.warn("[Tally Auth] Falling back to signInWithRedirect");
        await signInWithRedirect(auth, googleProvider());
        return; // page will redirect away
      }
      throw err;
    }
    // AuthListener picks up the session and loads the user's data.
  }, []);

  const logout = useCallback(async () => {
    const auth = firebaseAuth();
    if (auth) await fbSignOut(auth).catch(() => {});
    storeSignOut();
  }, [storeSignOut]);

  return { isFirebaseConfigured, loginWithGoogle, logout };
}
