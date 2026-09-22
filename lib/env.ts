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

/**
 * TEMPORARY dev switch: true once real sign-in enforcement is back on.
 *
 * Unset (the default), every request is treated as a single shared "dev
 * preview" user — see lib/auth.ts — so the rest of the product can be built
 * and clicked through without a login step. Set NEXT_PUBLIC_REQUIRE_AUTH="true"
 * to turn real auth back on.
 *
 * Client-safe by construction: this file has no server-only imports, and the
 * reference below is a static `process.env.NEXT_PUBLIC_...` access (not a
 * dynamic lookup through `optionalEnv`), which is what lets Next.js inline it
 * into the browser bundle. Because of that inlining, the CLIENT sees whatever
 * value was set at the last `next build` — restarting the server alone is not
 * enough after changing this var, you need to rebuild.
 */
export function authRequired(): boolean {
  return process.env.NEXT_PUBLIC_REQUIRE_AUTH === "true";
}
