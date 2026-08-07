"use client";

import { useEffect } from "react";
import { useStore } from "@/store/useStore";
import * as api from "@/lib/api";
import { getPusherClient, isPusherConfigured } from "@/lib/pusher-client";
import { getSyncQueue, removeSyncRequest } from "@/lib/sync-queue";

/** Loads the user's shared data (with retry) and keeps it live via Pusher. */
export function SyncManager() {
  const currentUserId = useStore((s) => s.currentUserId);
  const loadState = useStore((s) => s.loadState);
  const setLoadError = useStore((s) => s.setLoadError);

  // Queue processing logic
  const processQueue = async () => {
    const queue = await getSyncQueue();
    if (queue.length === 0) return true; // Queue empty, safe to pull

    let success = true;
    for (const req of queue) {
      try {
        const t = typeof window !== "undefined" ? await api.token() : null;
        if (!t) continue;
        
        const res = await fetch(req.path, {
          method: req.method,
          headers: { authorization: `Bearer ${t}`, ...(req.body ? { "content-type": "application/json" } : {}) },
          body: req.body ? JSON.stringify(req.body) : undefined,
        });

        if (res.ok || (res.status >= 400 && res.status < 500)) {
          // If 200 OK or 4xx (client error), remove it from queue to avoid poison pill loop
          await removeSyncRequest(req.id);
        } else {
          // 5xx error, stop processing and retry later
          success = false;
          break;
        }
      } catch {
        // Network error, stop processing
        success = false;
        break;
      }
    }
    return success;
  };

  // Initial load — retry on failure, NEVER show an empty (savable) app.
  useEffect(() => {
    if (!currentUserId) return;
    let active = true;
    let attempt = 0;
    setLoadError(false);

    const load = async () => {
      // First, attempt to flush any offline mutations to the server
      const queueCleared = await processQueue();
      
      // If we couldn't clear the queue (offline), DO NOT overwrite local state with fetchState
      // Just rely on the locally persisted idbStorage state.
      if (!queueCleared) {
        attempt += 1;
        if (attempt <= 6) setTimeout(load, Math.min(1000 * 2 ** attempt, 8000));
        return;
      }

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
    
    // Also listen for online events to eagerly flush
    const handleOnline = async () => {
      const cleared = await processQueue();
      if (cleared) {
        useStore.getState().refetch();
      }
    };
    window.addEventListener("online", handleOnline);

    return () => {
      active = false;
      window.removeEventListener("online", handleOnline);
    };
  }, [currentUserId, loadState, setLoadError]);

  // Realtime: subscribe to my private channel; refetch on any "sync" nudge + on refocus.
  useEffect(() => {
    if (!currentUserId) return;
    let timer: ReturnType<typeof setTimeout>;
    const debouncedRefetch = async () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        // Only pull server state if we don't have pending mutations overriding it
        const queue = await getSyncQueue();
        if (queue.length === 0) {
          useStore.getState().refetch();
        } else {
          // Attempt to flush instead
          const cleared = await processQueue();
          if (cleared) useStore.getState().refetch();
        }
      }, 250);
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

    let lastVisRefetch = 0;
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastVisRefetch < 8000) return; // don't refetch on every glance
      lastVisRefetch = Date.now();
      debouncedRefetch();
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
