import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { addPurchasedCredits } from "@/lib/credits";
import { getCreditPack, getStripe, isStripeConfigured } from "@/lib/stripe";
import { optionalEnv } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook.
 *
 * One-time packs are granted on `checkout.session.completed`; subscriptions are
 * granted on `invoice.paid` so every renewal tops the account up (and the
 * initial checkout event doesn't double-count).
 */
export async function POST(request: Request) {
  const secret = optionalEnv("STRIPE_WEBHOOK_SECRET");
  const signature = request.headers.get("stripe-signature");

  if (!isStripeConfigured() || !secret) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch (error) {
    console.error("[stripe] signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "subscription") break; // handled by invoice.paid
        await grant(session.metadata, idOf(session.payment_intent) ?? session.id);
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object;
        const subscriptionId = subscriptionIdOf(invoice);
        if (!subscriptionId) break;
        const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
        await grant(subscription.metadata, invoice.id ?? subscriptionId);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const userId = subscription.metadata?.userId;
        if (userId) {
          await prisma.user.update({ where: { id: userId }, data: { plan: "free" } });
        }
        break;
      }
      default:
        break;
    }
  } catch (error) {
    // Unique constraint on stripePaymentId means a replayed event lands here;
    // that is the idempotency guard working, not a failure worth retrying.
    console.error(`[stripe] failed to handle ${event.type}:`, error);
    return NextResponse.json({ received: true, handled: false });
  }

  return NextResponse.json({ received: true });
}

/** Stripe returns either an id or an expanded object, depending on the request. */
function idOf(value: string | { id: string } | null | undefined): string | undefined {
  if (!value) return undefined;
  return typeof value === "string" ? value : value.id;
}

function subscriptionIdOf(invoice: Stripe.Invoice): string | undefined {
  return idOf(
    (invoice as unknown as { subscription?: string | { id: string } }).subscription,
  );
}

async function grant(
  metadata: Stripe.Metadata | null | undefined,
  paymentId: string,
): Promise<void> {
  const userId = metadata?.userId;
  const packId = metadata?.packId;
  if (!userId || !packId) {
    console.warn("[stripe] event without userId/packId metadata; skipping");
    return;
  }

  const pack = getCreditPack(packId);
  const credits = pack?.credits ?? Number(metadata?.credits ?? 0);
  if (!credits) return;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return;

  await addPurchasedCredits(userId, credits, `Purchase · ${pack?.name ?? packId}`, paymentId);

  if (pack?.plan) {
    await prisma.user.update({ where: { id: userId }, data: { plan: pack.plan } });
  }
}
