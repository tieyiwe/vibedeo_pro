import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSchema } from "@/lib/validation";
import { serializeGeneration, startGeneration } from "@/lib/generation";
import { getBalance } from "@/lib/credits";
import { isOwnedImageKey } from "@/lib/storage";
import { errorResponse } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Create a generation job. */
export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const input = generateSchema.parse(await request.json());

    // An uploaded first frame must belong to the caller — keys are namespaced
    // by user id, which is what we check here (no DB-level RLS on Postgres).
    // Both folders are allowed: animating a saved character's reference image
    // is a first-class flow, not just a fresh upload.
    if (input.imageKey && !isOwnedImageKey(input.imageKey, userId)) {
      return NextResponse.json({ error: "Invalid image reference" }, { status: 400 });
    }

    const generation = await startGeneration(userId, input);
    return NextResponse.json(
      { generation: serializeGeneration(generation), credits: await getBalance(userId) },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

/** The caller's generation history. */
export async function GET(request: Request) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? 50) || 50, 100);

    const generations = await prisma.generation.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { character: { select: { id: true, name: true } } },
    });

    return NextResponse.json({
      generations: generations.map((generation) => ({
        ...serializeGeneration(generation),
        character: generation.character,
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
