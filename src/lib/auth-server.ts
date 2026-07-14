import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Verifies a Firebase ID token server-side using Google's public keys
 * (JWKS) — no Admin SDK / service-account key required. Returns the uid.
 */
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

export async function verifyUid(req: Request): Promise<string | null> {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7);
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
