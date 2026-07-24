import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/api-auth";
import { resolveAccess } from "@/lib/authz";
import { withTenantDb } from "@/lib/db";
import {
  convertPhotoToDownloadPng,
  photoDownloadFilename,
} from "@/lib/photo-download";
import {
  buildRateLimitKey,
  rateLimit,
  RateLimitUnavailableError,
} from "@/lib/rate-limit";
import { readCappedBuffer, safeFetch } from "@/lib/safe-fetch";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

interface Params {
  params: Promise<{ id: string }>;
}

async function loadPhotoBytes(url: string): Promise<Buffer> {
  if (url.startsWith("/uploads/") && !url.includes("..") && !url.includes("\0")) {
    const publicRoot = path.join(process.cwd(), "public");
    const filePath = path.resolve(publicRoot, url.replace(/^\/+/, ""));
    if (!filePath.startsWith(`${publicRoot}${path.sep}`)) {
      throw new Error("Invalid local media path");
    }
    const bytes = await readFile(filePath);
    if (!bytes.length || bytes.length > MAX_SOURCE_BYTES) {
      throw new Error("Image is too large");
    }
    return bytes;
  }

  if (!/^https:\/\//i.test(url)) {
    throw new Error("Unsupported media URL");
  }

  const response = await safeFetch(
    url,
    {
      headers: {
        Accept: "image/*",
        "User-Agent": "PosterboySocial/1.0 (+https://www.posterboysocial.com)",
      },
    },
    { timeoutMs: 15_000, maxBytes: MAX_SOURCE_BYTES },
  );
  if (!response.ok) {
    throw new Error(`Media fetch failed (${response.status})`);
  }
  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  if (contentType && !contentType.startsWith("image/")) {
    throw new Error("Stored media is not an image");
  }
  return readCappedBuffer(response, MAX_SOURCE_BYTES);
}

export async function GET(request: NextRequest, { params }: Params) {
  let auth: Awaited<ReturnType<typeof requireAuthContext>>;
  try {
    auth = await requireAuthContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (
      !(await rateLimit(
        buildRateLimitKey("photo-download", request.headers, auth),
        20,
        60_000,
      ))
    ) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return NextResponse.json({ error: "Rate limit unavailable" }, { status: 503 });
    }
    throw error;
  }

  const { id } = await params;
  const lookup = await withTenantDb(auth, async (tx) => {
    const photo = await tx.photoAsset.findFirst({
      where: { id, organizationId: auth.tenantId },
      select: {
        id: true,
        locationId: true,
        url: true,
        mimeType: true,
        alt: true,
      },
    });
    if (!photo) return { status: 404 as const };
    if (photo.locationId) {
      const access = await resolveAccess(auth.userId, photo.locationId, tx);
      if (!access.hasAccess) return { status: 403 as const };
    }
    return { status: 200 as const, photo };
  });

  if (lookup.status === 404) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }
  if (lookup.status === 403) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (lookup.photo.mimeType?.startsWith("video/")) {
    return NextResponse.json(
      { error: "Only images can be downloaded as PNG" },
      { status: 415 },
    );
  }

  try {
    const source = await loadPhotoBytes(lookup.photo.url);
    const png = await convertPhotoToDownloadPng(source);
    const filename = photoDownloadFilename(
      lookup.photo.alt,
      lookup.photo.id,
    );

    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(png.length),
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[photos/download]", {
      photoId: id,
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Could not prepare that image as a PNG." },
      { status: 502 },
    );
  }
}
