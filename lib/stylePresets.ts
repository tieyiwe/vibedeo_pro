import type { CharacterStyle } from "@prisma/client";

/**
 * Style templates appended to every prompt.
 *
 * These are the tuning surface for output look. Seedance takes its style
 * direction from the prompt text itself (there is no separate `style` request
 * field), so this file is where the product's visual identity actually lives.
 *
 * Expect to refine the wording — especially `pixar_3d` — after comparing real
 * Seedance output against the target look. Keep each suffix under ~60 words:
 * very long style blocks start to crowd out the user's own prompt.
 */

export type StyleId = CharacterStyle;

export interface StylePreset {
  id: StyleId;
  label: string;
  description: string;
  /** Appended after the user prompt (and character description). */
  promptSuffix: string;
  /** Short hint shown in the UI. */
  example: string;
}

export const STYLE_PRESETS: Record<StyleId, StylePreset> = {
  realistic: {
    id: "realistic",
    label: "Cinematic realistic",
    description: "Photoreal live-action look with filmic lighting and lens character.",
    promptSuffix:
      "photorealistic live-action cinematography, natural lighting with soft key and gentle falloff, shallow depth of field, 35mm anamorphic lens character, filmic color grade, realistic skin texture and fabric detail, steady cinematic camera movement, 4K detail",
    example: "A barista pulling an espresso shot at sunrise, steam catching the light",
  },
  pixar_3d: {
    id: "pixar_3d",
    label: "Pixar-style 3D",
    description:
      "Stylized 3D animated feature look — rounded expressive characters, soft GI, vivid color.",
    promptSuffix:
      "3D animated Pixar/DreamWorks-style render, rounded expressive character design with large expressive eyes, soft cinematic global illumination, vibrant saturated color palette, subsurface scattering on skin, smooth stylized textures, appealing squash-and-stretch animation, shallow depth of field, animated feature film quality",
    example: "A small round robot discovering a glowing flower in a junkyard",
  },
  anime: {
    id: "anime",
    label: "Anime",
    description: "Hand-drawn Japanese animation with cel shading and dramatic light.",
    promptSuffix:
      "Japanese anime animation, hand-drawn cel-shaded characters with clean line art, expressive large eyes, painterly background art, dramatic rim lighting and lens flares, vivid skies, smooth 24fps limited animation with dynamic camera, studio-quality key frames",
    example: "A student running across a rooftop as cherry blossoms scatter",
  },
  claymation: {
    id: "claymation",
    label: "Claymation",
    description: "Tactile stop-motion plasticine with visible fingerprints and handmade sets.",
    promptSuffix:
      "stop-motion claymation, handcrafted plasticine characters with visible fingerprints and sculpting marks, tangible miniature set with felt and cardboard props, soft practical studio lighting, slight frame-to-frame jitter of stop-motion animation, macro tabletop cinematography, warm handmade color palette",
    example: "A grumpy clay chef flipping a lopsided pancake",
  },
};

export const STYLE_LIST: StylePreset[] = [
  STYLE_PRESETS.pixar_3d,
  STYLE_PRESETS.realistic,
  STYLE_PRESETS.anime,
  STYLE_PRESETS.claymation,
];

export function getStylePreset(style: StyleId): StylePreset {
  return STYLE_PRESETS[style] ?? STYLE_PRESETS.realistic;
}
