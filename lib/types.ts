/** Shapes shared between API routes and client components. */

export type GenerationStatusValue = "queued" | "processing" | "completed" | "failed";
export type StyleValue = "realistic" | "pixar_3d" | "anime" | "claymation";

export interface ClientGeneration {
  id: string;
  prompt: string;
  enhancedPrompt: string | null;
  finalPrompt: string | null;
  type: "text_to_video" | "image_to_video";
  style: StyleValue;
  aspectRatio: string;
  durationSeconds: number;
  resolution: string;
  status: GenerationStatusValue;
  creditsUsed: number;
  characterId: string | null;
  errorMessage: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
  completedAt: string | null;
  mock: boolean;
  character?: { id: string; name: string } | null;
}

export interface ClientCharacter {
  id: string;
  name: string;
  lockedDescription: string;
  style: StyleValue;
  referenceImageUrl: string | null;
  seed: number | null;
  createdAt: string;
}
