import type { NextConfig } from "next";

const configuredDevOrigins = [
  process.env.REPLIT_DEV_DOMAIN,
  ...(process.env.REPLIT_DOMAINS?.split(",") ?? []),
  "localhost",
  "127.0.0.1",
]
  .map((origin) => origin?.trim().replace(/^https?:\/\//, "").replace(/\/+$/, ""))
  .filter((origin): origin is string => Boolean(origin));

const nextConfig: NextConfig = {
  // Replit (and most container hosts) proxy the app through a different origin.
  // Allow the dev-server asset requests that come through it.
  allowedDevOrigins: [
    "*.replit.dev",
    "*.repl.co",
    "*.picard.replit.dev",
    ...configuredDevOrigins,
  ],
  serverExternalPackages: ["@replit/object-storage", "@prisma/client", "bcryptjs"],
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
