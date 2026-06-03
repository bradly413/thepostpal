"use client";

interface PresignedUploadPayload {
  uploadUrl: string;
  publicUrl: string;
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

export async function uploadDashboardImage(file: File): Promise<string> {
  const contentType = file.type || "application/octet-stream";

  const presignRes = await fetch("/api/upload/presigned", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType,
    }),
  });

  if (!presignRes.ok) {
    throw new Error(await readErrorMessage(presignRes, "Could not prepare upload."));
  }

  const { uploadUrl, publicUrl } = (await presignRes.json()) as PresignedUploadPayload;

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error(`Direct upload failed (${uploadRes.status}).`);
  }

  return publicUrl;
}
