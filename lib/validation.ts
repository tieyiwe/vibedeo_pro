import { z } from "zod";
import { ASPECT_RATIOS, DURATION_OPTIONS, RESOLUTION_OPTIONS } from "./pricing";

const styleEnum = z.enum(["realistic", "pixar_3d", "anime", "claymation"]);

export const aspectRatioSchema = z.enum(
  ASPECT_RATIOS.map((option) => option.value) as [string, ...string[]],
);
export const resolutionSchema = z.enum(
  RESOLUTION_OPTIONS.map((option) => option.value) as [string, ...string[]],
);
export const durationSchema = z
  .number()
  .int()
  .refine((value) => (DURATION_OPTIONS as readonly number[]).includes(value), {
    message: `Duration must be one of: ${DURATION_OPTIONS.join(", ")}`,
  });

export const generateSchema = z.object({
  prompt: z.string().trim().min(3, "Describe your video in a few more words").max(2000),
  enhancedPrompt: z.string().trim().max(4000).optional(),
  style: styleEnum.default("pixar_3d"),
  aspectRatio: aspectRatioSchema.default("16:9"),
  durationSeconds: durationSchema.default(5),
  resolution: resolutionSchema.default("720p"),
  characterId: z.string().uuid().optional().nullable(),
  /** Storage key of an uploaded first frame, for image-to-video. */
  imageKey: z.string().max(400).optional().nullable(),
});

export const enhanceSchema = z.object({
  prompt: z.string().trim().min(3).max(2000),
  style: styleEnum.default("pixar_3d"),
  characterId: z.string().uuid().optional().nullable(),
});

export const characterCreateSchema = z.object({
  name: z.string().trim().min(1, "Give your character a name").max(60),
  description: z.string().trim().max(2000).optional(),
  style: styleEnum.default("pixar_3d"),
  referenceImageKey: z.string().max(400).optional().nullable(),
  /** Skip the Claude rewrite and store the description as-is. */
  useRawDescription: z.boolean().optional(),
});

export const characterUpdateSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  lockedDescription: z.string().trim().min(10).max(4000).optional(),
  style: styleEnum.optional(),
  referenceImageKey: z.string().max(400).optional().nullable(),
});

export const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  name: z.string().trim().max(80).optional(),
});

export const checkoutSchema = z.object({ packId: z.string().min(1) });

export type GenerateInput = z.infer<typeof generateSchema>;
export type CharacterCreateInput = z.infer<typeof characterCreateSchema>;
