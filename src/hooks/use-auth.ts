"use client";

import { useCallback } from "react";
import { signInWithPopup, signOut as fbSignOut } from "firebase/auth";
import { firebaseAuth, googleProvider, isFirebaseConfigured } from "@/lib/firebase";
import { useStore } from "@/store/useStore";

export function useAuth() {
  const storeSignOut = useStore((s) => s.signOut);

  const loginWithGoogle = useCallback(async () => {
    const auth = firebaseAuth();
    if (!auth) throw new Error("firebase-not-configured");
    await signInWithPopup(auth, googleProvider());
    // AuthListener picks up the session and loads the user's data.
  }, []);

  const logout = useCallback(async () => {
    const auth = firebaseAuth();
    if (auth) await fbSignOut(auth).catch(() => {});
    storeSignOut();
  }, [storeSignOut]);

  return { isFirebaseConfigured, loginWithGoogle, logout };
}
