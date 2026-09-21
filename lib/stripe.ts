import Stripe from "stripe";
import { optionalEnv } from "./env";

// Pack definitions live in stripe.client.ts so /pricing can import them without
// pulling the Stripe SDK into the browser bundle.
export { CREDIT_PACKS, getCreditPack, formatPrice } from "./stripe.client";
export type { CreditPack } from "./stripe.client";

let stripe: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(optionalEnv("STRIPE_SECRET_KEY"));
}

export function getStripe(): Stripe {
  const key = optionalEnv("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  if (!stripe) stripe = new Stripe(key);
  return stripe;
}
