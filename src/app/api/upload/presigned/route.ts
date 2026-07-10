import { randomUUID } from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/api-auth";
import { rateLimit, buildRateLimitKey, RateLimitUnavailableError } from "@/lib/rate-limit";
import {
  createS3Client,
  getS3Config,
  getS3PublicUrl,
  isAllowedPresignedContentType,
  presignedMaxBytesForContentType,
} from "@/lib/storage";
import { inferMediaContentType } from "@/lib/upload-mime";

export const runtime = "nodejs";

const PRESIGN_TTL_SECONDS = 900;
const MAX_FILENAME_LENGTH = 180;

function sanitizeFilename(filename: string): string {
  const basename = filename.split(/[\\/]/).pop() || "upload.bin";
  const sanitized = basename
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, MAX_FILENAME_LENGTH);

  return sanitized || "upload.bin";
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthContext();
    try {
      if (!(await rateLimit(buildRateLimitKey("upload-presign", request.headers, auth), 30, 60_000))) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
      }
    } catch (error) {
      if (error instanceof RateLimitUnavailableError) {
        return NextResponse.json({ error: "Rate limit unavailable" }, { status: 503 });
      }
      throw error;
    }
    const body = (await request.json()) as Record<string, unknown>;

    const filename = typeof body.filename === "string" ? body.filename.trim() : "";
    const rawContentType =
      typeof body.contentType === "string" && body.contentType.trim()
        ? body.contentType.trim()
        : "";
    const contentType = inferMediaContentType(filename, rawContentType) || rawContentType;

    const fileSize =
      typeof body.fileSize === "number" && Number.isFinite(body.fileSize)
        ? Math.floor(body.fileSize)
        : null;

    if (!filename || !contentType) {
      return NextResponse.json(
        { error: "filename and contentType are required" },
        { status: 400 },
      );
    }

    if (!isAllowedPresignedContentType(contentType)) {
      return NextResponse.json(
        { error: "Only image and video uploads are supported" },
        { status: 400 },
      );
    }

    if (fileSize != null) {
      if (fileSize <= 0) {
        return NextResponse.json({ error: "fileSize must be positive" }, { status: 400 });
      }
      const maxBytes = presignedMaxBytesForContentType(contentType);
      if (fileSize > maxBytes) {
        return NextResponse.json(
          { error: `File too large (${maxBytes / (1024 * 1024)}MB max)` },
          { status: 400 },
        );
      }
    }

    const config = getS3Config();
    if (!config) {
      return NextResponse.json(
        { error: "S3 upload storage is not configured" },
        { status: 503 },
      );
    }

    const key = `tenants/${auth.tenantId}/${randomUUID()}-${sanitizeFilename(filename)}`;
    const client = createS3Client(config);
    const command = new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      ContentType: contentType,
      ...(fileSize != null ? { ContentLength: fileSize } : {}),
    });

    const uploadUrl = await getSignedUrl(client, command, {
      expiresIn: PRESIGN_TTL_SECONDS,
    });
    const publicUrl = getS3PublicUrl(config, key);

    return NextResponse.json({
      uploadUrl,
      publicUrl,
      key,
      expiresIn: PRESIGN_TTL_SECONDS,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("[upload/presigned]", error);
    return NextResponse.json(
      { error: "Could not create upload URL" },
      { status: 500 },
    );
  }
}
