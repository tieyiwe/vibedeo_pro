"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ASPECT_RATIOS, DURATION_OPTIONS, RESOLUTION_OPTIONS, calculateCost } from "@/lib/pricing";
import type { ClientCharacter, ClientGeneration, StyleValue } from "@/lib/types";
import { useCredits } from "./CreditsContext";
import { StyleSelector } from "./StyleSelector";
import { PromptEnhancerToggle } from "./PromptEnhancerToggle";
import { ImageIcon, SparkIcon, SpinnerIcon } from "./Icons";

export function GenerationForm({
  characters,
  initialCharacterId,
  onQueued,
}: {
  characters: ClientCharacter[];
  initialCharacterId?: string | null;
  onQueued: (generation: ClientGeneration) => void;
}) {
  const { credits, set: setCredits } = useCredits();

  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<StyleValue>("pixar_3d");
  const [aspectRatio, setAspectRatio] = useState<string>("16:9");
  const [duration, setDuration] = useState<number>(5);
  const [resolution, setResolution] = useState<string>("720p");
  const [characterId, setCharacterId] = useState<string>(initialCharacterId ?? "");
  const [enhanceEnabled, setEnhanceEnabled] = useState(true);

  const [enhancedPrompt, setEnhancedPrompt] = useState<string | null>(null);
  const [enhancing, setEnhancing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [imageKey, setImageKey] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const cost = useMemo(() => calculateCost(duration, resolution), [duration, resolution]);
  const insufficient = credits !== null && credits < cost;
  const selectedCharacter = characters.find((character) => character.id === characterId);

  // Picking a character adopts its style — that's the look it was described for.
  useEffect(() => {
    if (selectedCharacter) setStyle(selectedCharacter.style);
  }, [selectedCharacter]);

  // The enhanced prompt is only valid for the inputs it was generated from.
  useEffect(() => {
    setEnhancedPrompt(null);
  }, [prompt, style, characterId]);

  async function handleEnhance() {
    if (prompt.trim().length < 3) {
      setError("Write a little more first");
      return;
    }
    setEnhancing(true);
    setError(null);
    try {
      const response = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, style, characterId: characterId || null }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not enhance the prompt");
      setEnhancedPrompt(data.prompt);
      setNotice(
        data.configured
          ? null
          : "ANTHROPIC_API_KEY isn't set — used the built-in fallback rewrite.",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not enhance the prompt");
    } finally {
      setEnhancing(false);
    }
  }

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", "uploads");
      const response = await fetch("/api/upload", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Upload failed");
      setImageKey(data.key);
      setImagePreview(data.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    // With the toggle on, enhance first so the user sees the rewrite before it runs.
    if (enhanceEnabled && !enhancedPrompt) {
      await handleEnhance();
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          enhancedPrompt: enhanceEnabled ? enhancedPrompt : undefined,
          style,
          aspectRatio,
          durationSeconds: duration,
          resolution,
          characterId: characterId || null,
          imageKey,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.code === "insufficient_credits"
            ? `Not enough credits — this clip needs ${data.required}, you have ${data.available}.`
            : (data.error ?? "Generation failed to start"),
        );
      }
      if (typeof data.credits === "number") setCredits(data.credits);
      onQueued(data.generation);
      setEnhancedPrompt(null);
      setImageKey(null);
      setImagePreview(null);
      if (fileInput.current) fileInput.current.value = "";
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Generation failed to start");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4 p-4">
      <div className="relative">
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="A small round robot discovering a glowing flower in a junkyard at dusk…"
          className="field resize-none text-base leading-relaxed"
        />
        <span className="absolute bottom-2 right-3 text-[11px] text-zinc-600">
          {prompt.length}/2000
        </span>
      </div>

      {enhancedPrompt && (
        <div className="rounded-xl border border-brand-500/40 bg-brand-500/10 p-3">
          <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-brand-200">
            <SparkIcon className="h-4 w-4" />
            Enhanced prompt — review before generating
          </div>
          <textarea
            value={enhancedPrompt}
            onChange={(event) => setEnhancedPrompt(event.target.value)}
            rows={4}
            className="field resize-none bg-ink-900/60 text-sm"
          />
          <button
            type="button"
            onClick={() => setEnhancedPrompt(null)}
            className="mt-1.5 text-[11px] text-zinc-400 hover:text-zinc-200"
          >
            Discard and use my original prompt
          </button>
        </div>
      )}

      <div>
        <span className="label">Style</span>
        <StyleSelector value={style} onChange={setStyle} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="character">
            Character
          </label>
          <select
            id="character"
            value={characterId}
            onChange={(event) => setCharacterId(event.target.value)}
            className="field"
          >
            <option value="">No saved character</option>
            {characters.map((character) => (
              <option key={character.id} value={character.id}>
                {character.name}
              </option>
            ))}
          </select>
          {selectedCharacter ? (
            <p className="mt-1.5 line-clamp-2 text-[11px] text-zinc-500">
              Locked: {selectedCharacter.lockedDescription}
            </p>
          ) : (
            <p className="mt-1.5 text-[11px] text-zinc-500">
              <Link href="/characters" className="text-brand-300 hover:text-brand-200">
                Save a character
              </Link>{" "}
              to keep the same face across clips.
            </p>
          )}
        </div>

        <div>
          <span className="label">First frame (optional)</span>
          <div className="flex items-center gap-2">
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleUpload(file);
              }}
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="btn-ghost flex-1 text-xs"
              disabled={uploading}
            >
              {uploading ? <SpinnerIcon className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
              {imageKey ? "Replace image" : "Image to video"}
            </button>
            {imagePreview && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="First frame"
                  className="h-10 w-10 rounded-lg border border-ink-600 object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImageKey(null);
                    setImagePreview(null);
                    if (fileInput.current) fileInput.current.value = "";
                  }}
                  className="btn-subtle px-2 py-1 text-xs"
                >
                  Clear
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <OptionRow label="Aspect ratio">
          {ASPECT_RATIOS.map((option) => (
            <Pill
              key={option.value}
              active={aspectRatio === option.value}
              onClick={() => setAspectRatio(option.value)}
              label={option.label}
              hint={option.hint}
            />
          ))}
        </OptionRow>

        <OptionRow label="Duration">
          {DURATION_OPTIONS.map((seconds) => (
            <Pill
              key={seconds}
              active={duration === seconds}
              onClick={() => setDuration(seconds)}
              label={`${seconds}s`}
            />
          ))}
        </OptionRow>

        <OptionRow label="Resolution">
          {RESOLUTION_OPTIONS.map((option) => (
            <Pill
              key={option.value}
              active={resolution === option.value}
              onClick={() => setResolution(option.value)}
              label={option.label}
              hint={option.hint}
            />
          ))}
        </OptionRow>
      </div>

      {error && (
        <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      )}
      {notice && !error && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {notice}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-700 pt-3">
        <div className="flex items-center gap-2">
          <PromptEnhancerToggle enabled={enhanceEnabled} onChange={setEnhanceEnabled} />
          {enhanceEnabled && (
            <button
              type="button"
              onClick={handleEnhance}
              disabled={enhancing || prompt.trim().length < 3}
              className="btn-subtle text-xs"
            >
              {enhancing ? <SpinnerIcon className="h-4 w-4" /> : null}
              {enhancedPrompt ? "Re-enhance" : "Preview enhancement"}
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500">
            Costs <strong className="text-zinc-200">{cost}</strong> credits
          </span>
          {insufficient ? (
            <Link href="/pricing" className="btn-primary">
              Buy credits
            </Link>
          ) : (
            <button
              type="submit"
              disabled={submitting || enhancing || prompt.trim().length < 3}
              className="btn-primary min-w-36"
            >
              {submitting ? <SpinnerIcon className="h-4 w-4" /> : <SparkIcon className="h-4 w-4" />}
              {submitting
                ? "Starting…"
                : enhanceEnabled && !enhancedPrompt
                  ? "Enhance & review"
                  : "Generate video"}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

function OptionRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Pill({
  active,
  onClick,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={hint}
      className={`rounded-lg border px-2.5 py-1.5 text-xs transition ${
        active
          ? "border-brand-500 bg-brand-500/15 text-brand-200"
          : "border-ink-600 bg-ink-800/60 text-zinc-400 hover:text-zinc-200"
      }`}
    >
      {label}
    </button>
  );
}
