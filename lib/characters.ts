import type { Character } from "@prisma/client";
import { prisma } from "./prisma";
import { getStylePreset, type StyleId } from "./stylePresets";

/**
 * Character consistency.
 *
 * The reliable baseline is prompt engineering: a locked description written
 * once (with Claude) and prepended verbatim to every generation featuring that
 * character. Seed locking and reference-image conditioning are layered on top
 * when the Seedance account supports them — see lib/seedance.ts.
 */

/** Saved characters for a user — always scoped by userId (no DB-level RLS). */
export function listCharacters(userId: string): Promise<Character[]> {
  return prisma.character.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

/** A single character, or null if it doesn't exist or isn't the caller's. */
export function getCharacter(userId: string, characterId: string): Promise<Character | null> {
  return prisma.character.findFirst({ where: { id: characterId, userId } });
}

export interface ComposePromptInput {
  userPrompt: string;
  style: StyleId;
  character?: Pick<Character, "name" | "lockedDescription"> | null;
}

/**
 * Compose the final Seedance prompt:
 *   [character locked description] + [user prompt] + [style block]
 *
 * Order matters — the subject leads, the style block trails, so style words
 * never get read as part of the character's identity.
 */
export function composePrompt({ userPrompt, style, character }: ComposePromptInput): string {
  const segments: string[] = [];

  if (character) {
    segments.push(
      `Character (keep this appearance exactly consistent): ${character.lockedDescription.trim().replace(/[.\s]+$/, "")}.`,
    );
  }
  segments.push(userPrompt.trim().replace(/[.\s]+$/, "") + ".");
  segments.push(getStylePreset(style).promptSuffix + ".");

  return segments.join(" ").replace(/\s+/g, " ").trim();
}

/**
 * A stable seed for a character, so repeat generations land in the same visual
 * neighbourhood even when the API offers no explicit identity conditioning.
 */
export function deriveSeed(characterId: string): number {
  let hash = 2166136261;
  for (let i = 0; i < characterId.length; i++) {
    hash ^= characterId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  // Seedance accepts a 32-bit unsigned seed.
  return Math.abs(hash) % 2_147_483_647;
}
