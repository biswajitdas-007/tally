"use client";

import { useEffect } from "react";
import { useStore } from "@/store/useStore";
import * as api from "@/lib/api";
import { getPusherClient, isPusherConfigured } from "@/lib/pusher-client";

/** Loads the user's shared data (with retry) and keeps it live via Pusher. */
export function SyncManager() {
  const currentUserId = useStore((s) => s.currentUserId);
  const loadState = useStore((s) => s.loadState);
  const setLoadError = useStore((s) => s.setLoadError);

  // Initial load — retry on failure, NEVER show an empty (savable) app.
  useEffect(() => {
    if (!currentUserId) return;
    let active = true;
    let attempt = 0;
    setLoadError(false);

    const load = async () => {
      const data = await api.fetchState();
      if (!active) return;
      if (data && data.me) {
        loadState(data);
      } else {
        attempt += 1;
        if (attempt <= 6) setTimeout(load, Math.min(1000 * 2 ** attempt, 8000));
        else setLoadError(true);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [currentUserId, loadState, setLoadError]);

  // Realtime: subscribe to my private channel; refetch on any "sync" nudge + on refocus.
  useEffect(() => {
    if (!currentUserId) return;
    let timer: ReturnType<typeof setTimeout>;
    const debouncedRefetch = () => {
      clearTimeout(timer);
      timer = setTimeout(() => useStore.getState().refetch(), 250);
    };

    let cleanupPusher: (() => void) | undefined;
    if (isPusherConfigured) {
      const pusher = getPusherClient();
      if (pusher) {
        const channelName = `private-user-${currentUserId}`;
        const channel = pusher.subscribe(channelName);
        channel.bind("sync", debouncedRefetch);
        cleanupPusher = () => {
          channel.unbind("sync", debouncedRefetch);
          pusher.unsubscribe(channelName);
        };
      }
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") debouncedRefetch();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearTimeout(timer);
      cleanupPusher?.();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [currentUserId]);

  return null;
}
