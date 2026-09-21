import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Replit (and most container hosts) proxy the app through a different origin.
  // Allow the dev-server asset requests that come through it.
  allowedDevOrigins: ["*.replit.dev", "*.repl.co", "*.picard.replit.dev"],
  serverExternalPackages: ["@replit/object-storage", "@prisma/client", "bcryptjs"],
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
