"use client";

import Pusher from "pusher-js";
import { firebaseAuth } from "./firebase";

const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

export const isPusherConfigured = Boolean(key && cluster);

let cached: Pusher | null = null;

export function getPusherClient(): Pusher | null {
  if (!isPusherConfigured) return null;
  if (cached) return cached;
  cached = new Pusher(key!, {
    cluster: cluster!,
    channelAuthorization: {
      endpoint: "/api/pusher/auth",
      transport: "ajax",
      // Attach the Firebase ID token so the server can authorize the channel.
      customHandler: async ({ socketId, channelName }, callback) => {
        try {
          const token = await firebaseAuth()?.currentUser?.getIdToken();
          const res = await fetch("/api/pusher/auth", {
            method: "POST",
            headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ socket_id: socketId, channel_name: channelName }),
          });
          if (!res.ok) return callback(new Error(`auth ${res.status}`), null);
          callback(null, await res.json());
        } catch (e) {
          callback(e as Error, null);
        }
      },
    },
  });
  return cached;
}

export function socketId(): string | undefined {
  return cached?.connection?.socket_id;
}
