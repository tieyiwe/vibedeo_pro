import NextAuth, { type NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { optionalEnv } from "./env";

/**
 * All session/auth logic lives here.
 *
 * There is no database-level Row Level Security on plain Postgres, so access
 * control is enforced in code: every route handler resolves the caller with
 * `requireUserId()` and scopes its Prisma queries by that id. Keeping this in
 * one module is also what makes a later swap to Supabase Auth a single-file
 * change.
 *
 * Session strategy is JWT because Auth.js cannot issue database sessions for
 * the Credentials provider. Users, OAuth accounts and verification tokens are
 * still persisted in Postgres through the Prisma adapter.
 */

const googleId = optionalEnv("GOOGLE_CLIENT_ID");
const googleSecret = optionalEnv("GOOGLE_CLIENT_SECRET");

export const FREE_TIER_CREDITS = 20;

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  secret: optionalEnv("AUTH_SECRET") ?? optionalEnv("NEXTAUTH_SECRET"),
  trustHost: true,
  pages: { signIn: "/login", newUser: "/generate" },
  providers: [
    ...(googleId && googleSecret
      ? [Google({ clientId: googleId, clientSecret: googleSecret, allowDangerousEmailAccountLinking: true })]
      : []),
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
  events: {
    // Google sign-ups go straight through the adapter, so grant the free-tier
    // credits (and log the transaction) the first time an account is created.
    async createUser({ user }) {
      if (!user.id) return;
      await prisma.creditTransaction.create({
        data: {
          userId: user.id,
          amount: FREE_TIER_CREDITS,
          type: "bonus",
          description: "Free tier welcome credits",
        },
      });
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

/** The current user's id, or null when signed out. */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

/** The current user's id, throwing when signed out. Use in route handlers. */
export async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw new UnauthorizedError();
  return userId;
}

/** The full current user row, or null when signed out. */
export async function getCurrentUser() {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}
