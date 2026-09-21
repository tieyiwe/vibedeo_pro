import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkoutSchema } from "@/lib/validation";
import { getCreditPack, getStripe, isStripeConfigured } from "@/lib/stripe";
import { appUrl } from "@/lib/env";
import { errorResponse } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Start a Stripe Checkout session for a credit pack or subscription. */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { packId } = checkoutSchema.parse(await request.json());

    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: "Payments are not configured yet. Set STRIPE_SECRET_KEY." },
        { status: 503 },
      );
    }

    const pack = getCreditPack(packId);
    if (!pack) return NextResponse.json({ error: "Unknown pack" }, { status: 404 });

    const stripe = getStripe();

    // Reuse one Stripe customer per user so subscriptions and receipts line up.
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name ?? undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const metadata = { userId: user.id, packId: pack.id, credits: String(pack.credits) };

    const session = await stripe.checkout.sessions.create({
      mode: pack.mode,
      customer: customerId,
      client_reference_id: user.id,
      metadata,
      ...(pack.mode === "subscription" ? { subscription_data: { metadata } } : {}),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: pack.priceCents,
            product_data: {
              name: `Vibedeo · ${pack.name}`,
              description: `${pack.credits.toLocaleString()} credits`,
            },
            ...(pack.mode === "subscription"
              ? { recurring: { interval: pack.interval ?? "month" } }
              : {}),
          },
        },
      ],
      success_url: `${appUrl()}/dashboard?purchase=success`,
      cancel_url: `${appUrl()}/pricing?purchase=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return errorResponse(error);
  }
}
