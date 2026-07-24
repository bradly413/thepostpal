import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireAuthContext, type AuthContext } from "@/lib/api-auth";
import { resolveAccess } from "@/lib/authz";
import { withTenantDb } from "@/lib/db";
import {
  buildRateLimitKey,
  rateLimit,
  RateLimitUnavailableError,
} from "@/lib/rate-limit";
import { isSafeMediaUrl } from "@/lib/safe-media-url";

export const runtime = "nodejs";

const DEFAULT_PAGE_SIZE = 80;
const MAX_PAGE_SIZE = 100;
const MAX_SYNC_MESSAGES = 120;
const MAX_TEXT_LENGTH = 4_000;
const MAX_CLIENT_ID_LENGTH = 160;
const MAX_MEDIA_PER_MESSAGE = 5;

type StoredRole = "user" | "assistant";
type StoredStatus = "working" | "done" | "error";
type StoredMediaType = "image" | "video";
type StoredFormat = "single" | "carousel";

interface ParsedMessage {
  clientId: string;
  role: StoredRole;
  text: string;
  status: StoredStatus | null;
  mediaUrl: string | null;
  mediaUrls: string[];
  mediaType: StoredMediaType | null;
  aspect: string | null;
  format: StoredFormat | null;
  carouselCount: number | null;
  sentAt: Date;
}

interface HistoryCursor {
  sentAt: Date;
  id: string;
}

function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function parseSentAt(value: unknown): Date {
  const numeric = typeof value === "number" ? value : Number.NaN;
  const date = new Date(numeric);
  if (!Number.isFinite(numeric) || Number.isNaN(date.getTime())) return new Date();
  return date;
}

function parseMessage(value: unknown): ParsedMessage | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const clientId = cleanText(raw.id, MAX_CLIENT_ID_LENGTH);
  const role = raw.role === "user" || raw.role === "assistant" ? raw.role : null;
  const text = cleanText(raw.text, MAX_TEXT_LENGTH);
  if (!clientId || !role || !text) return null;

  const status: StoredStatus | null =
    role === "assistant" &&
    (raw.status === "working" || raw.status === "done" || raw.status === "error")
      ? raw.status
      : null;
  const rawMediaUrl = cleanText(raw.imageUrl, 2_048);
  const mediaUrl = rawMediaUrl && isSafeMediaUrl(rawMediaUrl) ? rawMediaUrl : null;
  const mediaUrls = Array.isArray(raw.mediaUrls)
    ? raw.mediaUrls
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => isSafeMediaUrl(item))
        .slice(0, MAX_MEDIA_PER_MESSAGE)
    : [];
  const mediaType: StoredMediaType | null =
    raw.mediaType === "video" || raw.mediaType === "image" ? raw.mediaType : null;
  const format: StoredFormat | null =
    raw.format === "carousel" || raw.format === "single" ? raw.format : null;
  const count = typeof raw.carouselCount === "number" ? Math.round(raw.carouselCount) : null;

  return {
    clientId,
    role,
    text,
    status,
    mediaUrl,
    mediaUrls,
    mediaType,
    aspect: cleanText(raw.aspect, 16) || null,
    format,
    carouselCount:
      format === "carousel" && count != null
        ? Math.min(5, Math.max(2, count))
        : null,
    sentAt: parseSentAt(raw.at),
  };
}

function encodeCursor(cursor: { sentAt: Date; id: string }): string {
  return Buffer.from(
    JSON.stringify({ sentAt: cursor.sentAt.toISOString(), id: cursor.id }),
  ).toString("base64url");
}

function decodeCursor(raw: string | null): HistoryCursor | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as {
      sentAt?: unknown;
      id?: unknown;
    };
    const sentAt = new Date(typeof parsed.sentAt === "string" ? parsed.sentAt : "");
    const id = cleanText(parsed.id, 128);
    if (!id || Number.isNaN(sentAt.getTime())) return null;
    return { sentAt, id };
  } catch {
    return null;
  }
}

function responseMessage(row: {
  clientId: string;
  role: string;
  text: string;
  status: string | null;
  mediaUrl: string | null;
  mediaUrls: Prisma.JsonValue;
  mediaType: string | null;
  aspect: string | null;
  format: string | null;
  carouselCount: number | null;
  sentAt: Date;
}) {
  return {
    id: row.clientId,
    role: row.role,
    text: row.text,
    ...(row.role === "assistant"
      ? {
          status: row.status || "done",
          imageUrl: row.mediaUrl,
          mediaUrls: Array.isArray(row.mediaUrls)
            ? row.mediaUrls.filter((item): item is string => typeof item === "string")
            : [],
          mediaType: row.mediaType || "image",
          aspect: row.aspect,
          format: row.format || "single",
          carouselCount: row.carouselCount,
        }
      : {}),
    at: row.sentAt.getTime(),
  };
}

async function enforceRateLimit(
  request: NextRequest,
  auth: AuthContext,
  action: "read" | "write",
): Promise<NextResponse | null> {
  try {
    const allowed = await rateLimit(
      buildRateLimitKey(`studio-history-${action}`, request.headers, auth),
      action === "read" ? 120 : 60,
      60_000,
    );
    return allowed
      ? null
      : NextResponse.json({ error: "Too many requests" }, { status: 429 });
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return NextResponse.json({ error: "Rate limit unavailable" }, { status: 503 });
    }
    throw error;
  }
}

export async function GET(request: NextRequest) {
  let auth: AuthContext;
  try {
    auth = await requireAuthContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = await enforceRateLimit(request, auth, "read");
  if (limited) return limited;

  const locationId = request.nextUrl.searchParams.get("locationId")?.trim() || "";
  if (!locationId) {
    return NextResponse.json({ error: "locationId is required" }, { status: 400 });
  }
  const requestedLimit = Number(request.nextUrl.searchParams.get("limit"));
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(requestedLimit)))
    : DEFAULT_PAGE_SIZE;
  const cursor = decodeCursor(request.nextUrl.searchParams.get("before"));
  if (request.nextUrl.searchParams.has("before") && !cursor) {
    return NextResponse.json({ error: "Invalid history cursor" }, { status: 400 });
  }

  try {
    return await withTenantDb(auth, async (tx) => {
      const access = await resolveAccess(auth.userId, locationId, tx);
      if (!access.hasAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const rows = await tx.studioMessage.findMany({
        where: {
          organizationId: auth.tenantId,
          locationId,
          userId: auth.userId,
          ...(cursor
            ? {
                OR: [
                  { sentAt: { lt: cursor.sentAt } },
                  { sentAt: cursor.sentAt, id: { lt: cursor.id } },
                ],
              }
            : {}),
        },
        orderBy: [{ sentAt: "desc" }, { id: "desc" }],
        take: limit + 1,
      });
      const visible = rows.slice(0, limit);
      const oldest = visible[visible.length - 1];
      return NextResponse.json({
        messages: visible.reverse().map(responseMessage),
        nextCursor:
          rows.length > limit && oldest
            ? encodeCursor({ sentAt: oldest.sentAt, id: oldest.id })
            : null,
      });
    });
  } catch (error) {
    console.error("[studio/history] read failed", error);
    return NextResponse.json({ error: "Could not load Studio history." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let auth: AuthContext;
  try {
    auth = await requireAuthContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = await enforceRateLimit(request, auth, "write");
  if (limited) return limited;

  let body: { locationId?: unknown; messages?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const locationId = cleanText(body.locationId, 128);
  if (!locationId) {
    return NextResponse.json({ error: "locationId is required" }, { status: 400 });
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: "messages are required" }, { status: 400 });
  }
  if (body.messages.length > MAX_SYNC_MESSAGES) {
    return NextResponse.json({ error: "Too many messages" }, { status: 413 });
  }

  const parsed = body.messages.map(parseMessage);
  if (parsed.some((message) => message == null)) {
    return NextResponse.json({ error: "Invalid Studio message" }, { status: 400 });
  }
  const deduped = [
    ...new Map((parsed as ParsedMessage[]).map((message) => [message.clientId, message])).values(),
  ];

  try {
    return await withTenantDb(auth, async (tx) => {
      const access = await resolveAccess(auth.userId, locationId, tx);
      if (!access.hasAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      await Promise.all(
        deduped.map((message) =>
          tx.studioMessage.upsert({
            where: {
              locationId_userId_clientId: {
                locationId,
                userId: auth.userId,
                clientId: message.clientId,
              },
            },
            create: {
              organizationId: auth.tenantId,
              locationId,
              userId: auth.userId,
              clientId: message.clientId,
              role: message.role,
              text: message.text,
              status: message.status,
              mediaUrl: message.mediaUrl,
              mediaUrls: message.mediaUrls,
              mediaType: message.mediaType,
              aspect: message.aspect,
              format: message.format,
              carouselCount: message.carouselCount,
              sentAt: message.sentAt,
            },
            update: {
              text: message.text,
              status: message.status,
              mediaUrl: message.mediaUrl,
              mediaUrls: message.mediaUrls,
              mediaType: message.mediaType,
              aspect: message.aspect,
              format: message.format,
              carouselCount: message.carouselCount,
              sentAt: message.sentAt,
            },
          }),
        ),
      );

      return NextResponse.json({ saved: deduped.length });
    });
  } catch (error) {
    console.error("[studio/history] write failed", error);
    return NextResponse.json({ error: "Could not save Studio history." }, { status: 500 });
  }
}
