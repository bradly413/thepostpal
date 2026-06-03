import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import {
  isS3Configured,
  uploadToS3,
  contentTypeForExtension,
} from "@/lib/storage";

export const runtime = "nodejs";

const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  if (!rateLimit(`upload:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many uploads" }, { status: 429 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (10MB max)" }, { status: 400 });
    }

    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: "File type not allowed. Use jpg, png, gif, or webp." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `${randomUUID()}.${ext}`;

    // Prefer durable object storage when configured; production (Vercel) has
    // an ephemeral filesystem, so local-disk writes do not survive deploys.
    if (isS3Configured()) {
      const { url } = await uploadToS3({
        key: `uploads/${filename}`,
        body: buffer,
        contentType: contentTypeForExtension(ext),
      });
      return NextResponse.json({ url, filename, storage: "s3" });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);

    const publicUrl = `/uploads/${filename}`;
    return NextResponse.json({ url: publicUrl, filename, storage: "local" });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
