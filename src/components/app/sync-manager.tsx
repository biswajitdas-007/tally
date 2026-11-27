"use client";

import { useEffect } from "react";
import { useStore } from "@/store/useStore";
import * as api from "@/lib/api";
import { getPusherClient, isPusherConfigured } from "@/lib/pusher-client";
import { belongsTo, getSyncQueue, removeSyncRequest, type SyncRequest } from "@/lib/sync-queue";
import { firebaseAuth } from "@/lib/firebase";
import { isPreviewSession } from "@/lib/preview";

type Outcome = "done" | "retry";

/** Sends one queued write. 2xx and 4xx are final (a 4xx would fail forever); 5xx is retried later. */
async function replay(req: SyncRequest, token: string): Promise<Outcome> {
  // Someone else's offline write: drop it rather than send it as this user.
  if (belongsTo(req, firebaseAuth()?.currentUser?.uid)) {
    const res = await fetch(req.path, {
      method: req.method,
      headers: { authorization: `Bearer ${token}`, ...(req.body ? { "content-type": "application/json" } : {}) },
      body: req.body ? JSON.stringify(req.body) : undefined,
    });
    if (res.status >= 500) return "retry";
  }
  await removeSyncRequest(req.id);
  return "done";
}

/** Flushes offline writes in order. Returns false if something must wait (offline or server error). */
async function processQueue(): Promise<boolean> {
  for (const req of await getSyncQueue()) {
    const t = await api.token();
    if (!t) continue;
    const outcome = await replay(req, t).catch((): Outcome => "retry");
    if (outcome === "retry") return false;
  }
  return true;
}

/** Pulls server state, first flushing offline writes so they aren't overwritten. */
async function flushThenRefetch() {
  if (await processQueue()) useStore.getState().refetch();
}

/** Loads the user's shared data (with retry) and keeps it live via Pusher. */
export function SyncManager() {
  const currentUserId = useStore((s) => s.currentUserId);
  const loadState = useStore((s) => s.loadState);
  const setLoadError = useStore((s) => s.setLoadError);

  // Initial load — retry on failure, NEVER show an empty (savable) app.
  useEffect(() => {
    // A dev preview session runs on sample data: no loading, no realtime.
    if (!currentUserId || isPreviewSession()) return;
    let active = true;
    let attempt = 0;
    setLoadError(false);

    const retry = () => {
      attempt += 1;
      if (attempt <= 6) setTimeout(load, Math.min(1000 * 2 ** attempt, 8000));
      return attempt <= 6;
    };

    const load = async () => {
      // Flush offline writes first. If that fails (still offline), keep the
      // locally persisted state rather than overwrite it with the server's.
      if (!(await processQueue())) {
        retry();
        return;
      }
      const data = await api.fetchState();
      if (!active) return;
      if (data?.me) loadState(data);
      else if (!retry()) setLoadError(true);
    };
    load();
    
    // Also listen for online events to eagerly flush
    window.addEventListener("online", flushThenRefetch);

    return () => {
      active = false;
      window.removeEventListener("online", flushThenRefetch);
    };
  }, [currentUserId, loadState, setLoadError]);

  // Realtime: subscribe to my private channel; refetch on any "sync" nudge + on refocus.
  useEffect(() => {
    // A dev preview session runs on sample data: no loading, no realtime.
    if (!currentUserId || isPreviewSession()) return;
    let timer: ReturnType<typeof setTimeout>;
    const debouncedRefetch = () => {
      clearTimeout(timer);
      timer = setTimeout(flushThenRefetch, 250);
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
