import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncGeneration } from "@/lib/generation";
import { optionalEnv } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Optional Seedance completion callback.
 *
 * Not every Seedance plan supports callbacks, so polling (/api/generate/status
 * and /api/worker/poll) remains the source of truth. When a callback does
 * arrive it simply triggers the same sync early.
 *
 * TODO(seedance): confirm the callback payload field names and the signature
 * scheme against your account's docs; today we accept `{ id | task_id }` and a
 * shared secret in `x-vibedeo-signature`.
 */
export async function POST(request: Request) {
  const secret = optionalEnv("SEEDANCE_WEBHOOK_SECRET");
  if (secret && request.headers.get("x-vibedeo-signature") !== secret) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: { id?: string; task_id?: string; data?: { id?: string } };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const jobId = payload.id ?? payload.task_id ?? payload.data?.id;
  if (!jobId) {
    return NextResponse.json({ error: "Missing job id" }, { status: 400 });
  }

  const generation = await prisma.generation.findFirst({
    where: { seedanceJobId: jobId },
    select: { id: true },
  });
  if (!generation) {
    return NextResponse.json({ error: "Unknown job" }, { status: 404 });
  }

  await syncGeneration(generation.id);
  return NextResponse.json({ ok: true });
}
