/** Small helpers for reading optional configuration. */

export function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

export function requireEnv(name: string): string {
  const value = optionalEnv(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

/**
 * The app's public origin.
 *
 * It matters beyond cosmetics: Seedance fetches first-frame images over plain
 * HTTP from this origin, and share links are built from it. Replit injects its
 * hostnames, so derive from those rather than making the operator hand-copy a
 * URL into Secrets — an explicit value still wins when one is set.
 */
export function appUrl(): string {
  const explicit =
    optionalEnv("NEXT_PUBLIC_APP_URL") ??
    optionalEnv("NEXTAUTH_URL") ??
    optionalEnv("AUTH_URL");
  if (explicit) return explicit.replace(/\/+$/, "");

  // REPLIT_DOMAINS is comma-separated and set on deployments;
  // REPLIT_DEV_DOMAIN is the workspace preview host.
  const replitHost =
    optionalEnv("REPLIT_DOMAINS")?.split(",")[0]?.trim() ??
    optionalEnv("REPLIT_DEV_DOMAIN");
  if (replitHost) return `https://${replitHost}`;

  return `http://localhost:${optionalEnv("PORT") ?? "5000"}`;
}
