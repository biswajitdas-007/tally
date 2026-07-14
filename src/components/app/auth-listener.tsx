"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { firebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { useStore } from "@/store/useStore";

/** Firebase is the source of truth for auth: sets the current uid or signs out. */
export function AuthListener() {
  const setUser = useStore((s) => s.setUser);
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
    const fallback = setTimeout(setAuthReady, 3500);
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) setUser(user.uid);
      else signOut();
      setAuthReady();
    });
    return () => {
      clearTimeout(fallback);
      unsub();
    };
  }, [setUser, signOut, setAuthReady]);

  return null;
}
