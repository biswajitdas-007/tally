import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Verifies a Firebase ID token server-side using Google's public keys
 * (JWKS) — no Admin SDK / service-account key required.
 */
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

export interface AuthUser {
  uid: string;
  name?: string;
  email?: string;
  picture?: string;
}

export async function verifyUser(req: Request): Promise<AuthUser | null> {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7);
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      algorithms: ["RS256"], // Firebase signs with RS256 — reject anything else
    });
    if (typeof payload.sub !== "string") return null;
    return {
      uid: payload.sub,
      name: typeof payload.name === "string" ? payload.name : undefined,
      email: typeof payload.email === "string" ? payload.email : undefined,
      picture: typeof payload.picture === "string" ? payload.picture : undefined,
    };
  } catch {
    return null;
  }
}

export async function verifyUid(req: Request): Promise<string | null> {
  return (await verifyUser(req))?.uid ?? null;
}
