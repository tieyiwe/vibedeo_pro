"use client";

import { useState } from "react";
import { STYLE_PRESETS } from "@/lib/stylePresets";
import type { ClientCharacter } from "@/lib/types";
import { TrashIcon, UsersIcon } from "./Icons";

export function CharacterCard({
  character,
  onDelete,
  onUse,
}: {
  character: ClientCharacter;
  onDelete: (id: string) => void;
  onUse: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="card flex flex-col overflow-hidden">
      <div className="relative h-40 bg-gradient-to-br from-ink-800 to-ink-900">
        {character.referenceImageUrl ? (
          // Plain <img>: the source is our own signed file route, and
          // next/image would need remote-pattern config for no benefit here.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={character.referenceImageUrl}
            alt={character.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full place-items-center text-ink-500">
            <UsersIcon className="h-10 w-10" />
          </div>
        )}
        <span className="absolute left-2 top-2 chip bg-black/60">
          {STYLE_PRESETS[character.style]?.label ?? character.style}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="font-medium text-zinc-100">{character.name}</h3>
        <p
          className={`text-xs leading-relaxed text-zinc-400 ${expanded ? "" : "line-clamp-3"}`}
        >
          {character.lockedDescription}
        </p>
        <button
          onClick={() => setExpanded((value) => !value)}
          className="self-start text-[11px] font-medium text-brand-300 hover:text-brand-200"
        >
          {expanded ? "Show less" : "Show locked description"}
        </button>

        <div className="mt-auto flex items-center gap-2 pt-2">
          <button onClick={() => onUse(character.id)} className="btn-primary flex-1 py-2 text-xs">
            Create video
          </button>
          <button
            onClick={() => onDelete(character.id)}
            className="btn-ghost px-2.5 py-2 text-zinc-400 hover:text-rose-300"
            title={`Delete ${character.name}`}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
