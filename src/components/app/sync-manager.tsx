"use client";

import { useEffect } from "react";
import { useStore } from "@/store/useStore";
import { fetchState, saveState } from "@/lib/api";

/** Loads the signed-in user's data from MongoDB and persists changes back. */
export function SyncManager() {
  const currentUserId = useStore((s) => s.currentUserId);
  const loadServerState = useStore((s) => s.loadServerState);
  const setDataReady = useStore((s) => s.setDataReady);

  // Load once we know who's signed in.
  useEffect(() => {
    if (!currentUserId) return;
    let active = true;
    (async () => {
      const data = await fetchState();
      if (!active) return;
      if (data) loadServerState(data);
      else setDataReady(); // offline / no server — proceed with what we have
    })();
    return () => {
      active = false;
    };
  }, [currentUserId, loadServerState, setDataReady]);

  // Debounced save on any data change, plus a flush when the tab is hidden.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const snapshot = () => {
      const s = useStore.getState();
      return { people: s.people, groups: s.groups, expenses: s.expenses, invites: s.invites };
    };

    const unsub = useStore.subscribe((state, prev) => {
      if (!state.dataReady || !state.currentUserId) return;
      const unchanged =
        state.people === prev.people &&
        state.groups === prev.groups &&
        state.expenses === prev.expenses &&
        state.invites === prev.invites;
      if (unchanged) return;
      clearTimeout(timer);
      timer = setTimeout(() => saveState(snapshot()), 700);
    });

    const onHidden = () => {
      const s = useStore.getState();
      if (document.visibilityState === "hidden" && s.dataReady && s.currentUserId) {
        clearTimeout(timer);
        saveState(snapshot(), { keepalive: true });
      }
    };
    document.addEventListener("visibilitychange", onHidden);

    return () => {
      clearTimeout(timer);
      unsub();
      document.removeEventListener("visibilitychange", onHidden);
    };
  }, []);

  return null;
}
