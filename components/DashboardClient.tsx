"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { STYLE_LIST } from "@/lib/stylePresets";
import type { ClientGeneration } from "@/lib/types";
import { VideoCard } from "./VideoCard";
import { useGenerationPolling } from "./useGenerationPolling";

type Filter = "all" | "completed" | "processing" | "failed";

export function DashboardClient({ generations: initial }: { generations: ClientGeneration[] }) {
  const { generations } = useGenerationPolling(initial);
  const [filter, setFilter] = useState<Filter>("all");
  const [style, setStyle] = useState<string>("all");

  const visible = useMemo(
    () =>
      generations.filter((generation) => {
        const statusOk =
          filter === "all"
            ? true
            : filter === "processing"
              ? generation.status === "queued" || generation.status === "processing"
              : generation.status === filter;
        const styleOk = style === "all" || generation.style === style;
        return statusOk && styleOk;
      }),
    [generations, filter, style],
  );

  if (generations.length === 0) {
    return (
      <div className="card grid place-items-center gap-3 p-16 text-center">
        <p className="text-lg font-medium text-zinc-200">Nothing here yet</p>
        <p className="max-w-sm text-sm text-zinc-500">
          Generate your first clip — 20 free credits are already in your account.
        </p>
        <Link href="/generate" className="btn-primary mt-2">
          Create a video
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "completed", "processing", "failed"] as Filter[]).map((value) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`rounded-lg border px-3 py-1.5 text-xs capitalize transition ${
              filter === value
                ? "border-brand-500 bg-brand-500/15 text-brand-200"
                : "border-ink-600 bg-ink-800/60 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {value}
          </button>
        ))}

        <select
          value={style}
          onChange={(event) => setStyle(event.target.value)}
          className="field ml-auto w-auto py-1.5 text-xs"
        >
          <option value="all">All styles</option>
          {STYLE_LIST.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
        </select>
      </div>

      {visible.length === 0 ? (
        <p className="py-16 text-center text-sm text-zinc-500">
          No clips match that filter.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {visible.map((generation) => (
            <VideoCard key={generation.id} generation={generation} />
          ))}
        </div>
      )}
    </div>
  );
}
