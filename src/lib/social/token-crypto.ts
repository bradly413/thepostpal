import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const TOKEN_PREFIX = "enc:v1";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function decodeBase64Url(value: string): Buffer {
  return Buffer.from(value, "base64url");
}

function encodeBase64Url(value: Buffer): string {
  return value.toString("base64url");
}

function resolveTokenKey(): Buffer {
  const raw = process.env.TOKEN_ENC_KEY?.trim();
  if (!raw) {
    throw new Error("TOKEN_ENC_KEY_MISSING");
  }

  const candidates: Buffer[] = [];

  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    candidates.push(Buffer.from(raw, "hex"));
  }

  try {
    candidates.push(Buffer.from(raw, "base64"));
  } catch {
    // ignore invalid candidate
  }

  try {
    candidates.push(decodeBase64Url(raw));
  } catch {
    // ignore invalid candidate
  }

  candidates.push(Buffer.from(raw, "utf8"));

  const key = candidates.find((candidate) => candidate.length === KEY_LENGTH);
  if (!key) {
    throw new Error("TOKEN_ENC_KEY_INVALID");
  }

  return key;
}

export function isEncryptedToken(token: string | null | undefined): boolean {
  return typeof token === "string" && token.startsWith(`${TOKEN_PREFIX}:`);
}

export function encryptToken(plaintext: string): string {
  if (!plaintext.trim()) {
    throw new Error("TOKEN_PLAINTEXT_REQUIRED");
  }

  if (isEncryptedToken(plaintext)) {
    return plaintext;
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", resolveTokenKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    TOKEN_PREFIX,
    encodeBase64Url(iv),
    encodeBase64Url(tag),
    encodeBase64Url(encrypted),
  ].join(":");
}

export function decryptToken(token: string): string {
  if (!isEncryptedToken(token)) {
    return token;
  }

  const [, version, ivPart, tagPart, encryptedPart] = token.split(":");
  if (version !== "v1" || !ivPart || !tagPart || !encryptedPart) {
    throw new Error("TOKEN_ENC_PAYLOAD_INVALID");
  }

  const iv = decodeBase64Url(ivPart);
  const tag = decodeBase64Url(tagPart);
  const encrypted = decodeBase64Url(encryptedPart);

  if (iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH) {
    throw new Error("TOKEN_ENC_PAYLOAD_INVALID");
  }

  const decipher = createDecipheriv("aes-256-gcm", resolveTokenKey(), iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
}
