import "server-only";

import { readFile } from "fs/promises";
import path from "path";
import { lookup } from "dns/promises";
import { isIP } from "net";
import sharp from "sharp";
import { isInlineReferenceImage } from "@/lib/reference-image";

const MAX_BYTES = 12 * 1024 * 1024;

function hostFromEnvUrl(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  try {
    return new URL(raw.trim()).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function allowedHttpsHosts(): Set<string> {
  const hosts = new Set<string>();
  const candidates = [
    process.env.S3_PUBLIC_BASE_URL,
    process.env.NEXT_PUBLIC_S3_PUBLIC_BASE_URL,
    process.env.BLOB_PUBLIC_BASE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ];
  for (const c of candidates) {
    const host = hostFromEnvUrl(c);
    if (host) hosts.add(host);
  }
  // Common CDN patterns for this stack
  for (const extra of (process.env.VISION_IMAGE_ALLOWED_HOSTS || "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean)) {
    hosts.add(extra);
  }
  return hosts;
}

function isPrivateIp(ip: string): boolean {
  const v = ip.toLowerCase();
  if (v === "::1" || v === "0.0.0.0") return true;
  if (v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80:")) return true;
  if (v.includes(":")) {
    // Other IPv6 — treat link-local / unique-local already; allow public IPv6
    return false;
  }
  const parts = v.split(".").map((n) => Number(n));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

function hostAllowed(hostname: string, allow: Set<string>): boolean {
  const host = hostname.toLowerCase();
  if (allow.has(host)) return true;
  // Allow subdomains of configured hosts (e.g. *.cloudfront.net when base is set)
  for (const entry of allow) {
    if (host === entry || host.endsWith(`.${entry}`)) return true;
  }
  // AWS CloudFront / S3 virtual-hosted style when S3 public base is configured
  if (
    allow.size > 0 &&
    (host.endsWith(".cloudfront.net") ||
      host.endsWith(".amazonaws.com") ||
      host.endsWith(".public.blob.vercel-storage.com"))
  ) {
    return true;
  }
  return false;
}

async function assertSafeHttpsFetchUrl(urlString: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new Error("Invalid image URL");
  }
  if (url.protocol !== "https:") {
    throw new Error("Only https image URLs are allowed");
  }
  if (url.username || url.password) {
    throw new Error("Image URL credentials are not allowed");
  }

  const allow = allowedHttpsHosts();
  if (allow.size === 0) {
    throw new Error("No allowed image hosts configured");
  }
  if (!hostAllowed(url.hostname, allow)) {
    throw new Error("Image host is not allowlisted");
  }

  // Block literal private IPs in the hostname
  if (isIP(url.hostname) && isPrivateIp(url.hostname)) {
    throw new Error("Private image hosts are blocked");
  }

  // DNS resolve and block private targets (SSRF)
  if (!isIP(url.hostname)) {
    try {
      const results = await lookup(url.hostname, { all: true });
      if (results.length === 0 || results.some((r) => isPrivateIp(r.address))) {
        throw new Error("Image host resolves to a private address");
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes("private")) throw err;
      throw new Error("Could not resolve image host");
    }
  }

  return url;
}

async function readLocalUploadBytes(trimmed: string): Promise<Buffer | null> {
  if (!trimmed.startsWith("/uploads/")) return null;
  const relative = trimmed.replace(/^\/+/, "");
  const filePath = path.join(process.cwd(), "public", relative);
  if (!filePath.startsWith(path.join(process.cwd(), "public", "uploads"))) return null;
  try {
    const buf = await readFile(filePath);
    return buf.length > 0 && buf.length <= MAX_BYTES ? buf : null;
  } catch {
    return null;
  }
}

/** Normalize an inline data URL or https URL to a JPEG base64 string for vision APIs. */
export async function loadVisionJpegBase64(source: string): Promise<string | null> {
  const trimmed: string = source.trim();
  if (!trimmed) return null;

  try {
    let input: Buffer;
    if (trimmed.startsWith("/uploads/")) {
      const local = await readLocalUploadBytes(trimmed);
      if (!local) return null;
      input = local;
    } else if (isInlineReferenceImage(trimmed)) {
      const match = trimmed.match(/^data:(.+?);base64,([A-Za-z0-9+/=\s]+)$/);
      if (!match) return null;
      input = Buffer.from(match[2].replace(/\s/g, ""), "base64");
    } else if (/^https:\/\//i.test(trimmed)) {
      const safeUrl = await assertSafeHttpsFetchUrl(trimmed);
      const res = await fetch(safeUrl.toString(), {
        redirect: "error",
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) return null;
      const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
      if (
        contentType.length > 0 &&
        !contentType.startsWith("image/") &&
        !contentType.includes("octet-stream")
      ) {
        return null;
      }
      input = Buffer.from(await res.arrayBuffer());
    } else {
      return null;
    }

    if (input.length > MAX_BYTES) return null;

    const jpeg = await sharp(input)
      .resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
    return jpeg.toString("base64");
  } catch {
    return null;
  }
}

/** Inline Gemini part from a data URL, hosted https image, or local /uploads path. */
export async function referenceImageToGeminiInline(
  source: string,
): Promise<{ mimeType: string; data: string } | null> {
  const trimmed = source.trim();
  if (!trimmed) return null;

  if (isInlineReferenceImage(trimmed)) {
    const match = trimmed.match(/^data:(.+?);base64,([A-Za-z0-9+/=\s]+)$/);
    if (!match) return null;
    return { mimeType: match[1], data: match[2].replace(/\s/g, "") };
  }

  const jpegB64 = await loadVisionJpegBase64(trimmed);
  if (!jpegB64) return null;
  return { mimeType: "image/jpeg", data: jpegB64 };
}
