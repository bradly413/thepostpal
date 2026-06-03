import "server-only";

/**
 * Object storage for user uploads.
 *
 * When S3 is configured (via env), uploads go to the bucket and a public URL
 * is returned. Otherwise callers fall back to local-disk writes under
 * public/uploads (fine for local dev, ephemeral on Vercel).
 *
 * S3-compatible providers (Cloudflare R2, MinIO, etc.) work by setting
 * S3_ENDPOINT plus S3_PUBLIC_BASE_URL.
 */

export interface S3Config {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  publicBaseUrl?: string;
  forcePathStyle: boolean;
}

function readS3Config(): S3Config | null {
  const bucket = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET;
  const region =
    process.env.S3_REGION || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY;

  if (!bucket || !region || !accessKeyId || !secretAccessKey) {
    return null;
  }

  const endpoint = process.env.S3_ENDPOINT || undefined;

  return {
    bucket,
    region,
    accessKeyId,
    secretAccessKey,
    endpoint,
    publicBaseUrl: process.env.S3_PUBLIC_BASE_URL || undefined,
    // Custom endpoints (R2/MinIO) generally need path-style addressing.
    forcePathStyle:
      process.env.S3_FORCE_PATH_STYLE === "true" || Boolean(endpoint),
  };
}

export function isS3Configured(): boolean {
  return readS3Config() !== null;
}

function publicUrlForKey(config: S3Config, key: string): string {
  if (config.publicBaseUrl) {
    return `${config.publicBaseUrl.replace(/\/+$/, "")}/${key}`;
  }
  if (config.endpoint) {
    const base = config.endpoint.replace(/\/+$/, "");
    return config.forcePathStyle
      ? `${base}/${config.bucket}/${key}`
      : `${base}/${key}`;
  }
  return `https://${config.bucket}.s3.${config.region}.amazonaws.com/${key}`;
}

/**
 * Upload a buffer to S3. Returns the public URL.
 * Throws if S3 is not configured — callers should gate on isS3Configured().
 */
export async function uploadToS3(input: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<{ url: string; key: string }> {
  const config = readS3Config();
  if (!config) {
    throw new Error("S3 is not configured");
  }

  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");

  const client = new S3Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    ...(config.endpoint ? { endpoint: config.endpoint } : {}),
    forcePathStyle: config.forcePathStyle,
  });

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
    }),
  );

  return { url: publicUrlForKey(config, input.key), key: input.key };
}

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

export function contentTypeForExtension(ext: string): string {
  return CONTENT_TYPE_BY_EXT[ext.toLowerCase()] || "application/octet-stream";
}
