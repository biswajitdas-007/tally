import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

// Rate-limit the API and hide dev tools in production; other pages and static
// assets never reach the proxy.
export const config = { matcher: ["/api/:path*", "/dev/:path*"] };

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Per-IP limits, per minute. Writes are cheap to abuse and rare in normal use,
// so they're tighter; reads are looser to tolerate shared/CGNAT mobile IPs.
const WRITE_LIMIT = 60;
const READ_LIMIT = 300;
const WINDOW_SEC = 60;

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") || "anon";
}

export function proxy(req: NextRequest) {
  // Dev-only tools (e.g. the sample-data preview at /dev/preview) don't exist in production.
  const path = req.nextUrl.pathname;
  if (path === "/dev" || path.startsWith("/dev/")) {
    return process.env.NODE_ENV === "production" ? new NextResponse(null, { status: 404 }) : NextResponse.next();
  }

  const isWrite = WRITE_METHODS.has(req.method.toUpperCase());
  const limit = isWrite ? WRITE_LIMIT : READ_LIMIT;
  const r = rateLimit(`${isWrite ? "w" : "r"}:${clientIp(req)}`, limit, WINDOW_SEC);

  if (!r.success) {
    return NextResponse.json(
      { error: "rate-limited" },
      {
        status: 429,
        headers: {
          "Retry-After": String(r.retryAfter),
          "X-RateLimit-Limit": String(r.limit),
          "X-RateLimit-Remaining": String(r.remaining),
          "X-RateLimit-Reset": String(Math.ceil(r.reset / 1000)),
        },
      },
    );
  }

  const res = NextResponse.next();
  res.headers.set("X-RateLimit-Limit", String(r.limit));
  res.headers.set("X-RateLimit-Remaining", String(r.remaining));
  return res;
}
