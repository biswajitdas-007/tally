"use client";

import { useCallback } from "react";
import { signInWithPopup, signOut as fbSignOut } from "firebase/auth";
import { firebaseAuth, googleProvider, isFirebaseConfigured } from "@/lib/firebase";
import { useStore } from "@/store/useStore";

export function useAuth() {
  const signInReal = useStore((s) => s.signInReal);
  const storeSignOut = useStore((s) => s.signOut);

  const loginWithGoogle = useCallback(async () => {
    const auth = firebaseAuth();
    if (!auth) throw new Error("firebase-not-configured");
    const res = await signInWithPopup(auth, googleProvider());
    const u = res.user;
    signInReal({
      name: u.displayName || u.email?.split("@")[0] || "You",
      email: u.email ?? undefined,
      photoURL: u.photoURL ?? undefined,
    });
  }, [signInReal]);

  const logout = useCallback(async () => {
    const auth = firebaseAuth();
    if (auth) await fbSignOut(auth).catch(() => {});
    storeSignOut();
  }, [storeSignOut]);

  return { isFirebaseConfigured, loginWithGoogle, logout };
}
