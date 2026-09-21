/**
 * Client-safe slice of the Stripe config: the packs and price formatting, with
 * no SDK import, so /pricing can render them without pulling server code into
 * the browser bundle.
 */

export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  priceCents: number;
  blurb: string;
  mode: "payment" | "subscription";
  interval?: "month";
  plan?: "free" | "creator" | "pro";
  highlight?: boolean;
  perks: string[];
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: "starter-200",
    name: "Starter pack",
    credits: 200,
    priceCents: 900,
    blurb: "One-time top-up — roughly 40 clips at 5s / 720p.",
    mode: "payment",
    perks: ["200 credits", "Never expires", "All styles + characters"],
  },
  {
    id: "pro-1000",
    name: "Pro pack",
    credits: 1000,
    priceCents: 3900,
    blurb: "One-time top-up — best value per credit.",
    mode: "payment",
    highlight: true,
    perks: ["1,000 credits", "Never expires", "Priority queue"],
  },
  {
    id: "creator-monthly",
    name: "Creator",
    credits: 600,
    priceCents: 1900,
    blurb: "600 credits dropped into your account every month.",
    mode: "subscription",
    interval: "month",
    plan: "creator",
    perks: ["600 credits / month", "Cancel anytime", "Priority queue"],
  },
];

export function getCreditPack(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((pack) => pack.id === id);
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}
