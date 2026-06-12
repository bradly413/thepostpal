import { NextRequest, NextResponse } from "next/server";
import { withTenantDb } from "@/lib/db";
import { requireAuthContext } from "@/lib/api-auth";
import { resolveAccess } from "@/lib/authz";
import { handleRouteError } from "@/lib/route-errors";
import { isSafeMediaUrl } from "@/lib/safe-media-url";

interface Params {
  params: Promise<{ id: string }>;
}

const VALID_STATUSES = new Set([
  "draft",
  "needs_review",
  "approved",
  "scheduled",
  "published",
  "skipped",
  "needs_revision",
  "failed",
]);

const VALID_MEDIA_TYPES = new Set(["image", "video"]);

export async function GET(_: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const auth = await requireAuthContext();
    return await withTenantDb(auth, async (tx) => {
      const post = await tx.scheduledPost.findFirst({
        where: { id, organizationId: auth.tenantId },
      });

      if (!post) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }

      if (post.locationId) {
        const access = await resolveAccess(auth.userId, post.locationId, tx);
        if (!access.hasAccess) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }

      return NextResponse.json({ post });
    });
  } catch (error) {
    return handleRouteError("api.posts.id.GET", error, { extra: { postId: id } });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const auth = await requireAuthContext();
    return await withTenantDb(auth, async (tx) => {
      const post = await tx.scheduledPost.findFirst({
        where: { id, organizationId: auth.tenantId },
      });

      if (!post) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }

      if (!post.locationId) {
        return NextResponse.json({ error: "Post location is required" }, { status: 400 });
      }

      const access = await resolveAccess(auth.userId, post.locationId, tx);
      if (!access.hasAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const body = await request.json();
      const nextStatus =
        typeof body.status === "string" && VALID_STATUSES.has(body.status)
          ? body.status
          : undefined;

      const updated = await tx.scheduledPost.update({
        where: { id: post.id },
        data: {
          copy: typeof body.copy === "string" ? body.copy : undefined,
          platforms: Array.isArray(body.platforms) ? body.platforms : undefined,
          scheduledFor:
            body.scheduledFor === null
              ? null
              : body.scheduledFor
                ? new Date(body.scheduledFor)
                : undefined,
          templateId:
            body.templateId === null
              ? null
              : typeof body.templateId === "string"
                ? body.templateId
                : undefined,
          pillar:
            body.pillar === null
              ? null
              : typeof body.pillar === "string"
                ? body.pillar
                : undefined,
          note: typeof body.note === "string" ? body.note : undefined,
          reviewerNotes:
            body.reviewerNotes === null
              ? null
              : typeof body.reviewerNotes === "string"
                ? body.reviewerNotes
                : undefined,
          status: nextStatus,
          mediaUrl:
            "mediaUrl" in body && body.mediaUrl === null
              ? null
              : typeof body.mediaUrl === "string" && isSafeMediaUrl(body.mediaUrl)
                ? body.mediaUrl
                : undefined,
          mediaUrls: Array.isArray(body.mediaUrls)
            ? body.mediaUrls.filter(
                (url: unknown): url is string => typeof url === "string" && isSafeMediaUrl(url),
              )
            : body.mediaUrls === null
              ? null
              : undefined,
          mediaType:
            body.mediaType === null
              ? null
              : typeof body.mediaType === "string" && VALID_MEDIA_TYPES.has(body.mediaType)
                ? body.mediaType
                : undefined,
        },
      });

      return NextResponse.json({ post: updated });
    });
  } catch (error) {
    return handleRouteError("api.posts.id.PUT", error, { extra: { postId: id } });
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const auth = await requireAuthContext();
    return await withTenantDb(auth, async (tx) => {
      const post = await tx.scheduledPost.findFirst({
        where: { id, organizationId: auth.tenantId },
      });

      if (!post) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }

      if (post.locationId) {
        const access = await resolveAccess(auth.userId, post.locationId, tx);
        if (!access.hasAccess) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }

      await tx.scheduledPost.delete({ where: { id: post.id } });

      return NextResponse.json({ success: true });
    });
  } catch (error) {
    return handleRouteError("api.posts.id.DELETE", error, { extra: { postId: id } });
  }
}
