"use client";

import { useState } from "react";
import { STYLE_PRESETS } from "@/lib/stylePresets";
import type { ClientGeneration } from "@/lib/types";
import { DownloadIcon, LinkIcon, SpinnerIcon } from "./Icons";

const ASPECT_CLASS: Record<string, string> = {
  "16:9": "aspect-video",
  "9:16": "aspect-[9/16]",
  "1:1": "aspect-square",
};

export function VideoCard({ generation }: { generation: ClientGeneration }) {
  const [copied, setCopied] = useState(false);
  const aspect = ASPECT_CLASS[generation.aspectRatio] ?? "aspect-video";
  const style = STYLE_PRESETS[generation.style];

  async function copyLink() {
    if (!generation.videoUrl) return;
    const absolute = generation.videoUrl.startsWith("http")
      ? generation.videoUrl
      : `${window.location.origin}${generation.videoUrl}`;
    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this link", absolute);
    }
  }

  return (
    <article className="card group overflow-hidden">
      <div className={`relative ${aspect} bg-ink-900`}>
        {generation.status === "completed" && generation.videoUrl ? (
          <video
            src={generation.videoUrl}
            poster={generation.thumbnailUrl ?? undefined}
            controls
            loop
            playsInline
            preload="metadata"
            className="h-full w-full object-cover"
          />
        ) : generation.status === "failed" ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <span className="text-sm font-medium text-rose-300">Generation failed</span>
            <span className="line-clamp-3 text-xs text-zinc-500">
              {generation.errorMessage ?? "Something went wrong."}
            </span>
            <span className="chip mt-1 border-emerald-500/30 text-emerald-300">
              {generation.creditsUsed} credits refunded
            </span>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <SpinnerIcon className="h-6 w-6 text-brand-300" />
            <span className="text-xs uppercase tracking-wide text-zinc-500">
              {generation.status === "queued" ? "Queued" : "Rendering"}
            </span>
            <div className="h-1 w-24 overflow-hidden rounded-full bg-ink-700">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-gradient-to-r from-brand-500 to-accent-500" />
            </div>
          </div>
        )}

        {generation.status === "completed" && generation.videoUrl && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
            <a
              href={generation.videoUrl}
              download={`vibedeo-${generation.id.slice(0, 8)}.mp4`}
              className="pointer-events-auto rounded-lg bg-black/60 p-2 text-white backdrop-blur transition hover:bg-black/80"
              title="Download MP4"
            >
              <DownloadIcon className="h-4 w-4" />
            </a>
            <button
              onClick={copyLink}
              className="pointer-events-auto rounded-lg bg-black/60 p-2 text-white backdrop-blur transition hover:bg-black/80"
              title="Copy shareable link"
            >
              <LinkIcon className="h-4 w-4" />
            </button>
          </div>
        )}

        {copied && (
          <span className="absolute right-2 top-2 rounded-lg bg-emerald-500/90 px-2 py-1 text-[11px] font-medium text-white">
            Link copied
          </span>
        )}
      </div>

      <div className="space-y-2 p-3">
        <p className="line-clamp-2 text-sm text-zinc-200">{generation.prompt}</p>
        <div className="flex flex-wrap gap-1.5">
          <span className="chip">{style?.label ?? generation.style}</span>
          {generation.character && (
            <span className="chip border-brand-500/40 text-brand-200">
              {generation.character.name}
            </span>
          )}
          <span className="chip">{generation.durationSeconds}s</span>
          <span className="chip">{generation.resolution}</span>
          <span className="chip">{generation.aspectRatio}</span>
          {generation.type === "image_to_video" && <span className="chip">from image</span>}
        </div>
      </div>
    </article>
  );
}
