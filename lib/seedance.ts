import { optionalEnv } from "./env";

/**
 * Seedance API client.
 *
 * Seedance is served through the BytePlus / Volcengine Ark "content generation
 * tasks" surface:
 *
 *   POST {BASE}/contents/generations/tasks   -> { id }
 *   GET  {BASE}/contents/generations/tasks/{id} -> { status, content.video_url }
 *
 * Generation parameters (ratio, resolution, duration, seed, watermark) are
 * passed as `--flag value` text commands appended to the prompt rather than as
 * separate JSON fields, and a first-frame reference image is passed as an
 * `image_url` content part.
 *
 * TODO(seedance): confirm the exact request/response shape and the available
 * flags against your account's API docs before going to production — in
 * particular (1) whether your plan exposes `--seed` and reference-image
 * conditioning (both matter for character consistency), and (2) whether a
 * separate style/quality field exists. The response parser below is deliberately
 * tolerant of field-name differences; `SEEDANCE_*` env vars cover the rest.
 *
 * With no SEEDANCE_API_KEY set the client runs in MOCK mode so the full
 * product loop (credits -> job -> polling -> history) is testable offline.
 */

export type SeedanceStatus = "queued" | "processing" | "completed" | "failed";

export interface CreateJobInput {
  prompt: string;
  aspectRatio: string;
  durationSeconds: number;
  resolution: string;
  /** Publicly reachable first-frame image for image-to-video. */
  imageUrl?: string;
  /** Locked seed — the main API-level lever for character consistency. */
  seed?: number;
}

export interface SeedanceJob {
  id: string;
  status: SeedanceStatus;
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}

const MOCK_PREFIX = "mock-";
/** How long a mock job "renders" before reporting completion. */
const MOCK_DURATION_MS = 8_000;
/** Public sample clip used as mock output. */
const MOCK_VIDEO_URL =
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";

export function isMockMode(): boolean {
  return !optionalEnv("SEEDANCE_API_KEY");
}

function baseUrl(): string {
  return (
    optionalEnv("SEEDANCE_API_BASE_URL") ?? "https://ark.ap-southeast.bytepluses.com/api/v3"
  ).replace(/\/+$/, "");
}

function model(): string {
  return optionalEnv("SEEDANCE_MODEL") ?? "seedance-1-0-pro-250528";
}

/**
 * Seedance reads generation parameters as text commands on the prompt.
 * Kept in one place so it is easy to adjust if your account's flags differ.
 */
export function buildPromptCommands(input: CreateJobInput): string {
  const flags = [
    `--ratio ${input.aspectRatio}`,
    `--resolution ${input.resolution}`,
    `--duration ${Math.round(input.durationSeconds)}`,
    "--watermark false",
  ];
  if (typeof input.seed === "number") flags.push(`--seed ${input.seed}`);
  return `${input.prompt.trim()} ${flags.join(" ")}`.trim();
}

async function callSeedance(
  path: string,
  init: RequestInit & { method: "GET" | "POST" },
): Promise<unknown> {
  const apiKey = optionalEnv("SEEDANCE_API_KEY");
  const response = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  const text = await response.text();
  let payload: unknown = undefined;
  try {
    payload = text ? JSON.parse(text) : undefined;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    const message =
      (payload as { error?: { message?: string }; message?: string } | undefined)?.error
        ?.message ??
      (payload as { message?: string } | undefined)?.message ??
      `Seedance request failed with ${response.status}`;
    throw new Error(message);
  }
  return payload;
}

function pick<T = string>(source: unknown, ...paths: string[]): T | undefined {
  for (const p of paths) {
    let current: unknown = source;
    for (const segment of p.split(".")) {
      if (current && typeof current === "object" && segment in (current as object)) {
        current = (current as Record<string, unknown>)[segment];
      } else {
        current = undefined;
        break;
      }
    }
    if (current !== undefined && current !== null && current !== "") return current as T;
  }
  return undefined;
}

/** Map Seedance's task states onto our four-state model. */
export function normalizeStatus(raw: string | undefined): SeedanceStatus {
  switch ((raw ?? "").toLowerCase()) {
    case "succeeded":
    case "success":
    case "completed":
    case "done":
      return "completed";
    case "failed":
    case "error":
    case "cancelled":
    case "canceled":
      return "failed";
    case "running":
    case "processing":
    case "in_progress":
      return "processing";
    default:
      return "queued";
  }
}

export async function createTextToVideoJob(input: CreateJobInput): Promise<SeedanceJob> {
  if (isMockMode()) return createMockJob();

  const payload = await callSeedance("/contents/generations/tasks", {
    method: "POST",
    body: JSON.stringify({
      model: model(),
      content: [{ type: "text", text: buildPromptCommands(input) }],
    }),
  });

  const id = pick<string>(payload, "id", "data.id", "task_id");
  if (!id) throw new Error("Seedance did not return a job id");
  return { id, status: normalizeStatus(pick<string>(payload, "status", "data.status")) };
}

export async function createImageToVideoJob(
  input: CreateJobInput & { imageUrl: string },
): Promise<SeedanceJob> {
  if (isMockMode()) return createMockJob();

  const payload = await callSeedance("/contents/generations/tasks", {
    method: "POST",
    body: JSON.stringify({
      model: model(),
      content: [
        { type: "text", text: buildPromptCommands(input) },
        // `role: first_frame` marks this as the opening frame of the clip.
        { type: "image_url", role: "first_frame", image_url: { url: input.imageUrl } },
      ],
    }),
  });

  const id = pick<string>(payload, "id", "data.id", "task_id");
  if (!id) throw new Error("Seedance did not return a job id");
  return { id, status: normalizeStatus(pick<string>(payload, "status", "data.status")) };
}

export async function getJobStatus(jobId: string): Promise<SeedanceJob> {
  if (jobId.startsWith(MOCK_PREFIX)) return getMockJobStatus(jobId);

  const payload = await callSeedance(
    `/contents/generations/tasks/${encodeURIComponent(jobId)}`,
    { method: "GET" },
  );

  const status = normalizeStatus(pick<string>(payload, "status", "data.status"));
  return {
    id: jobId,
    status,
    videoUrl: pick<string>(
      payload,
      "content.video_url",
      "data.content.video_url",
      "content.url",
      "video_url",
      "result.video_url",
    ),
    thumbnailUrl: pick<string>(
      payload,
      "content.thumbnail_url",
      "data.content.thumbnail_url",
      "thumbnail_url",
      "content.cover_url",
    ),
    error:
      status === "failed"
        ? pick<string>(payload, "error.message", "data.error.message", "message") ??
          "Generation failed"
        : undefined,
  };
}

// --- Mock mode ---------------------------------------------------------------
// The job id encodes its own creation time, so status is derivable without any
// extra state — mock jobs survive a server restart the same way real ones do.

function createMockJob(): SeedanceJob {
  return { id: `${MOCK_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, status: "queued" };
}

function getMockJobStatus(jobId: string): SeedanceJob {
  const createdAt = Number(jobId.slice(MOCK_PREFIX.length).split("-")[0]);
  const elapsed = Date.now() - (Number.isFinite(createdAt) ? createdAt : 0);
  if (elapsed < MOCK_DURATION_MS) return { id: jobId, status: "processing" };
  return { id: jobId, status: "completed", videoUrl: MOCK_VIDEO_URL };
}
