import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeGeneration } from "@/lib/generation";
import { AppShell } from "@/components/AppShell";
import { DashboardClient } from "@/components/DashboardClient";
import { StatTiles } from "@/components/StatTiles";
import type { ClientGeneration } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");
  const userId = user.id;

  const [generations, totalVideos, processing, characters] = await Promise.all([
    prisma.generation.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 60,
      include: { character: { select: { id: true, name: true } } },
    }),
    prisma.generation.count({ where: { userId } }),
    prisma.generation.count({
      where: { userId, status: { in: ["queued", "processing"] } },
    }),
    prisma.character.count({ where: { userId } }),
  ]);

  return (
    <AppShell
      title="My library"
      subtitle="Every clip you have generated, newest first."
      action={
        <Link href="/generate" className="btn-primary hidden sm:inline-flex">
          New video
        </Link>
      }
    >
      <StatTiles
        credits={user.credits}
        plan={user.plan}
        totalVideos={totalVideos}
        processing={processing}
        characters={characters}
      />
      <DashboardClient
        generations={generations.map(
          (row): ClientGeneration => ({ ...serializeGeneration(row), character: row.character }),
        )}
      />
    </AppShell>
  );
}
