"use client";

import { useState } from "react";
import { CREDIT_PACKS, formatPrice } from "@/lib/stripe.client";
import { SpinnerIcon } from "./Icons";

export function PricingClient({
  stripeReady,
  purchaseState,
}: {
  stripeReady: boolean;
  purchaseState?: string;
}) {
  const [pendingPack, setPendingPack] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function checkout(packId: string) {
    setPendingPack(packId);
    setError(null);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const data = await response.json();
      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Could not start checkout");
      }
      window.location.href = data.url;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start checkout");
      setPendingPack(null);
    }
  }

  return (
    <div className="space-y-5">
      {purchaseState === "success" && (
        <p className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          Payment received — credits land in your account as soon as Stripe confirms it.
        </p>
      )}
      {purchaseState === "cancelled" && (
        <p className="rounded-xl border border-ink-600 bg-ink-800/70 px-3 py-2 text-sm text-zinc-300">
          Checkout cancelled — nothing was charged.
        </p>
      )}
      {!stripeReady && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Payments aren&apos;t configured yet. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to
          enable checkout.
        </p>
      )}
      {error && (
        <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {CREDIT_PACKS.map((pack) => (
          <div
            key={pack.id}
            className={`card relative flex flex-col p-5 ${
              pack.highlight ? "border-brand-500/60 ring-1 ring-brand-500/30" : ""
            }`}
          >
            {pack.highlight && (
              <span className="absolute -top-2.5 left-5 rounded-full bg-gradient-to-r from-brand-600 to-accent-500 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                Best value
              </span>
            )}
            <h3 className="text-base font-semibold text-zinc-100">{pack.name}</h3>
            <p className="mt-1 text-xs text-zinc-500">{pack.blurb}</p>

            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-semibold tracking-tight text-zinc-50">
                {formatPrice(pack.priceCents)}
              </span>
              {pack.mode === "subscription" && (
                <span className="text-sm text-zinc-500">/{pack.interval ?? "month"}</span>
              )}
            </div>
            <p className="mt-1 text-xs text-brand-300">
              {pack.credits.toLocaleString()} credits
              <span className="text-zinc-500">
                {" "}
                · {(pack.priceCents / pack.credits).toFixed(1)}¢ per credit
              </span>
            </p>

            <ul className="mt-4 space-y-1.5 text-sm text-zinc-400">
              {pack.perks.map((perk) => (
                <li key={perk} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                  {perk}
                </li>
              ))}
            </ul>

            <button
              onClick={() => checkout(pack.id)}
              disabled={!stripeReady || pendingPack !== null}
              className={`mt-5 w-full ${pack.highlight ? "btn-primary" : "btn-ghost"}`}
            >
              {pendingPack === pack.id ? <SpinnerIcon className="h-4 w-4" /> : null}
              {pack.mode === "subscription" ? "Subscribe" : "Buy credits"}
            </button>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-medium text-zinc-200">How credits are spent</h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          1 credit per second of video at 480p/720p, 2 credits per second at 1080p. A 5-second
          720p clip costs 5 credits; the same clip at 1080p costs 10. Failed generations are
          refunded automatically.
        </p>
      </div>
    </div>
  );
}
