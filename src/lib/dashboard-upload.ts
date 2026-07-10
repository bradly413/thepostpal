"use client";

import {
  inferMediaContentType,
  isVideoContentType,
} from "@/lib/upload-mime";

const PRESIGN_PATH = "/api/upload/presigned";
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

export interface PresignedUploadResponse {
  uploadUrl: string;
  publicUrl: string;
  key?: string;
  expiresIn?: number;
}

export class DashboardUploadError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "DashboardUploadError";
    this.status = status;
  }
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

/**
 * Upload a file directly to S3 via a short-lived presigned PUT URL.
 * Bypasses the Next.js request body limit entirely.
 */
function maxBytesForFile(file: File): number {
  const contentType = inferMediaContentType(file.name, file.type);
  return contentType && isVideoContentType(contentType)
    ? MAX_VIDEO_BYTES
    : MAX_IMAGE_BYTES;
}

export async function uploadMediaToS3(file: File): Promise<string> {
  if (!file || file.size <= 0) {
    throw new DashboardUploadError("Choose a file to upload.");
  }

  const contentType = inferMediaContentType(file.name, file.type);
  if (!contentType) {
    throw new DashboardUploadError(
      `${file.name} isn't a supported image or video. Use JPG, PNG, WebP, HEIC, MP4, or MOV.`,
    );
  }

  const maxBytes = maxBytesForFile(file);
  if (file.size > maxBytes) {
    const kind = isVideoContentType(contentType) ? "Video" : "Image";
    throw new DashboardUploadError(
      `${kind} is too large (${maxBytes / (1024 * 1024)}MB max).`,
    );
  }

  const presignRes = await fetch(PRESIGN_PATH, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType,
      fileSize: file.size,
    }),
  });

  if (!presignRes.ok) {
    throw new DashboardUploadError(
      await readErrorMessage(presignRes, "Could not prepare upload."),
      presignRes.status,
    );
  }

  const payload = (await presignRes.json()) as PresignedUploadResponse;

  if (!payload.uploadUrl || !payload.publicUrl) {
    throw new DashboardUploadError("Upload service returned an incomplete response.");
  }

  const uploadRes = await fetch(payload.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new DashboardUploadError(
      `Direct upload to storage failed (${uploadRes.status}).`,
      uploadRes.status,
    );
  }

  return payload.publicUrl;
}

/** @deprecated Use uploadMediaToS3 — kept for existing dashboard imports. */
export const uploadDashboardImage = uploadMediaToS3;

export const uploadDashboardVideo = uploadMediaToS3;
