import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { getObject } from "@/lib/storage";
import { verifyKeySignature } from "@/lib/signing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Serve an object from storage.
 *
 * Access is granted to either the signed-in owner (keys are namespaced
 * `<folder>/<userId>/...`) or a request carrying a valid `t` signature. The
 * signed form is what lets Seedance fetch a first-frame image and what makes
 * "copy share link" work without opening the whole bucket.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key: segments } = await params;
  const key = segments.map(decodeURIComponent).join("/");
  const signature = new URL(request.url).searchParams.get("t");

  if (!verifyKeySignature(key, signature)) {
    const userId = await getCurrentUserId();
    const owner = segments[1];
    if (!userId || owner !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  const object = await getObject(key);
  if (!object) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const total = object.data.byteLength;
  const headers: Record<string, string> = {
    "Content-Type": object.contentType,
    "Cache-Control": "private, max-age=3600",
    "Accept-Ranges": "bytes",
  };

  // Safari refuses to play a video that does not answer range requests, and
  // seeking needs them everywhere else, so serve 206 slices when asked.
  const range = request.headers.get("range");
  const match = range?.match(/^bytes=(\d*)-(\d*)$/);
  if (match && (match[1] || match[2])) {
    let start = match[1] ? Number(match[1]) : 0;
    let end = match[2] ? Number(match[2]) : total - 1;

    if (!match[1]) {
      // Suffix form: `bytes=-500` means the last 500 bytes.
      start = Math.max(0, total - Number(match[2]));
      end = total - 1;
    }
    end = Math.min(end, total - 1);

    if (start > end || start >= total) {
      return new NextResponse(null, {
        status: 416,
        headers: { ...headers, "Content-Range": `bytes */${total}` },
      });
    }

    const slice = object.data.subarray(start, end + 1);
    return new NextResponse(new Uint8Array(slice), {
      status: 206,
      headers: {
        ...headers,
        "Content-Range": `bytes ${start}-${end}/${total}`,
        "Content-Length": String(slice.byteLength),
      },
    });
  }

  return new NextResponse(new Uint8Array(object.data), {
    headers: { ...headers, "Content-Length": String(total) },
  });
}
