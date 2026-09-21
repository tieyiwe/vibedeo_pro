/**
 * Pure pricing/option tables — no database imports, so client components can
 * use them directly. lib/credits.ts holds the server-side ledger logic.
 */

/** Baseline: 1 credit per second at standard resolution; higher res multiplies. */
export const RESOLUTION_MULTIPLIERS: Record<string, number> = {
  "480p": 1,
  "720p": 1,
  "1080p": 2,
  "4k": 4,
};

export const RESOLUTION_OPTIONS = [
  { value: "480p", label: "480p", hint: "draft" },
  { value: "720p", label: "720p", hint: "standard" },
  { value: "1080p", label: "1080p", hint: "high" },
] as const;

export const DURATION_OPTIONS = [3, 5, 8, 10] as const;

export const ASPECT_RATIOS = [
  { value: "16:9", label: "16:9", hint: "YouTube" },
  { value: "9:16", label: "9:16", hint: "TikTok / Reels" },
  { value: "1:1", label: "1:1", hint: "Feed" },
] as const;

export function calculateCost(durationSeconds: number, resolution: string): number {
  const multiplier = RESOLUTION_MULTIPLIERS[resolution] ?? 1;
  return Math.max(1, Math.ceil(durationSeconds * multiplier));
}
