"use client";

import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TallyMark } from "@/components/app/logo";

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <TallyMark size={52} />
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-inset text-text-3">
        <WifiOff className="h-7 w-7" />
      </div>
      <div>
        <h1 className="font-display text-xl font-bold text-text">You&apos;re offline</h1>
        <p className="mt-1 max-w-xs text-sm text-text-2">
          Tally works offline once loaded. Reconnect to sync your latest changes.
        </p>
      </div>
      <Button onClick={() => location.reload()}>Try again</Button>
    </div>
  );
}
