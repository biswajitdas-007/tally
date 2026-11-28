"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SignInScreen } from "@/components/auth/sign-in-screen";
import { TallyLoader } from "@/components/app/tally-loader";
import { isFirebaseConfigured } from "@/lib/firebase";
import { useStore } from "@/store/useStore";

export default function SignInPage() {
  const router = useRouter();
  const authReady = useStore((s) => s.authReady);
  const signedIn = useStore((s) => !!s.currentUserId);

  // Wait for Firebase to confirm the session (a stale saved uid shouldn't bounce
  // the visitor), then carry signed-in users on into the app.
  const resolved = authReady || !isFirebaseConfigured;
  useEffect(() => {
    if (resolved && signedIn) router.replace("/");
  }, [resolved, signedIn, router]);

  if (!resolved || signedIn) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-bg">
        <TallyLoader />
      </div>
    );
  }
  return <SignInScreen />;
}
