import { NextResponse } from "next/server";
import { syncPendingGenerations } from "@/lib/generation";
import { optionalEnv } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Background sweep of in-flight Seedance jobs.
 *
 * The generation table is the queue; this route drains it. Call it from a
 * Replit Scheduled Deployment (or any cron) every ~30s so jobs still finish
 * when the user closes the tab:
 *
 *   curl -X POST -H "x-worker-secret: $WORKER_SECRET" $APP_URL/api/worker/poll
 */
export async function POST(request: Request) {
  const secret = optionalEnv("WORKER_SECRET");
  if (secret && request.headers.get("x-worker-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const processed = await syncPendingGenerations();
  return NextResponse.json({ processed });
}
