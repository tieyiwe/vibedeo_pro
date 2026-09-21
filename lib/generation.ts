import type { Generation } from "@prisma/client";
import { prisma } from "./prisma";
import { composePrompt, deriveSeed, getCharacter } from "./characters";
import { calculateCost } from "./pricing";
import { deductCredits, refundCredits } from "./credits";
import {
  createImageToVideoJob,
  createTextToVideoJob,
  getJobStatus,
  isMockMode,
} from "./seedance";
import { buildKey, ingestRemoteFile, publicUrl } from "./storage";
import type { GenerateInput } from "./validation";
import { appUrl } from "./env";

/**
 * The generation pipeline: credits -> Seedance job -> polling -> stored asset.
 *
 * Seedance renders asynchronously, so a generation row is the job queue: rows
 * sit in `queued`/`processing` until `syncGeneration` (called by the frontend
 * poller, the worker sweep, or the Seedance webhook) moves them on.
 */

/** A job that never got a Seedance id is dead — nothing will ever advance it. */
const ORPHAN_TIMEOUT_MS = 5 * 60 * 1000;
/** Upper bound on a render before we give the credits back. */
const RENDER_TIMEOUT_MS = 30 * 60 * 1000;

export async function startGeneration(
  userId: string,
  input: GenerateInput,
): Promise<Generation> {
  const character = input.characterId ? await getCharacter(userId, input.characterId) : null;
  if (input.characterId && !character) {
    throw new Error("Character not found");
  }

  // The form pre-selects a character's own style when one is picked, so by the
  // time the request lands the style is whatever the user confirmed.
  const style = input.style;
  const basePrompt = input.enhancedPrompt?.trim() || input.prompt.trim();
  const finalPrompt = composePrompt({ userPrompt: basePrompt, style, character });
  const seed = character ? (character.seed ?? deriveSeed(character.id)) : undefined;
  const creditsUsed = calculateCost(input.durationSeconds, input.resolution);

  // Deduct first: a failed job refunds, an ungated job would be free to abuse.
  await deductCredits(userId, creditsUsed, `Generation · ${input.durationSeconds}s ${input.resolution}`);

  const generation = await prisma.generation.create({
    data: {
      userId,
      prompt: input.prompt.trim(),
      enhancedPrompt: input.enhancedPrompt?.trim() || null,
      finalPrompt,
      type: input.imageKey ? "image_to_video" : "text_to_video",
      style,
      aspectRatio: input.aspectRatio,
      durationSeconds: input.durationSeconds,
      resolution: input.resolution,
      status: "queued",
      inputImageUrl: input.imageKey ?? null,
      creditsUsed,
      characterId: character?.id ?? null,
      seed: seed ?? null,
    },
  });

  try {
    const job = input.imageKey
      ? await createImageToVideoJob({
          prompt: finalPrompt,
          aspectRatio: input.aspectRatio,
          durationSeconds: input.durationSeconds,
          resolution: input.resolution,
          seed,
          // Seedance fetches the first frame over HTTP, so hand it an absolute
          // URL into our own file route.
          imageUrl: `${appUrl()}${publicUrl(input.imageKey)}`,
        })
      : await createTextToVideoJob({
          prompt: finalPrompt,
          aspectRatio: input.aspectRatio,
          durationSeconds: input.durationSeconds,
          resolution: input.resolution,
          seed,
        });

    return await prisma.generation.update({
      where: { id: generation.id },
      data: { seedanceJobId: job.id, status: job.status === "failed" ? "failed" : "processing" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start generation";
    await failGeneration(generation.id, message);
    return (await prisma.generation.findUnique({ where: { id: generation.id } }))!;
  }
}

/** Mark a generation failed and refund its credits exactly once. */
export async function failGeneration(
  generationId: string,
  errorMessage: string,
): Promise<void> {
  const generation = await prisma.generation.findUnique({ where: { id: generationId } });
  if (!generation || generation.status === "failed") return;

  await prisma.$transaction(async (tx) => {
    await tx.generation.update({
      where: { id: generationId },
      data: {
        status: "failed",
        errorMessage: errorMessage.slice(0, 500),
        completedAt: new Date(),
        refunded: !generation.refunded && generation.creditsUsed > 0,
      },
    });
    if (!generation.refunded && generation.creditsUsed > 0) {
      await refundCredits(
        generation.userId,
        generation.creditsUsed,
        `Refund · failed generation ${generationId.slice(0, 8)}`,
        tx,
      );
    }
  });
}

/**
 * Poll Seedance for one generation and persist any change. Safe to call
 * concurrently and repeatedly; terminal rows short-circuit.
 */
export async function syncGeneration(generationId: string): Promise<Generation | null> {
  const generation = await prisma.generation.findUnique({ where: { id: generationId } });
  if (!generation) return null;
  if (generation.status === "completed" || generation.status === "failed") return generation;

  const age = Date.now() - generation.createdAt.getTime();

  if (!generation.seedanceJobId) {
    // The job was never handed to Seedance (a crash between the credit
    // deduction and the API call). Don't let it poll forever — fail it and
    // give the credits back.
    if (age > ORPHAN_TIMEOUT_MS) {
      await failGeneration(generationId, "Generation never started");
      return prisma.generation.findUnique({ where: { id: generationId } });
    }
    return generation;
  }

  if (age > RENDER_TIMEOUT_MS) {
    await failGeneration(generationId, "Generation timed out");
    return prisma.generation.findUnique({ where: { id: generationId } });
  }

  let job;
  try {
    job = await getJobStatus(generation.seedanceJobId);
  } catch (error) {
    console.error(`[generation] status check failed for ${generationId}:`, error);
    return generation;
  }

  if (job.status === "failed") {
    await failGeneration(generationId, job.error ?? "Seedance reported a failed render");
    return prisma.generation.findUnique({ where: { id: generationId } });
  }

  if (job.status !== "completed" || !job.videoUrl) {
    if (generation.status !== "processing" && job.status === "processing") {
      return prisma.generation.update({
        where: { id: generationId },
        data: { status: "processing" },
      });
    }
    return generation;
  }

  // Finished: pull the render into our own bucket so the link keeps working
  // after Seedance's temporary URL expires.
  let outputUrl = job.videoUrl;
  try {
    const key = buildKey("videos", generation.userId, `${generation.id}.mp4`);
    await ingestRemoteFile(job.videoUrl, key);
    outputUrl = key;
  } catch (error) {
    // Falling back to the provider URL keeps the clip watchable now; the row
    // still records that the copy failed.
    console.error(`[generation] could not archive video for ${generationId}:`, error);
  }

  let thumbnailUrl: string | null = null;
  if (job.thumbnailUrl) {
    try {
      const key = buildKey("thumbnails", generation.userId, `${generation.id}.jpg`);
      await ingestRemoteFile(job.thumbnailUrl, key);
      thumbnailUrl = key;
    } catch {
      thumbnailUrl = job.thumbnailUrl;
    }
  }

  return prisma.generation.update({
    where: { id: generationId },
    data: { status: "completed", outputUrl, thumbnailUrl, completedAt: new Date() },
  });
}

/** Sweep every in-flight job. Used by POST /api/worker/poll. */
export async function syncPendingGenerations(limit = 25): Promise<number> {
  const pending = await prisma.generation.findMany({
    where: { status: { in: ["queued", "processing"] } },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true },
  });

  for (const row of pending) {
    await syncGeneration(row.id);
  }
  return pending.length;
}

/**
 * A generation as the client sees it: storage keys resolved to URLs the
 * browser can actually fetch.
 */
export function serializeGeneration(generation: Generation) {
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
    status: generation.status,
    creditsUsed: generation.creditsUsed,
    characterId: generation.characterId,
    errorMessage: generation.errorMessage,
    videoUrl: toUrl(generation.outputUrl),
    thumbnailUrl: toUrl(generation.thumbnailUrl),
    createdAt: generation.createdAt.toISOString(),
    completedAt: generation.completedAt?.toISOString() ?? null,
    mock: isMockMode(),
  };
}

export type SerializedGeneration = ReturnType<typeof serializeGeneration>;

/** Storage keys become /api/files/... ; absolute URLs pass through unchanged. */
export function toUrl(value: string | null): string | null {
  if (!value) return null;
  return /^https?:\/\//i.test(value) ? value : publicUrl(value);
}
