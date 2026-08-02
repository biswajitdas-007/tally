"use client";

import { useCallback, useEffect, useState } from "react";
import { subscribePushApi, unsubscribePushApi } from "@/lib/api";
import { firebaseAuth } from "@/lib/firebase";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PUSH_OPT_OUT_KEY = "tally:push-opt-out";
const registrationRequests = new Map<string, Promise<boolean>>();

function pushOptedOut(): boolean {
  try {
    return localStorage.getItem(PUSH_OPT_OUT_KEY) === "1";
  } catch {
    return false;
  }
}

function setPushOptOut(value: boolean): void {
  try {
    if (value) localStorage.setItem(PUSH_OPT_OUT_KEY, "1");
    else localStorage.removeItem(PUSH_OPT_OUT_KEY);
  } catch {
    // Browser subscription state still remains authoritative for this session.
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/** Coalesce the app shell's multiple usePush consumers onto one server write. */
function registerOnServer(sub: PushSubscription): Promise<boolean> {
  // Include the current identity: an in-flight request from a signed-out or
  // previous account must never make a new account appear registered.
  const requestKey = `${firebaseAuth()?.currentUser?.uid ?? "anonymous"}\u0000${sub.endpoint}`;
  const existing = registrationRequests.get(requestKey);
  if (existing) return existing;

  const request = subscribePushApi(JSON.parse(JSON.stringify(sub)))
    .then((res) => Boolean(res?.ok))
    .catch(() => false)
    .finally(() => {
      if (registrationRequests.get(requestKey) === request) registrationRequests.delete(requestKey);
    });
  registrationRequests.set(requestKey, request);
  return request;
}

export function usePush() {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ok =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window &&
      Boolean(VAPID);
    let active = true;
    queueMicrotask(() => {
      if (active) setSupported(ok);
    });
    if (!ok) {
      return () => {
        active = false;
      };
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then(async (sub) => {
        if (pushOptedOut()) {
          if (sub) {
            const disabled = await sub.unsubscribe().catch(() => false);
            if (disabled) await unsubscribePushApi(sub.endpoint).catch(() => null);
          }
          if (active) setEnabled(false);
          return;
        }
        const registered = sub ? await registerOnServer(sub) : false;
        if (active) setEnabled(registered);
      })
      .catch(() => {
        if (active) setEnabled(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const enable = useCallback(async (options?: { automatic?: boolean }): Promise<boolean> => {
    if (!supported) return false;
    if (options?.automatic && pushOptedOut()) return false;
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return false;
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID!) as BufferSource,
        });
      }
      if (!(await registerOnServer(sub))) {
        setEnabled(false);
        return false;
      }
      if (options?.automatic && pushOptedOut()) {
        const disabled = await sub.unsubscribe().catch(() => false);
        if (disabled) await unsubscribePushApi(sub.endpoint).catch(() => null);
        setEnabled(false);
        return false;
      }
      setEnabled(true);
      if (!options?.automatic) setPushOptOut(false);
      return true;
    } catch {
      setEnabled(false);
      return false;
    } finally {
      setBusy(false);
    }
  }, [supported]);

  const disable = useCallback(async (): Promise<boolean> => {
    if (!supported) return false;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const disabled = await sub.unsubscribe();
        if (!disabled) {
          setEnabled(true);
          return false;
        }
        // The browser is authoritative for delivery. Server cleanup is still
        // attempted, and any stale endpoint will also be pruned on its next 410.
        await unsubscribePushApi(sub.endpoint).catch(() => null);
      }
      setPushOptOut(true);
      setEnabled(false);
      return true;
    } catch {
      // Preserve the previous state when the server-side operation could not
      // be verified; never claim a successful disable on a failed request.
      return false;
    } finally {
      setBusy(false);
    }
  }, [supported]);

  return { supported, enabled, busy, enable, disable };
}
