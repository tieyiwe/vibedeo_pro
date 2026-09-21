import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listCharacters } from "@/lib/characters";
import { serializeGeneration, toUrl } from "@/lib/generation";
import { isMockMode } from "@/lib/seedance";
import { AppShell } from "@/components/AppShell";
import { GenerateClient } from "@/components/GenerateClient";
import type { ClientCharacter, ClientGeneration } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function GeneratePage({
  searchParams,
}: {
  searchParams: Promise<{ character?: string }>;
}) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login?next=/generate");

  const { character } = await searchParams;

  const [characters, generations] = await Promise.all([
    listCharacters(userId),
    prisma.generation.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { character: { select: { id: true, name: true } } },
    }),
  ]);

  return (
    <AppShell
      title="Create a video"
      subtitle="Text or image in, a finished clip out — with your character kept consistent."
    >
      <GenerateClient
        mockMode={isMockMode()}
        initialCharacterId={character ?? null}
        characters={characters.map(
          (row): ClientCharacter => ({
            id: row.id,
            name: row.name,
            lockedDescription: row.lockedDescription,
            style: row.style,
            referenceImageUrl: toUrl(row.referenceImageUrl),
            seed: row.seed,
            createdAt: row.createdAt.toISOString(),
          }),
        )}
        generations={generations.map(
          (row): ClientGeneration => ({
            ...serializeGeneration(row),
            character: row.character,
          }),
        )}
      />
    </AppShell>
  );
}
