"use client";

import { SparkIcon } from "./Icons";

/** Toggle for the Claude-powered prompt rewrite. */
export function PromptEnhancerToggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      aria-pressed={enabled}
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition ${
        enabled
          ? "border-brand-500/60 bg-brand-500/15 text-brand-200"
          : "border-ink-600 bg-ink-800/70 text-zinc-400 hover:text-zinc-200"
      }`}
      title="Rewrite your prompt with Claude before generating"
    >
      <SparkIcon className="h-4 w-4" />
      Enhance prompt
      <span
        className={`ml-1 h-4 w-7 rounded-full p-0.5 transition ${enabled ? "bg-brand-500" : "bg-ink-600"}`}
      >
        <span
          className={`block h-3 w-3 rounded-full bg-white transition ${enabled ? "translate-x-3" : ""}`}
        />
      </span>
    </button>
  );
}
