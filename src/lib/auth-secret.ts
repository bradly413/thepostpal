const DEV_FALLBACK_SECRET = "posterboy-dev-fallback-secret-change-me";

function readAuthSecret(): string | null {
  const secret =
    process.env.AUTH_SECRET ||
    process.env.JWT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "";
  const trimmed = secret.trim();
  return trimmed ? trimmed : null;
}

export function getAuthSecret(): string {
  const secret = readAuthSecret();
  if (secret) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Missing auth secret in production. Set AUTH_SECRET, JWT_SECRET, or NEXTAUTH_SECRET.",
    );
  }

  return DEV_FALLBACK_SECRET;
}

export function getAuthSecretBytes(): Uint8Array {
  return new TextEncoder().encode(getAuthSecret());
}
