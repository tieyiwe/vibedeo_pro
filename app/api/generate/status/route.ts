import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeGeneration, syncGeneration } from "@/lib/generation";
import { getBalance } from "@/lib/credits";
import { errorResponse } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Poll job status.
 *
 * `?id=<generationId>` checks one job; with no id every in-flight job of the
 * caller is refreshed. Seedance is asynchronous, so this is what actually
 * drives rows from `processing` to `completed`.
 */
export async function GET(request: Request) {
  try {
    const userId = await requireUserId();
    const id = new URL(request.url).searchParams.get("id");

    const pending = await prisma.generation.findMany({
      where: {
        userId,
        ...(id ? { id } : { status: { in: ["queued", "processing"] } }),
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true },
    });

    for (const row of pending) {
      await syncGeneration(row.id);
    }

    const generations = await prisma.generation.findMany({
      where: { userId, id: { in: pending.map((row) => row.id) } },
      orderBy: { createdAt: "desc" },
      include: { character: { select: { id: true, name: true } } },
    });

    return NextResponse.json({
      generations: generations.map((generation) => ({
        ...serializeGeneration(generation),
        character: generation.character,
      })),
      credits: await getBalance(userId),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
