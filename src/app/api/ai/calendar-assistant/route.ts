import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";
import type { DraftStatus, LocationRole, Prisma } from "@prisma/client";
import { requireAuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";
import { resolveAccess } from "@/lib/authz";
import { handleRouteError } from "@/lib/route-errors";
import { anthropic } from "@/lib/ai/anthropic";
import {
  rateLimit,
  buildRateLimitKey,
  RateLimitUnavailableError,
} from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Cron-queued posts only — Meta-native `scheduled` is out of scope for mass delete. */
const QUEUED_STATUSES: DraftStatus[] = ["approved"];
const UNPUBLISHED_STATUSES: DraftStatus[] = [
  "draft",
  "needs_review",
  "approved",
  "failed",
  "needs_revision",
  "skipped",
];

const MAX_DELETE = 100;
const PENDING_TTL_MS = 10 * 60_000;

const ROLE_RANK: Record<LocationRole, number> = {
  LOCATION_VIEWER: 0,
  LOCATION_EDITOR: 1,
  LOCATION_ADMIN: 2,
};

type PendingDelete = {
  token: string;
  tenantId: string;
  locationId: string;
  userId: string;
  ids: string[];
  summary: string;
  expiresAt: number;
};

const pendingDeletes = new Map<string, PendingDelete>();

function prunePending() {
  const now = Date.now();
  for (const [token, entry] of pendingDeletes) {
    if (entry.expiresAt <= now) pendingDeletes.delete(token);
  }
}

function roleAtLeast(
  role: LocationRole | null | undefined,
  minimum: LocationRole,
): boolean {
  return ROLE_RANK[role ?? "LOCATION_VIEWER"] >= ROLE_RANK[minimum];
}

const SYSTEM = `You are the Schedule assistant for Posterboy (local-business social scheduling).
You help the user manage posts on their calendar for the active location only.

Rules:
- Use tools to inspect or propose changes. Never invent post counts or IDs.
- "Queued" / "scheduled" posts mean status approved (waiting for the publish cron). Never touch published posts.
- Meta-native "scheduled" status is out of scope — do not claim you can cancel those.
- To remove posts: call proposeDeleteScheduledPosts. That only proposes a delete — the product UI confirms with a button. Never claim posts were deleted until the user confirms in the UI.
- Be concise and practical. Industry-agnostic voice (not restaurant-specific).`;

type ChatMsg = { role: "user" | "assistant"; content: string };

async function executeConfirmedDelete(
  auth: Awaited<ReturnType<typeof requireAuthContext>>,
  locationId: string,
  token: string,
) {
  prunePending();
  const pending = pendingDeletes.get(token);
  if (
    !pending ||
    pending.expiresAt <= Date.now() ||
    pending.tenantId !== auth.tenantId ||
    pending.locationId !== locationId ||
    pending.userId !== auth.userId
  ) {
    return NextResponse.json(
      { error: "Delete confirmation expired. Ask the assistant again." },
      { status: 400 },
    );
  }

  const access = await withTenantDb(auth, async (tx) =>
    resolveAccess(auth.userId, locationId, tx),
  );
  if (!access.hasAccess || !roleAtLeast(access.role, "LOCATION_EDITOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const deleted = await withTenantDb(auth, async (tx) => {
    const result = await tx.scheduledPost.deleteMany({
      where: {
        organizationId: auth.tenantId,
        locationId,
        id: { in: pending.ids },
        status: { in: [...QUEUED_STATUSES, ...UNPUBLISHED_STATUSES] },
      },
    });
    return result.count;
  });

  pendingDeletes.delete(token);

  const message =
    deleted === 0
      ? "No matching posts were deleted (they may have already been removed)."
      : `Deleted ${deleted} post${deleted === 1 ? "" : "s"}.`;

  return NextResponse.json({
    message,
    postsChanged: deleted > 0,
    toolSummaries: [message],
  });
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY?.trim()) {
      return NextResponse.json(
        { error: "Assistant is not configured (missing API key)." },
        { status: 503 },
      );
    }

    const auth = await requireAuthContext();

    try {
      if (
        !(await rateLimit(
          buildRateLimitKey("ai-calendar-assistant", request.headers, auth),
          12,
          60_000,
        ))
      ) {
        return NextResponse.json(
          { error: "Too many requests. Please wait a moment." },
          { status: 429 },
        );
      }
    } catch (error) {
      if (error instanceof RateLimitUnavailableError) {
        return NextResponse.json({ error: "Rate limit unavailable" }, { status: 503 });
      }
      throw error;
    }

    const body = await request.json();
    const locationId = typeof body.locationId === "string" ? body.locationId : "";
    if (!locationId) {
      return NextResponse.json({ error: "locationId is required" }, { status: 400 });
    }

    const deleteConfirmToken =
      typeof body.deleteConfirmToken === "string" ? body.deleteConfirmToken.trim() : "";
    if (deleteConfirmToken) {
      try {
        if (
          !(await rateLimit(
            buildRateLimitKey("ai-calendar-assistant-delete", request.headers, auth),
            2,
            60_000,
          ))
        ) {
          return NextResponse.json(
            { error: "Too many delete confirmations. Please wait a moment." },
            { status: 429 },
          );
        }
      } catch (error) {
        if (error instanceof RateLimitUnavailableError) {
          return NextResponse.json({ error: "Rate limit unavailable" }, { status: 503 });
        }
        throw error;
      }
      return executeConfirmedDelete(auth, locationId, deleteConfirmToken);
    }

    const rawMessages = Array.isArray(body.messages) ? body.messages : [];
    const messages: ChatMsg[] = rawMessages
      .filter(
        (m: unknown): m is ChatMsg =>
          !!m &&
          typeof m === "object" &&
          ((m as ChatMsg).role === "user" || (m as ChatMsg).role === "assistant") &&
          typeof (m as ChatMsg).content === "string" &&
          (m as ChatMsg).content.trim().length > 0,
      )
      .slice(-20)
      .map((m: ChatMsg) => ({ role: m.role, content: m.content.trim().slice(0, 4000) }));

    if (messages.length === 0 || messages[messages.length - 1]?.role !== "user") {
      return NextResponse.json({ error: "Send a user message." }, { status: 400 });
    }

    const access = await withTenantDb(auth, async (tx) =>
      resolveAccess(auth.userId, locationId, tx),
    );
    if (!access.hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const canProposeDelete = roleAtLeast(access.role, "LOCATION_EDITOR");
    const toolSummaries: string[] = [];
    let pendingDelete:
      | { token: string; count: number; summary: string }
      | undefined;

    const result = await generateText({
      model: anthropic("claude-sonnet-4-6"),
      system: SYSTEM,
      messages,
      maxOutputTokens: 1024,
      stopWhen: stepCountIs(6),
      tools: {
        listScheduledPosts: tool({
          description:
            "List unpublished posts for this location. Prefer scope queued for cron-queued posts.",
          inputSchema: z.object({
            scope: z
              .enum(["queued", "all_unpublished"])
              .default("queued")
              .describe(
                "queued = approved (cron queue); all_unpublished includes drafts/failed too",
              ),
          }),
          execute: async ({ scope }) => {
            const statuses: DraftStatus[] =
              scope === "all_unpublished" ? UNPUBLISHED_STATUSES : QUEUED_STATUSES;
            const summary = await withTenantDb(auth, async (tx) => {
              const posts = await tx.scheduledPost.findMany({
                where: {
                  organizationId: auth.tenantId,
                  locationId,
                  status: { in: statuses },
                },
                orderBy: { scheduledFor: "asc" },
                take: MAX_DELETE,
                select: {
                  id: true,
                  status: true,
                  scheduledFor: true,
                  copy: true,
                  platforms: true,
                },
              });
              const byStatus: Record<string, number> = {};
              for (const p of posts) {
                byStatus[p.status] = (byStatus[p.status] || 0) + 1;
              }
              return {
                count: posts.length,
                byStatus,
                cappedAt: MAX_DELETE,
                posts: posts.map((p) => ({
                  id: p.id,
                  status: p.status,
                  scheduledFor: p.scheduledFor?.toISOString() ?? null,
                  caption: (p.copy || "").slice(0, 80),
                  platforms: p.platforms,
                })),
              };
            });
            toolSummaries.push(`Found ${summary.count} ${scope} post(s).`);
            return summary;
          },
        }),
        proposeDeleteScheduledPosts: tool({
          description:
            "Propose deleting unpublished posts. Does NOT delete — returns a pending confirmation for the UI. Never claim deletion succeeded.",
          inputSchema: z.object({
            scope: z
              .enum(["queued", "all_unpublished", "ids"])
              .describe("queued = approved only; ids = only provided ids"),
            ids: z
              .array(z.string())
              .optional()
              .describe("Required when scope is ids"),
          }),
          execute: async ({ scope, ids }) => {
            if (!canProposeDelete) {
              return {
                needsConfirm: false,
                error: "You need editor access to delete posts.",
              };
            }

            if (scope === "ids" && !ids?.length) {
              return { needsConfirm: false, error: "ids required when scope is ids" };
            }

            const proposal = await withTenantDb(auth, async (tx) => {
              const where: Prisma.ScheduledPostWhereInput = {
                organizationId: auth.tenantId,
                locationId,
                status: {
                  in: scope === "queued" ? QUEUED_STATUSES : UNPUBLISHED_STATUSES,
                },
                ...(scope === "ids"
                  ? { id: { in: (ids ?? []).slice(0, MAX_DELETE) } }
                  : {}),
              };

              const targets = await tx.scheduledPost.findMany({
                where,
                take: MAX_DELETE + 1,
                orderBy: { scheduledFor: "asc" },
                select: {
                  id: true,
                  status: true,
                  scheduledFor: true,
                  copy: true,
                },
              });

              if (targets.length > MAX_DELETE) {
                return {
                  error: `Too many posts (over ${MAX_DELETE}). Narrow the request or delete in batches.`,
                };
              }

              return { targets };
            });

            if ("error" in proposal && proposal.error) {
              toolSummaries.push(proposal.error);
              return { needsConfirm: false, error: proposal.error };
            }

            const targets = proposal.targets ?? [];
            if (targets.length === 0) {
              toolSummaries.push("No matching posts to delete.");
              return { needsConfirm: false, count: 0 };
            }

            prunePending();
            const token = randomUUID();
            const sample = targets
              .slice(0, 5)
              .map((p) => (p.copy || "(no caption)").slice(0, 40))
              .join("; ");
            const summary = `${targets.length} post(s): ${sample}${
              targets.length > 5 ? "…" : ""
            }`;

            pendingDeletes.set(token, {
              token,
              tenantId: auth.tenantId,
              locationId,
              userId: auth.userId,
              ids: targets.map((t) => t.id),
              summary,
              expiresAt: Date.now() + PENDING_TTL_MS,
            });

            pendingDelete = {
              token,
              count: targets.length,
              summary,
            };
            toolSummaries.push(
              `Proposed delete of ${targets.length} post(s) — waiting for UI confirm.`,
            );

            return {
              needsConfirm: true,
              count: targets.length,
              summary,
              note: "A confirm button will appear in the UI. Do not claim posts were deleted yet.",
            };
          },
        }),
      },
    });

    return NextResponse.json({
      message:
        result.text?.trim() ||
        (pendingDelete
          ? `I found ${pendingDelete.count} post(s) to remove. Confirm below to delete them.`
          : "Done."),
      postsChanged: false,
      toolSummaries,
      ...(pendingDelete ? { pendingDelete } : {}),
    });
  } catch (error) {
    return handleRouteError("api.ai.calendar-assistant.POST", error);
  }
}
