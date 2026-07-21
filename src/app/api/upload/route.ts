import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { requireAuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";
import { resolveAccess } from "@/lib/authz";
import { rateLimit, buildRateLimitKey, RateLimitUnavailableError } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/route-errors";
import { inferMediaContentType } from "@/lib/upload-mime";
import { isSafeMediaUrl } from "@/lib/safe-media-url";
import {
  isS3Configured,
  uploadToS3,
  contentTypeForExtension,
} from "@/lib/storage";

export const runtime = "nodejs";

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "avif", "bmp", "heic", "heif"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "webm"]);
const ALLOWED_EXTENSIONS = new Set([...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS]);
const MAX_IMAGE_SIZE = 25 * 1024 * 1024;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthContext();
    try {
      if (!(await rateLimit(buildRateLimitKey("upload", req.headers, auth), 10, 60_000))) {
        return NextResponse.json({ error: "Too many uploads" }, { status: 429 });
      }
    } catch (error) {
      if (error instanceof RateLimitUnavailableError) {
        return NextResponse.json({ error: "Rate limit unavailable" }, { status: 503 });
      }
      throw error;
    }
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const locationIdRaw = formData.get("locationId");
    const locationId =
      typeof locationIdRaw === "string" ? locationIdRaw.trim() : "";
    const altRaw = formData.get("alt");
    const alt = typeof altRaw === "string" ? altRaw.trim().slice(0, 200) : "";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const ext = (file.name.split(".").pop() || "").toLowerCase();
    const inferredType = inferMediaContentType(file.name, file.type);
    const isImageMime = (inferredType || file.type || "").startsWith("image/");
    const isVideoMime = (inferredType || file.type || "").startsWith("video/");
    const isVideo = isVideoMime || VIDEO_EXTENSIONS.has(ext);
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;

    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large (${maxSize / (1024 * 1024)}MB max)` },
        { status: 400 },
      );
    }

    if (!isImageMime && !isVideoMime && !ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: `Unsupported file${file.type ? ` (${file.type})` : ""}. Upload an image (jpg, png, webp) or video (mp4, mov).` },
        { status: 400 },
      );
    }
    // Storage extension: trust an allowlisted extension, else derive from MIME.
    const safeExt = ALLOWED_EXTENSIONS.has(ext)
      ? ext
      : ((inferredType || file.type).split("/")[1] || "").replace(/[^a-z0-9]/gi, "").toLowerCase() || "img";

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `${randomUUID()}.${safeExt}`;

    const contentType =
      contentTypeForExtension(safeExt) || inferredType || file.type || "application/octet-stream";

    // Prefer durable object storage when configured; production (Vercel) has
    // an ephemeral filesystem, so local-disk writes do not survive deploys.
    let publicUrl: string;
    let storage: "s3" | "local";
    if (isS3Configured()) {
      const uploaded = await uploadToS3({
        key: `tenants/${auth.tenantId}/uploads/${filename}`,
        body: buffer,
        contentType,
      });
      publicUrl = uploaded.url;
      storage = "s3";
    } else {
      try {
        const uploadDir = path.join(process.cwd(), "public", "uploads", auth.tenantId);
        await mkdir(uploadDir, { recursive: true });
        await writeFile(path.join(uploadDir, filename), buffer);
      } catch {
        // Serverless/prod filesystems are read-only, so local-disk writes fail —
        // and wouldn't be durably served even if they succeeded. Be explicit.
        return NextResponse.json(
          {
            error:
              "Image storage isn't configured for this environment. Connect S3 (or a blob store) to enable uploads on production.",
          },
          { status: 503 },
        );
      }
      publicUrl = `/uploads/${auth.tenantId}/${filename}`;
      storage = "local";
    }

    // Register in the media library when a location is provided.
    let photoId: string | undefined;
    if (locationId && isSafeMediaUrl(publicUrl)) {
      try {
        photoId = await withTenantDb(auth, async (tx) => {
          const access = await resolveAccess(auth.userId, locationId, tx);
          if (!access.hasAccess) return undefined;
          const photo = await tx.photoAsset.create({
            data: {
              organizationId: auth.tenantId,
              locationId,
              url: publicUrl,
              mimeType: contentType,
              alt: alt || file.name || null,
            },
          });
          return photo.id;
        });
      } catch {
        // Upload succeeded — library registration is best-effort.
      }
    }

    return NextResponse.json({
      url: publicUrl,
      filename,
      storage,
      ...(photoId ? { photoId } : {}),
    });
  } catch (error) {
    return handleRouteError("api.upload.POST", error);
  }
}
