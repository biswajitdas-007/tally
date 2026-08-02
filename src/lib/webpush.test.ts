import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PushSubscription } from "web-push";

const push = vi.hoisted(() => ({
  sendNotification: vi.fn(),
  setVapidDetails: vi.fn(),
}));

vi.mock("web-push", () => ({ default: push }));

const subscription = (endpoint: string): PushSubscription => ({
  endpoint,
  keys: { p256dh: "public", auth: "auth" },
});

async function load(configured: boolean) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", configured ? "public-key" : "");
  vi.stubEnv("VAPID_PRIVATE_KEY", configured ? "private-key" : "");
  return import("./webpush");
}

describe("sendPush", () => {
  beforeEach(() => {
    push.sendNotification.mockReset();
    push.setVapidDetails.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reports unconfigured subscriptions as failed without losing array compatibility", async () => {
    const { sendPush } = await load(false);
    const result = await sendPush([subscription("https://push.test/one")], { title: "Hi", body: "Body" });

    expect([...result]).toEqual([]);
    expect(result).toMatchObject({ sent: 0, failed: 1, dead: 0 });
    expect(push.sendNotification).not.toHaveBeenCalled();
  });

  it("deduplicates endpoints and reports sent, failed, and dead outcomes", async () => {
    push.sendNotification.mockImplementation(async (sub: PushSubscription) => {
      if (sub.endpoint.endsWith("dead")) throw Object.assign(new Error("gone"), { statusCode: 410 });
      if (sub.endpoint.endsWith("failed")) throw Object.assign(new Error("busy"), { statusCode: 503 });
    });
    const { sendPush } = await load(true);
    const live = subscription("https://push.test/live");
    const result = await sendPush(
      [
        live,
        live,
        subscription("https://push.test/dead"),
        subscription("https://push.test/failed"),
        null as unknown as PushSubscription,
      ],
      { title: "EMI due", body: "Tomorrow", tag: "loan:2026-08:upcoming", ttl: 3600, urgency: "high" },
    );

    expect([...result]).toEqual(["https://push.test/dead"]);
    expect(result).toMatchObject({ sent: 1, failed: 2, dead: 1 });
    expect(push.sendNotification).toHaveBeenCalledTimes(3);

    const [, encoded, options] = push.sendNotification.mock.calls[0];
    expect(JSON.parse(encoded)).toMatchObject({ title: "EMI due", tag: "loan:2026-08:upcoming" });
    expect(JSON.parse(encoded)).not.toHaveProperty("ttl");
    expect(options).toMatchObject({ TTL: 3600, urgency: "high", timeout: 10_000 });
    expect(options.topic).toMatch(/^[A-Za-z0-9_-]{32}$/);
  });

  it("contains invalid VAPID initialization and exposes it through failure metrics", async () => {
    push.setVapidDetails.mockImplementationOnce(() => {
      throw new Error("invalid key");
    });
    const { isPushConfigured, sendPush } = await load(true);
    const result = await sendPush([subscription("https://push.test/one")], { title: "Hi", body: "Body" });

    expect(isPushConfigured).toBe(false);
    expect(result).toMatchObject({ sent: 0, failed: 1, dead: 0 });
  });
});
