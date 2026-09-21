import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeGeneration } from "@/lib/generation";
import { AppShell } from "@/components/AppShell";
import { DashboardClient } from "@/components/DashboardClient";
import type { ClientGeneration } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login?next=/dashboard");

  const generations = await prisma.generation.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 60,
    include: { character: { select: { id: true, name: true } } },
  });

  return (
    <AppShell
      title="My library"
      subtitle={`${generations.length} generation${generations.length === 1 ? "" : "s"}`}
      action={
        <Link href="/generate" className="btn-primary hidden sm:inline-flex">
          New video
        </Link>
      }
    >
      <DashboardClient
        generations={generations.map(
          (row): ClientGeneration => ({ ...serializeGeneration(row), character: row.character }),
        )}
      />
    </AppShell>
  );
}
