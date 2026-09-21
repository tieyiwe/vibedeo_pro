import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { enhanceSchema } from "@/lib/validation";
import { enhancePrompt, isAnthropicConfigured } from "@/lib/anthropic";
import { getCharacter } from "@/lib/characters";
import { errorResponse } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Rewrite a rough prompt into a stronger one. The user confirms before generating. */
export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const input = enhanceSchema.parse(await request.json());

    const character = input.characterId
      ? await getCharacter(userId, input.characterId)
      : null;

    const { prompt, enhanced } = await enhancePrompt({
      prompt: input.prompt,
      style: input.style,
      characterName: character?.name,
      characterDescription: character?.lockedDescription,
    });

    return NextResponse.json({
      prompt,
      enhanced,
      // false when ANTHROPIC_API_KEY is missing and the local fallback ran.
      configured: isAnthropicConfigured(),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
