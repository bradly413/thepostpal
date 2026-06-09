import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { requireAuthContext } from "@/lib/api-auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/route-errors";
import {
  isS3Configured,
  uploadToS3,
  contentTypeForExtension,
} from "@/lib/storage";

export const runtime = "nodejs";

const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "avif", "bmp", "heic", "heif"]);
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB — modern phone photos / screenshots run large

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  if (!rateLimit(`upload:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many uploads" }, { status: 429 });
  }

  try {
    const auth = await requireAuthContext();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (10MB max)" }, { status: 400 });
    }

    const ext = (file.name.split(".").pop() || "").toLowerCase();
    const isImageMime = (file.type || "").startsWith("image/");
    if (!isImageMime && !ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: `Unsupported file${file.type ? ` (${file.type})` : ""}. Upload an image — jpg, png, gif, webp, or heic.` },
        { status: 400 },
      );
    }
    // Storage extension: trust an allowlisted extension, else derive from MIME.
    const safeExt = ALLOWED_EXTENSIONS.has(ext)
      ? ext
      : ((file.type.split("/")[1] || "").replace(/[^a-z0-9]/gi, "").toLowerCase() || "img");

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `${randomUUID()}.${safeExt}`;

    // Prefer durable object storage when configured; production (Vercel) has
    // an ephemeral filesystem, so local-disk writes do not survive deploys.
    if (isS3Configured()) {
      const { url } = await uploadToS3({
        key: `tenants/${auth.tenantId}/uploads/${filename}`,
        body: buffer,
        contentType: contentTypeForExtension(safeExt),
      });
      return NextResponse.json({ url, filename, storage: "s3" });
    }

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

    const publicUrl = `/uploads/${auth.tenantId}/${filename}`;
    return NextResponse.json({ url: publicUrl, filename, storage: "local" });
  } catch (error) {
    return handleRouteError("api.upload.POST", error);
  }
}
