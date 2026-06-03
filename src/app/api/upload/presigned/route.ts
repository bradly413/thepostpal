import { randomUUID } from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/api-auth";
import { createS3Client, getS3Config, getS3PublicUrl } from "@/lib/storage";

export const runtime = "nodejs";

function sanitizeFilename(filename: string): string {
  const basename = filename.split(/[\\/]/).pop() || "upload.bin";
  const sanitized = basename
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");

  return sanitized || "upload.bin";
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthContext();
    const body = (await request.json()) as Record<string, unknown>;

    const filename = typeof body.filename === "string" ? body.filename.trim() : "";
    const contentType =
      typeof body.contentType === "string" && body.contentType.trim()
        ? body.contentType.trim()
        : "";

    if (!filename || !contentType) {
      return NextResponse.json(
        { error: "filename and contentType are required" },
        { status: 400 },
      );
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
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 900 });
    const publicUrl = getS3PublicUrl(config, key);

    return NextResponse.json({ uploadUrl, publicUrl });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Could not create upload URL" },
      { status: 500 },
    );
  }
}
