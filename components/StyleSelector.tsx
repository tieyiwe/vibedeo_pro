"use client";

import { STYLE_LIST } from "@/lib/stylePresets";
import type { StyleValue } from "@/lib/types";

/** Visual style tiles — the Pixar-style option is first class, not an afterthought. */

const SWATCHES: Record<StyleValue, string> = {
  pixar_3d: "from-amber-400 via-orange-400 to-rose-400",
  realistic: "from-sky-300 via-slate-400 to-zinc-600",
  anime: "from-pink-400 via-fuchsia-400 to-indigo-400",
  claymation: "from-lime-300 via-emerald-400 to-teal-500",
};

export function StyleSelector({
  value,
  onChange,
}: {
  value: StyleValue;
  onChange: (style: StyleValue) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {STYLE_LIST.map((preset) => {
        const active = preset.id === value;
        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => onChange(preset.id as StyleValue)}
            title={preset.description}
            className={`group overflow-hidden rounded-xl border text-left transition ${
              active
                ? "border-brand-500 ring-2 ring-brand-500/30"
                : "border-ink-600 hover:border-ink-500"
            }`}
          >
            <div
              className={`h-12 w-full bg-gradient-to-br ${SWATCHES[preset.id as StyleValue]} opacity-80 transition group-hover:opacity-100`}
            />
            <div className="bg-ink-800/80 px-2.5 py-2">
              <p className={`text-xs font-medium ${active ? "text-brand-200" : "text-zinc-200"}`}>
                {preset.label}
              </p>
              <p className="mt-0.5 line-clamp-1 text-[11px] text-zinc-500">{preset.example}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
