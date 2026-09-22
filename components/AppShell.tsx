"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { authRequired } from "@/lib/env";
import { CreditBalance } from "./CreditBalance";
import { BoltIcon, GridIcon, SparkIcon, UsersIcon } from "./Icons";

const NAV = [
  { href: "/generate", label: "Create", icon: SparkIcon },
  { href: "/dashboard", label: "My library", icon: GridIcon },
  { href: "/characters", label: "Characters", icon: UsersIcon },
  { href: "/pricing", label: "Credits", icon: BoltIcon },
];

export function AppShell({
  children,
  title,
  subtitle,
  action,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-ink-700 bg-ink-900/80 p-4 backdrop-blur md:flex">
        <Link href="/" className="mb-8 flex items-center gap-2 px-2 py-1">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-white">
            <SparkIcon className="h-4 w-4" />
          </span>
          <span className="text-lg font-semibold tracking-tight">Vibedeo</span>
        </Link>

        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                  active
                    ? "bg-brand-500/15 text-brand-200 ring-1 ring-inset ring-brand-500/30"
                    : "text-zinc-400 hover:bg-ink-800 hover:text-zinc-100"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3">
          <div className="rounded-2xl border border-ink-700 bg-gradient-to-br from-brand-600/20 to-accent-500/10 p-4">
            <p className="text-sm font-medium text-zinc-100">Make it consistent</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              Save a character once and reuse it across every clip — same face, same outfit.
            </p>
            <Link href="/characters" className="mt-3 inline-block text-xs font-semibold text-brand-300 hover:text-brand-200">
              Create a character →
            </Link>
          </div>

          {status === "authenticated" && (
            <div className="flex items-center justify-between gap-2 rounded-xl px-2 py-1.5">
              <span className="truncate text-xs text-zinc-500" title={session?.user?.email ?? ""}>
                {session?.user?.email}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-xs text-zinc-500 transition hover:text-zinc-200"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-ink-700 bg-ink-950/80 px-5 py-4 backdrop-blur">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold tracking-tight text-zinc-50">{title}</h1>
            {subtitle && <p className="truncate text-sm text-zinc-500">{subtitle}</p>}
          </div>
          {action}
          {!authRequired() && (
            <span
              className="chip hidden border-amber-500/30 text-amber-300 sm:inline-flex"
              title="Every visitor currently shares one dev-preview account. Set NEXT_PUBLIC_REQUIRE_AUTH=true and rebuild to require real sign-in."
            >
              Dev preview · no login
            </span>
          )}
          <CreditBalance />
        </header>

        {/* Mobile nav */}
        <nav className="flex gap-1 overflow-x-auto border-b border-ink-700 bg-ink-900/60 px-3 py-2 md:hidden">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm ${
                  active ? "bg-brand-500/15 text-brand-200" : "text-zinc-400"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          {status === "authenticated" && (
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="ml-auto whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-zinc-500"
            >
              Sign out
            </button>
          )}
        </nav>

        <main className="flex-1 px-5 py-6">{children}</main>
      </div>
    </div>
  );
}
