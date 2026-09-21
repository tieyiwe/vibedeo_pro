import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isStripeConfigured } from "@/lib/stripe";
import { AppShell } from "@/components/AppShell";
import { PricingClient } from "@/components/PricingClient";

export const dynamic = "force-dynamic";

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ purchase?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/pricing");

  const { purchase } = await searchParams;

  return (
    <AppShell
      title="Credits"
      subtitle={`You have ${user.credits.toLocaleString()} credits on the ${user.plan} plan.`}
    >
      <PricingClient stripeReady={isStripeConfigured()} purchaseState={purchase} />
    </AppShell>
  );
}
