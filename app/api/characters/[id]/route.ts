import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { characterUpdateSchema } from "@/lib/validation";
import { getCharacter } from "@/lib/characters";
import { toUrl } from "@/lib/generation";
import { deleteObject, isOwnedImageKey } from "@/lib/storage";
import { errorResponse } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const character = await getCharacter(userId, id);
    if (!character) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }
    return NextResponse.json({
      character: { ...character, referenceImageUrl: toUrl(character.referenceImageUrl) },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const input = characterUpdateSchema.parse(await request.json());

    const existing = await getCharacter(userId, id);
    if (!existing) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }
    if (input.referenceImageKey && !isOwnedImageKey(input.referenceImageKey, userId)) {
      return NextResponse.json({ error: "Invalid image reference" }, { status: 400 });
    }

    const character = await prisma.character.update({
      where: { id: existing.id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.lockedDescription !== undefined
          ? { lockedDescription: input.lockedDescription }
          : {}),
        ...(input.style !== undefined ? { style: input.style } : {}),
        ...(input.referenceImageKey !== undefined
          ? { referenceImageUrl: input.referenceImageKey }
          : {}),
      },
    });

    return NextResponse.json({
      character: { ...character, referenceImageUrl: toUrl(character.referenceImageUrl) },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    const existing = await getCharacter(userId, id);
    if (!existing) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    // Past generations keep their history (characterId is set to null by the
    // schema's onDelete: SetNull), but the reference image goes.
    await prisma.character.delete({ where: { id: existing.id } });
    if (existing.referenceImageUrl && !/^https?:\/\//i.test(existing.referenceImageUrl)) {
      await deleteObject(existing.referenceImageUrl).catch(() => undefined);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
