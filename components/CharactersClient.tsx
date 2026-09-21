"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ClientCharacter } from "@/lib/types";
import { CharacterCard } from "./CharacterCard";
import { CharacterCreateForm } from "./CharacterCreateForm";

export function CharactersClient({ characters: initial }: { characters: ClientCharacter[] }) {
  const [characters, setCharacters] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleDelete(id: string) {
    const character = characters.find((row) => row.id === id);
    if (!window.confirm(`Delete ${character?.name ?? "this character"}? Past videos are kept.`)) {
      return;
    }
    const previous = characters;
    setCharacters((rows) => rows.filter((row) => row.id !== id));
    try {
      const response = await fetch(`/api/characters/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error((await response.json()).error ?? "Delete failed");
    } catch (caught) {
      setCharacters(previous);
      setError(caught instanceof Error ? caught.message : "Delete failed");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-medium text-zinc-300">New character</h2>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            Define them once. Every clip that uses this character reuses the same locked
            description (and a locked seed), so the face, build and outfit carry over.
          </p>
        </div>
        <CharacterCreateForm
          onCreated={(character) => setCharacters((rows) => [character, ...rows])}
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-zinc-300">
          Your characters {characters.length > 0 && `(${characters.length})`}
        </h2>

        {error && (
          <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </p>
        )}

        {characters.length === 0 ? (
          <div className="card grid place-items-center p-12 text-center text-sm text-zinc-500">
            No characters yet — create one on the left.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {characters.map((character) => (
              <CharacterCard
                key={character.id}
                character={character}
                onDelete={handleDelete}
                onUse={(id) => router.push(`/generate?character=${id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
