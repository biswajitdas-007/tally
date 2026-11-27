"use client";

import { usePathname } from "next/navigation";
import { useStore } from "@/store/useStore";
import { useMounted } from "@/hooks/use-mounted";
import { isFirebaseConfigured } from "@/lib/firebase";
import { AppShell } from "./app-shell";
import { LoginScreen } from "./login-screen";
import { TallyMark } from "./logo";
import { TallyLoader } from "./tally-loader";
import { Button } from "@/components/ui/button";

function Splash() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-bg">
      <TallyLoader />
    </div>
  );
}

function LoadError() {
  const refetch = useStore((s) => s.refetch);
  const setLoadError = useStore((s) => s.setLoadError);
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-5 bg-bg px-6 text-center">
      <TallyMark size={52} />
      <div>
        <h1 className="font-display text-lg font-bold text-text">Couldn&apos;t reach the server</h1>
        <p className="mt-1 max-w-xs text-sm text-text-2">
          Check your connection and try again — your data is safe on the server.
        </p>
      </div>
      <Button
        onClick={() => {
          setLoadError(false);
          refetch();
        }}
      >
        Try again
      </Button>
    </div>
  );
}

/** Routes that render on their own, before (and without) the sign-in gate. */
function isUngated(pathname: string | null): boolean {
  if (!pathname) return false;
  // The join flow renders its own sign-in UI.
  if (pathname.startsWith("/join")) return true;
  // Dev tools (the preview switch). `page.dev.tsx` routes don't exist in
  // production builds at all (see next.config.ts).
  return process.env.NODE_ENV !== "production" && pathname.startsWith("/dev");
}

type Gate = "splash" | "login" | "error" | "ready";

/** Where the signed-in gate stands: still loading, needs sign-in, failed, or ready. */
function gateState(s: { authReady: boolean; dataReady: boolean; loadError: boolean; currentUserId: string | null }): Gate {
  if (isFirebaseConfigured && !s.authReady) return "splash";
  if (!s.currentUserId) return "login";
  if (s.loadError) return "error";
  return s.dataReady ? "ready" : "splash"; // otherwise still loading data from the server
}

export function AppChrome({ children }: { children: React.ReactNode }) {
  const mounted = useMounted();
  const pathname = usePathname();
  const authReady = useStore((s) => s.authReady);
  const dataReady = useStore((s) => s.dataReady);
  const loadError = useStore((s) => s.loadError);
  const currentUserId = useStore((s) => s.currentUserId);

  if (!mounted) return <Splash />;
  if (isUngated(pathname)) return <>{children}</>;

  const gate = gateState({ authReady, dataReady, loadError, currentUserId });
  if (gate === "splash") return <Splash />;
  if (gate === "login") return <LoginScreen />;
  if (gate === "error") return <LoadError />;

  // The report is printed, so it renders on its own. Keeping it outside the
  // shell means the nav, prompts, toasts and sheets simply aren't on the page
  // — far safer than trusting a print stylesheet to hide every one of them.
  if (pathname === "/report") return <>{children}</>;

  return <AppShell>{children}</AppShell>;
}
