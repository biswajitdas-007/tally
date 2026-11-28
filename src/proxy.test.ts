import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { config, proxy } from "./proxy";

afterEach(() => vi.unstubAllEnvs());

describe("proxy: dev tools", () => {
  it("is matched for /dev routes as well as the API", () => {
    expect(config.matcher).toEqual(["/api/:path*", "/dev/:path*"]);
  });

  it("serves /dev routes in development without rate limiting", () => {
    vi.stubEnv("NODE_ENV", "development");
    const res = proxy(new NextRequest("http://localhost/dev/preview"));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-RateLimit-Limit")).toBeNull();
  });

  it("answers 404 for /dev routes in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(proxy(new NextRequest("https://tally.test/dev/preview")).status).toBe(404);
    expect(proxy(new NextRequest("https://tally.test/dev")).status).toBe(404);
    expect(proxy(new NextRequest("https://tally.test/dev/")).status).toBe(404);
  });

  it("leaves look-alike paths alone", () => {
    vi.stubEnv("NODE_ENV", "production");
    const res = proxy(new NextRequest("https://tally.test/devices", { headers: { "x-forwarded-for": "203.0.113.7" } }));
    expect(res.status).toBe(200);
  });

  it("still rate-limits the API", () => {
    const res = proxy(new NextRequest("https://tally.test/api/state", { headers: { "x-forwarded-for": "203.0.113.9" } }));
    expect(res.headers.get("X-RateLimit-Limit")).toBe("300");
  });
});
