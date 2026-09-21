import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";
import { listCharacters } from "@/lib/characters";
import { toUrl } from "@/lib/generation";
import { AppShell } from "@/components/AppShell";
import { CharactersClient } from "@/components/CharactersClient";
import type { ClientCharacter } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CharactersPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login?next=/characters");

  const characters = await listCharacters(userId);

  return (
    <AppShell
      title="Characters"
      subtitle="Reusable cast members that stay visually consistent across clips."
    >
      <CharactersClient
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
      />
    </AppShell>
  );
}
