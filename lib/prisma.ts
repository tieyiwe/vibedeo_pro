import { PrismaClient } from "@prisma/client";

// Single Prisma client across hot reloads in dev.
// Every database read/write in the app goes through this module — keeping the
// data layer behind Prisma is what makes a later move to Supabase/Neon/RDS a
// DATABASE_URL change rather than a rewrite.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
