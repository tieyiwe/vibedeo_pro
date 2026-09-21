import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { buildKey, publicUrl, putObject } from "@/lib/storage";
import { errorResponse } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/**
 * Upload an image — either a character reference or a first frame for
 * image-to-video. Returns the storage key to pass back on the next request.
 */
export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const form = await request.formData();
    const file = form.get("file");
    const folder = form.get("folder") === "characters" ? "characters" : "uploads";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json(
        { error: "Upload a PNG, JPEG, WebP or GIF image" },
        { status: 415 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Images must be under 10 MB" }, { status: 413 });
    }

    const key = buildKey(folder, userId, file.name || "image", file.type);
    await putObject(key, Buffer.from(await file.arrayBuffer()), file.type);

    return NextResponse.json({ key, url: publicUrl(key) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
