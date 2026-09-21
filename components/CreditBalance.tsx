"use client";

import Link from "next/link";
import { useCredits } from "./CreditsContext";
import { CreditIcon } from "./Icons";

export function CreditBalance() {
  const { credits } = useCredits();

  return (
    <Link
      href="/pricing"
      className="group flex items-center gap-2 rounded-xl border border-ink-600 bg-ink-800/70 px-3 py-2 text-sm transition hover:border-brand-500/60 hover:bg-ink-700"
      title="Buy more credits"
    >
      <CreditIcon className="h-4 w-4 text-brand-300" />
      <span className="font-semibold tabular-nums text-zinc-100">
        {credits === null ? "—" : credits.toLocaleString()}
      </span>
      <span className="hidden text-zinc-400 sm:inline">credits</span>
      <span className="ml-1 hidden rounded-lg bg-gradient-to-r from-brand-600 to-accent-500 px-2 py-0.5 text-[11px] font-semibold text-white group-hover:brightness-110 sm:inline">
        Top up
      </span>
    </Link>
  );
}
