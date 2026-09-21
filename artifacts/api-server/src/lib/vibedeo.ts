import { randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  charactersTable,
  db,
  generationsTable,
  vibedeoUsersTable,
  type CharacterRecord,
  type GenerationRecord,
} from "@workspace/db";

export const DEMO_USER_ID = "vibedeo-demo-user";

const STYLE_PRESETS: Record<string, string> = {
  realistic:
    "Natural cinematic realism, authentic textures, motivated lighting, physically plausible movement.",
  pixar_3d:
    "Polished 3D animated feature look, rounded expressive character design, soft global illumination, vibrant color, smooth stylized materials, cinematic depth of field.",
  anime:
    "Premium anime film look, expressive linework, detailed painted environments, dynamic composition, controlled motion, dramatic light.",
  claymation:
    "Handcrafted stop-motion clay aesthetic, tactile fingerprints, miniature sets, warm practical lighting, charming stepped movement.",
};

const SAMPLE_VIDEO =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";

export async function ensureDemoData(): Promise<void> {
  await db
    .insert(vibedeoUsersTable)
    .values({
      id: DEMO_USER_ID,
      name: "Maya Chen",
      email: "maya@vibedeo.demo",
      credits: 48,
      plan: "Creator",
    })
    .onConflictDoNothing();

  await db
    .insert(charactersTable)
    .values([
      {
        id: "character-nova",
        userId: DEMO_USER_ID,
        name: "Nova",
        sourceDescription:
          "A fearless young space cartographer with silver curls and a cobalt flight suit.",
        lockedDescription:
          "Nova is a young space cartographer with warm brown skin, short cloud-like silver curls, large amber eyes, and a cobalt flight suit with a single orange shoulder stripe. Keep her facial proportions, hair silhouette, suit colors, and star-shaped brass compass consistent in every shot.",
        style: "pixar_3d",
        usageCount: 6,
      },
      {
        id: "character-moss",
        userId: DEMO_USER_ID,
        name: "Moss",
        sourceDescription:
          "A gentle forest robot made from weathered copper and living moss.",
        lockedDescription:
          "Moss is a compact, gentle forest robot with a rounded weathered-copper body, glowing mint eyes, small articulated hands, and living moss growing across the left shoulder and crown. Preserve the asymmetrical moss placement, copper patina, proportions, and mint eye color.",
        style: "claymation",
        usageCount: 3,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(generationsTable)
    .values([
      {
        id: "generation-starlight",
        userId: DEMO_USER_ID,
        prompt:
          "Nova opens an ancient observatory and sees a new constellation come alive.",
        enhancedPrompt:
          "A slow dolly follows Nova into an ancient brass observatory as dust motes drift through blue moonlight. She turns her star-shaped compass; the dome opens and a luminous constellation rises into motion above her.",
        finalPrompt:
          "Nova is a young space cartographer with warm brown skin, short cloud-like silver curls, large amber eyes, and a cobalt flight suit with a single orange shoulder stripe. A slow dolly follows Nova into an ancient brass observatory as dust motes drift through blue moonlight. She turns her star-shaped compass; the dome opens and a luminous constellation rises into motion above her. Polished 3D animated feature look, rounded expressive character design, soft global illumination, vibrant color.",
        type: "text_to_video",
        style: "pixar_3d",
        aspectRatio: "9:16",
        durationSeconds: 6,
        resolution: "high",
        creditsUsed: 12,
        status: "completed",
        progress: 100,
        characterId: "character-nova",
        outputUrl: SAMPLE_VIDEO,
        completedAt: new Date(Date.now() - 1000 * 60 * 42),
        createdAt: new Date(Date.now() - 1000 * 60 * 45),
      },
      {
        id: "generation-forest",
        userId: DEMO_USER_ID,
        prompt:
          "Moss follows a trail of glowing mushrooms through a rainy miniature forest.",
        enhancedPrompt: null,
        finalPrompt:
          "Moss is a compact, gentle forest robot with a rounded weathered-copper body, glowing mint eyes, small articulated hands, and living moss growing across the left shoulder and crown. Moss follows a trail of glowing mushrooms through a rainy miniature forest. Handcrafted stop-motion clay aesthetic, tactile fingerprints, miniature sets, warm practical lighting.",
        type: "text_to_video",
        style: "claymation",
        aspectRatio: "16:9",
        durationSeconds: 4,
        resolution: "standard",
        creditsUsed: 4,
        status: "completed",
        progress: 100,
        characterId: "character-moss",
        outputUrl: SAMPLE_VIDEO,
        completedAt: new Date(Date.now() - 1000 * 60 * 130),
        createdAt: new Date(Date.now() - 1000 * 60 * 135),
      },
    ])
    .onConflictDoNothing();
}

export function createLockedDescription(
  name: string,
  source: string,
): string {
  return `${name} must remain visually consistent across every shot. ${source.trim()} Preserve the same facial features, silhouette, proportions, signature colors, clothing, materials, and distinguishing marks.`;
}

export function composePrompt(input: {
  prompt: string;
  enhancedPrompt?: string | null;
  style: string;
  character?: CharacterRecord | null;
}): string {
  return [
    input.character?.lockedDescription,
    input.enhancedPrompt?.trim() || input.prompt.trim(),
    STYLE_PRESETS[input.style] ?? STYLE_PRESETS.realistic,
    "Cohesive motion, intentional camera movement, stable subject identity, no text or watermarks.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function enhancePromptText(
  prompt: string,
  style: string,
  character?: CharacterRecord | null,
): string {
  const subject = character
    ? `Maintain ${character.name}'s locked appearance throughout the shot. `
    : "";
  return `${subject}Begin with a clear establishing frame, then use a controlled cinematic camera move as ${prompt.trim().replace(/\.$/, "")}. Add believable environmental motion, expressive subject movement, layered foreground and background detail, and a decisive final composition. ${STYLE_PRESETS[style] ?? STYLE_PRESETS.realistic}`;
}

export async function getCharacter(
  id?: string | null,
): Promise<CharacterRecord | null> {
  if (!id) return null;
  const [character] = await db
    .select()
    .from(charactersTable)
    .where(
      and(
        eq(charactersTable.id, id),
        eq(charactersTable.userId, DEMO_USER_ID),
      ),
    );
  return character ?? null;
}

export function toGenerationResponse(
  generation: GenerationRecord,
  characterName: string | null,
) {
  const age = Date.now() - generation.createdAt.getTime();
  const isTerminal =
    generation.status === "completed" || generation.status === "failed";
  const completed = !isTerminal && age >= 10_000;
  const progress = completed
    ? 100
    : isTerminal
      ? generation.progress
      : Math.min(94, Math.max(8, Math.round((age / 10_000) * 100)));

  return {
    id: generation.id,
    prompt: generation.prompt,
    enhancedPrompt: generation.enhancedPrompt,
    finalPrompt: generation.finalPrompt,
    type: generation.type,
    style: generation.style,
    aspectRatio: generation.aspectRatio,
    durationSeconds: generation.durationSeconds,
    resolution: generation.resolution,
    creditsUsed: generation.creditsUsed,
    status: completed ? "completed" : generation.status,
    progress,
    characterId: generation.characterId,
    characterName,
    outputUrl: completed ? SAMPLE_VIDEO : generation.outputUrl,
    thumbnailUrl: generation.thumbnailUrl,
    errorMessage: generation.errorMessage,
    createdAt: generation.createdAt.toISOString(),
    completedAt: completed
      ? new Date(generation.createdAt.getTime() + 10_000).toISOString()
      : generation.completedAt?.toISOString() ?? null,
  };
}

export async function listGenerationResponses() {
  const rows = await db
    .select({
      generation: generationsTable,
      characterName: charactersTable.name,
    })
    .from(generationsTable)
    .leftJoin(
      charactersTable,
      eq(generationsTable.characterId, charactersTable.id),
    )
    .where(eq(generationsTable.userId, DEMO_USER_ID))
    .orderBy(desc(generationsTable.createdAt));

  return rows.map(({ generation, characterName }) =>
    toGenerationResponse(generation, characterName),
  );
}

export async function createGenerationRecord(input: {
  prompt: string;
  enhancedPrompt?: string | null;
  type: string;
  style: string;
  aspectRatio: string;
  durationSeconds: number;
  resolution: string;
  characterId?: string | null;
}) {
  const character = await getCharacter(input.characterId);
  const creditsUsed =
    input.durationSeconds * (input.resolution === "high" ? 2 : 1);

  const result = await db.transaction(async (tx) => {
    const [user] = await tx
      .select()
      .from(vibedeoUsersTable)
      .where(eq(vibedeoUsersTable.id, DEMO_USER_ID))
      .for("update");
    if (!user || user.credits < creditsUsed) {
      throw new Error("INSUFFICIENT_CREDITS");
    }

    await tx
      .update(vibedeoUsersTable)
      .set({ credits: sql`${vibedeoUsersTable.credits} - ${creditsUsed}` })
      .where(eq(vibedeoUsersTable.id, DEMO_USER_ID));

    if (character) {
      await tx
        .update(charactersTable)
        .set({ usageCount: sql`${charactersTable.usageCount} + 1` })
        .where(eq(charactersTable.id, character.id));
    }

    const [created] = await tx
      .insert(generationsTable)
      .values({
        id: randomUUID(),
        userId: DEMO_USER_ID,
        prompt: input.prompt,
        enhancedPrompt: input.enhancedPrompt ?? null,
        finalPrompt: composePrompt({
          prompt: input.prompt,
          enhancedPrompt: input.enhancedPrompt,
          style: input.style,
          character,
        }),
        type: input.type,
        style: input.style,
        aspectRatio: input.aspectRatio,
        durationSeconds: input.durationSeconds,
        resolution: input.resolution,
        creditsUsed,
        status: "processing",
        progress: 8,
        characterId: character?.id ?? null,
      })
      .returning();
    return created;
  });

  return toGenerationResponse(result, character?.name ?? null);
}