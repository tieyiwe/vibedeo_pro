"use client";

import Link from "next/link";
import type { ClientCharacter, ClientGeneration } from "@/lib/types";
import { GenerationForm } from "./GenerationForm";
import { VideoCard } from "./VideoCard";
import { useGenerationPolling } from "./useGenerationPolling";

export function GenerateClient({
  characters,
  generations: initialGenerations,
  initialCharacterId,
  mockMode,
}: {
  characters: ClientCharacter[];
  generations: ClientGeneration[];
  initialCharacterId?: string | null;
  mockMode: boolean;
}) {
  const { generations, prepend } = useGenerationPolling(initialGenerations);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4">
        {mockMode && (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            Running in mock mode — SEEDANCE_API_KEY isn&apos;t set, so jobs complete with a
            placeholder clip. The full loop (credits, queue, history) still works.
          </p>
        )}

        <GenerationForm
          characters={characters}
          initialCharacterId={initialCharacterId}
          onQueued={prepend}
        />
      </div>

      <aside className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-300">Recent</h2>
          <Link href="/dashboard" className="text-xs text-brand-300 hover:text-brand-200">
            View all →
          </Link>
        </div>

        {generations.length === 0 ? (
          <div className="card grid place-items-center p-8 text-center text-sm text-zinc-500">
            Your clips will show up here as they render.
          </div>
        ) : (
          <div className="space-y-3">
            {generations.slice(0, 6).map((generation) => (
              <VideoCard key={generation.id} generation={generation} />
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}
