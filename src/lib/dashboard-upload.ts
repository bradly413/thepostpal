"use client";

const PRESIGN_PATH = "/api/upload/presigned";
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

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
export async function uploadMediaToS3(file: File): Promise<string> {
  if (!file || file.size <= 0) {
    throw new DashboardUploadError("Choose a file to upload.");
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new DashboardUploadError(
      `File is too large (${MAX_UPLOAD_BYTES / (1024 * 1024)}MB max).`,
    );
  }

  const contentType = file.type || "application/octet-stream";

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
