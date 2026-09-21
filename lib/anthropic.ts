import Anthropic from "@anthropic-ai/sdk";
import { optionalEnv } from "./env";
import { getStylePreset, type StyleId } from "./stylePresets";

/**
 * Claude-powered prompt work.
 *
 *  - `enhancePrompt`      rewrites a rough idea into a cinematic video prompt.
 *  - `buildLockedDescription` turns a character sketch (text and/or a reference
 *    image) into the stable visual description reused across every generation.
 *
 * Without ANTHROPIC_API_KEY both fall back to a deterministic local rewrite so
 * the app stays usable; callers see `enhanced: false` in that case.
 */

const MODEL = optionalEnv("ANTHROPIC_MODEL") ?? "claude-opus-5";

let client: Anthropic | null = null;

export function isAnthropicConfigured(): boolean {
  return Boolean(optionalEnv("ANTHROPIC_API_KEY"));
}

function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: optionalEnv("ANTHROPIC_API_KEY") });
  return client;
}

function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

const ENHANCER_SYSTEM = `You rewrite short user ideas into prompts for a text-to-video model (Seedance).

Rules:
- Return ONLY the rewritten prompt. No preamble, no quotes, no markdown, no options.
- One paragraph, 40-90 words.
- Describe, in this order: subject and action, setting and time of day, lighting, camera shot and movement, mood.
- Keep every concrete detail the user gave (names, colours, objects, actions). Never contradict them.
- If a character description is supplied, keep that character's appearance EXACTLY as written — do not restate it in your own words and do not add or change physical traits. Refer to the character by name.
- Do not invent dialogue, on-screen text, captions or watermarks.
- Do not add style keywords; the app appends its own style block afterwards.`;

export interface EnhanceInput {
  prompt: string;
  style: StyleId;
  characterName?: string;
  characterDescription?: string;
}

export async function enhancePrompt(
  input: EnhanceInput,
): Promise<{ prompt: string; enhanced: boolean }> {
  if (!isAnthropicConfigured()) {
    return { prompt: localEnhance(input), enhanced: false };
  }

  const preset = getStylePreset(input.style);
  const parts = [
    `Target visual style (already handled by the app, for context only): ${preset.label} — ${preset.description}`,
    input.characterDescription
      ? `Character that must appear, described in locked form:\n${input.characterName ? `${input.characterName}: ` : ""}${input.characterDescription}`
      : null,
    `User idea:\n${input.prompt}`,
  ].filter(Boolean);

  try {
    const message = await getClient().messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: ENHANCER_SYSTEM,
      messages: [{ role: "user", content: parts.join("\n\n") }],
    });
    const text = textOf(message);
    return text
      ? { prompt: text, enhanced: true }
      : { prompt: localEnhance(input), enhanced: false };
  } catch (error) {
    console.error("[anthropic] prompt enhancement failed:", error);
    return { prompt: localEnhance(input), enhanced: false };
  }
}

const CHARACTER_SYSTEM = `You write "locked" character descriptions for AI video generation.

A locked description is copied verbatim into every future prompt featuring this character, so it must be stable, concrete and self-contained.

Rules:
- Return ONLY the description. No preamble, no headings, no bullet points, no quotes.
- One paragraph, 60-110 words, written as a noun phrase (not a sentence about the character "being" somewhere).
- Cover, in this order: species/age/build, face (shape, eyes, eyebrows, nose, mouth), hair or fur (colour, length, texture), skin/coat tone, complete outfit with colours and materials, footwear/accessories, and one or two distinguishing marks.
- Use specific, repeatable colour words ("burnt orange", "slate grey"), never vague ones ("nice", "cool").
- Describe appearance only: no pose, no action, no setting, no lighting, no camera, no emotion.
- If a reference image is provided, describe what is actually in it and let it override any conflicting text.
- Start with the character's name followed by a comma.`;

export interface CharacterDescriptionInput {
  name: string;
  description?: string;
  style: StyleId;
  image?: { data: string; mediaType: string };
}

export async function buildLockedDescription(
  input: CharacterDescriptionInput,
): Promise<{ lockedDescription: string; enhanced: boolean }> {
  if (!isAnthropicConfigured()) {
    return { lockedDescription: localCharacterDescription(input), enhanced: false };
  }

  const preset = getStylePreset(input.style);
  const content: Anthropic.ContentBlockParam[] = [];

  if (input.image && isSupportedImageType(input.image.mediaType)) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: input.image.mediaType as "image/png" | "image/jpeg" | "image/webp" | "image/gif",
        data: input.image.data,
      },
    });
  }
  content.push({
    type: "text",
    text: [
      `Character name: ${input.name}`,
      `Intended render style: ${preset.label} — ${preset.description}`,
      input.description ? `User's description:\n${input.description}` : null,
      input.image ? "A reference image is attached; it takes precedence." : null,
    ]
      .filter(Boolean)
      .join("\n\n"),
  });

  try {
    const message = await getClient().messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: CHARACTER_SYSTEM,
      messages: [{ role: "user", content }],
    });
    const text = textOf(message);
    return text
      ? { lockedDescription: text, enhanced: true }
      : { lockedDescription: localCharacterDescription(input), enhanced: false };
  } catch (error) {
    console.error("[anthropic] character description failed:", error);
    return { lockedDescription: localCharacterDescription(input), enhanced: false };
  }
}

function isSupportedImageType(mediaType: string): boolean {
  return ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(mediaType);
}

// --- Offline fallbacks -------------------------------------------------------

function localEnhance(input: EnhanceInput): string {
  const base = input.prompt.trim().replace(/\s+/g, " ").replace(/[.\s]+$/, "");
  const character = input.characterDescription
    ? `${input.characterDescription.trim().replace(/[.\s]+$/, "")}. `
    : "";
  return `${character}${base}. Cinematic framing with a slow deliberate camera move, clear focal subject, balanced composition and expressive lighting that matches the mood.`;
}

function localCharacterDescription(input: CharacterDescriptionInput): string {
  const detail = input.description?.trim().replace(/[.\s]+$/, "");
  return detail
    ? `${input.name}, ${detail}. Keep this appearance identical in every shot: same face, same proportions, same colours, same outfit.`
    : `${input.name}, a distinctive lead character whose face, proportions, colours and outfit stay identical in every shot.`;
}
