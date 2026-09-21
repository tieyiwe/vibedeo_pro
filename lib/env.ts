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

export function appUrl(): string {
  return (
    optionalEnv("NEXT_PUBLIC_APP_URL") ??
    optionalEnv("NEXTAUTH_URL") ??
    "http://localhost:3000"
  );
}
