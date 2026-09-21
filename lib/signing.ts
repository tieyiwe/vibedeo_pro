import { createHmac, timingSafeEqual } from "node:crypto";
import { optionalEnv } from "./env";

/**
 * Signed object URLs.
 *
 * Generated files must be reachable by two parties that cannot present a
 * session cookie: Seedance (which fetches the first-frame image over plain
 * HTTP) and whoever a user shares a finished clip with. Rather than making the
 * bucket public, /api/files accepts either a logged-in owner or a URL carrying
 * a short HMAC of the object key.
 */

function secret(): string {
  return (
    optionalEnv("AUTH_SECRET") ??
    optionalEnv("NEXTAUTH_SECRET") ??
    // Dev-only fallback so local runs work before secrets are configured.
    "vibedeo-insecure-dev-secret"
  );
}

export function signKey(key: string): string {
  return createHmac("sha256", secret()).update(key).digest("hex").slice(0, 32);
}

export function verifyKeySignature(key: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = Buffer.from(signKey(key));
  const provided = Buffer.from(signature);
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}
