import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { characterCreateSchema } from "@/lib/validation";
import { buildLockedDescription } from "@/lib/anthropic";
import { deriveSeed, listCharacters } from "@/lib/characters";
import { getObject, isOwnedImageKey } from "@/lib/storage";
import { toUrl } from "@/lib/generation";
import { errorResponse } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await requireUserId();
    const characters = await listCharacters(userId);
    return NextResponse.json({
      characters: characters.map((character) => ({
        ...character,
        referenceImageUrl: toUrl(character.referenceImageUrl),
        createdAt: character.createdAt.toISOString(),
        updatedAt: character.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

/** Create a saved character, locking in a stable visual description. */
export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const input = characterCreateSchema.parse(await request.json());

    if (!input.description && !input.referenceImageKey) {
      return NextResponse.json(
        { error: "Add a description, a reference image, or both" },
        { status: 400 },
      );
    }
    if (input.referenceImageKey && !isOwnedImageKey(input.referenceImageKey, userId)) {
      return NextResponse.json({ error: "Invalid image reference" }, { status: 400 });
    }

    // Claude reads the reference image directly, so it can describe details the
    // user never typed — which is what keeps the character consistent later.
    let image: { data: string; mediaType: string } | undefined;
    if (input.referenceImageKey) {
      const object = await getObject(input.referenceImageKey);
      if (object) {
        image = {
          data: object.data.toString("base64"),
          mediaType: object.contentType,
        };
      }
    }

    const { lockedDescription, enhanced } =
      input.useRawDescription && input.description
        ? { lockedDescription: input.description, enhanced: false }
        : await buildLockedDescription({
            name: input.name,
            description: input.description,
            style: input.style,
            image,
          });

    const character = await prisma.character.create({
      data: {
        userId,
        name: input.name,
        lockedDescription,
        style: input.style,
        referenceImageUrl: input.referenceImageKey ?? null,
      },
    });

    // Lock a stable seed too: prompt text is the reliable baseline, a fixed
    // seed is the enhancement where Seedance supports it.
    const withSeed = await prisma.character.update({
      where: { id: character.id },
      data: { seed: deriveSeed(character.id) },
    });

    return NextResponse.json(
      {
        character: { ...withSeed, referenceImageUrl: toUrl(withSeed.referenceImageUrl) },
        enhanced,
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
