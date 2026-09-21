import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { optionalEnv } from "./env";
import { signKey } from "./signing";

/**
 * Object storage wrapper.
 *
 * Primary backend: Replit Object Storage (provisioned from the Storage pane —
 * it sets the bucket id in Secrets automatically).
 *
 * Fallback backend: the local filesystem under ./.data/storage, used whenever
 * no bucket is configured so the app still runs locally and in CI.
 *
 * Nothing outside this file imports @replit/object-storage. Swapping in S3 /
 * Supabase Storage later means rewriting this one module.
 */

const LOCAL_ROOT = path.join(process.cwd(), ".data", "storage");

function bucketId(): string | undefined {
  return (
    optionalEnv("REPLIT_OBJECT_STORAGE_BUCKET_ID") ??
    optionalEnv("REPLIT_DEFAULT_BUCKET_ID")
  );
}

export function storageBackend(): "replit" | "local" {
  return bucketId() ? "replit" : "local";
}

type ReplitClient = {
  uploadFromBytes(
    key: string,
    value: Buffer,
    options?: { compress?: boolean },
  ): Promise<{ ok: boolean; error?: { message: string } }>;
  downloadAsBytes(
    key: string,
  ): Promise<{ ok: boolean; value?: Buffer[]; error?: { message: string } }>;
  delete(
    key: string,
    options?: { ignoreNotFound?: boolean },
  ): Promise<{ ok: boolean; error?: { message: string } }>;
};

let clientPromise: Promise<ReplitClient> | null = null;

async function replitClient(): Promise<ReplitClient> {
  if (!clientPromise) {
    clientPromise = (async () => {
      const mod = await import("@replit/object-storage");
      const Client = (mod as { Client: new (opts?: { bucketId?: string }) => ReplitClient })
        .Client;
      return new Client({ bucketId: bucketId() });
    })();
  }
  return clientPromise;
}

function safeKey(key: string): string {
  // Keys are generated internally, but never let one escape the storage root.
  const normalized = path.posix.normalize(key).replace(/^(\.\.(\/|$))+/, "");
  if (normalized.startsWith("/") || normalized.includes("..")) {
    throw new Error(`Invalid storage key: ${key}`);
  }
  return normalized;
}

function localPath(key: string): string {
  return path.join(LOCAL_ROOT, safeKey(key));
}

/** File extension for a content type, used to keep keys self-describing. */
export function extensionForType(contentType: string): string {
  const extensions: Record<string, string> = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
  };
  return extensions[contentType] ?? "";
}

/**
 * Build a collision-free object key, e.g. `characters/<userId>/<uuid>.png`.
 *
 * The extension comes from `contentType` when given: keys are read back by
 * extension (Replit Object Storage stores no metadata), so a file uploaded
 * without one would otherwise come back as application/octet-stream and be
 * dropped by the vision call.
 */
export function buildKey(
  folder: "videos" | "thumbnails" | "characters" | "uploads",
  userId: string,
  filename: string,
  contentType?: string,
): string {
  const ext =
    (contentType ? extensionForType(contentType) : "") || path.extname(filename) || "";
  const base = path
    .basename(filename, path.extname(filename))
    .replace(/[^a-zA-Z0-9-_]/g, "")
    .slice(0, 40);
  return `${folder}/${userId}/${Date.now()}-${randomUUID().slice(0, 8)}${
    base ? `-${base}` : ""
  }${ext}`;
}

/**
 * Whether a storage key belongs to this user. Keys are namespaced
 * `<folder>/<userId>/...`, which is what stands in for row-level security when
 * a client hands us a key it got from an earlier upload.
 */
export function isOwnedImageKey(key: string, userId: string): boolean {
  return (
    /^(uploads|characters)\/[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(key) &&
    key.split("/")[1] === userId
  );
}

export async function putObject(
  key: string,
  data: Buffer,
  contentType = "application/octet-stream",
): Promise<string> {
  const cleanKey = safeKey(key);
  if (storageBackend() === "replit") {
    const client = await replitClient();
    // Replit Object Storage stores no per-object metadata, so the content type
    // is carried by the key's extension (see buildKey) and re-derived on read.
    // `compress: false` — these are already-compressed media files.
    const result = await client.uploadFromBytes(cleanKey, data, { compress: false });
    if (!result.ok) {
      throw new Error(`Object storage upload failed: ${result.error?.message}`);
    }
  } else {
    const file = localPath(cleanKey);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, data);
    await fs.writeFile(`${file}.meta`, JSON.stringify({ contentType }));
  }
  return cleanKey;
}

export async function getObject(
  key: string,
): Promise<{ data: Buffer; contentType: string } | null> {
  const cleanKey = safeKey(key);
  if (storageBackend() === "replit") {
    const client = await replitClient();
    const result = await client.downloadAsBytes(cleanKey);
    if (!result.ok || !result.value?.length) return null;
    return { data: Buffer.from(result.value[0]), contentType: guessContentType(cleanKey) };
  }
  try {
    const file = localPath(cleanKey);
    const data = await fs.readFile(file);
    let contentType = guessContentType(cleanKey);
    try {
      const meta = JSON.parse(await fs.readFile(`${file}.meta`, "utf8"));
      if (meta.contentType) contentType = meta.contentType;
    } catch {
      /* no sidecar metadata — fall back to the extension */
    }
    return { data, contentType };
  } catch {
    return null;
  }
}

export async function deleteObject(key: string): Promise<void> {
  const cleanKey = safeKey(key);
  if (storageBackend() === "replit") {
    const client = await replitClient();
    await client.delete(cleanKey, { ignoreNotFound: true });
    return;
  }
  await fs.rm(localPath(cleanKey), { force: true });
  await fs.rm(`${localPath(cleanKey)}.meta`, { force: true });
}

/**
 * URL for an object. Files are served back through /api/files/<key>, which
 * accepts the signed-in owner or a valid `t` signature — so the bucket itself
 * never has to be public, while Seedance and share links still work.
 */
export function publicUrl(key: string): string {
  const path = key.split("/").map(encodeURIComponent).join("/");
  return `/api/files/${path}?t=${signKey(key)}`;
}

export function guessContentType(key: string): string {
  const ext = path.extname(key).toLowerCase();
  const types: Record<string, string> = {
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
  };
  return types[ext] ?? "application/octet-stream";
}

/** Download a remote file (e.g. a finished Seedance render) into our bucket. */
export async function ingestRemoteFile(
  url: string,
  key: string,
): Promise<{ key: string; bytes: number }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") ?? guessContentType(key);
  await putObject(key, buffer, contentType);
  return { key, bytes: buffer.byteLength };
}
