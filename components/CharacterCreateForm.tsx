"use client";

import { useRef, useState } from "react";
import { STYLE_LIST } from "@/lib/stylePresets";
import type { ClientCharacter, StyleValue } from "@/lib/types";
import { ImageIcon, SparkIcon, SpinnerIcon } from "./Icons";

/**
 * Create a saved character.
 *
 * The reference image and/or the typed sketch go to Claude, which returns the
 * locked description reused verbatim in every future prompt.
 */
export function CharacterCreateForm({
  onCreated,
}: {
  onCreated: (character: ClientCharacter) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [style, setStyle] = useState<StyleValue>("pixar_3d");
  const [imageKey, setImageKey] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", "characters");
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
    if (saving) return;
    if (!description.trim() && !imageKey) {
      setError("Add a description, a reference image, or both");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description.trim() || undefined,
          style,
          referenceImageKey: imageKey,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save the character");

      onCreated(data.character);
      setName("");
      setDescription("");
      setImageKey(null);
      setImagePreview(null);
      if (fileInput.current) fileInput.current.value = "";
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the character");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-3 p-4">
      <div>
        <label className="label" htmlFor="character-name">
          Name
        </label>
        <input
          id="character-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          maxLength={60}
          placeholder="Max the Fox"
          className="field"
        />
      </div>

      <div>
        <label className="label" htmlFor="character-description">
          Describe them
        </label>
        <textarea
          id="character-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="A young red fox with oversized ears, wearing a patched denim jacket and yellow scarf…"
          className="field resize-none"
        />
        <p className="mt-1.5 text-[11px] text-zinc-500">
          Claude turns this into a locked visual description — face, build, colours, outfit — that
          gets copied into every prompt this character appears in.
        </p>
      </div>

      <div>
        <span className="label">Reference image (optional, but stronger)</span>
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
            disabled={uploading}
            className="btn-ghost flex-1 text-xs"
          >
            {uploading ? <SpinnerIcon className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
            {imageKey ? "Replace reference" : "Upload reference"}
          </button>
          {imagePreview && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={imagePreview}
              alt="Reference"
              className="h-12 w-12 rounded-lg border border-ink-600 object-cover"
            />
          )}
        </div>
      </div>

      <div>
        <span className="label">Default style</span>
        <div className="flex flex-wrap gap-1.5">
          {STYLE_LIST.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setStyle(preset.id as StyleValue)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs transition ${
                style === preset.id
                  ? "border-brand-500 bg-brand-500/15 text-brand-200"
                  : "border-ink-600 bg-ink-800/60 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      )}

      <button type="submit" disabled={saving || !name.trim()} className="btn-primary w-full">
        {saving ? <SpinnerIcon className="h-4 w-4" /> : <SparkIcon className="h-4 w-4" />}
        {saving ? "Locking in appearance…" : "Save character"}
      </button>
    </form>
  );
}
