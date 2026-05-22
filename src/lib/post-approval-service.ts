import { ApprovalAction, ApprovalStatus } from "@prisma/client";
import { db } from "@/lib/db";
import {
  applyApprovalTransition,
  ApprovalSnapshot,
  type ApprovalTransition,
} from "@/lib/approval-state-machine";

export async function loadApprovalByScheduledPostId(
  scheduledPostId: string,
  organizationId: string,
) {
  return db.postApproval.findFirst({
    where: {
      scheduledPostId,
      scheduledPost: { organizationId },
    },
    include: {
      history: true,
      scheduledPost: true,
      location: {
        include: {
          approvalRule: true,
        },
      },
    },
  });
}

function toAction(transition: ApprovalTransition): ApprovalAction {
  switch (transition.type) {
    case "approve":
      return "APPROVED";
    case "request_changes":
      return "CHANGES_REQUESTED";
    case "reject":
      return "REJECTED";
    case "resubmit":
      return "RESUBMITTED";
    case "withdraw":
      return "WITHDRAWN";
    case "auto_approve":
      return "AUTO_APPROVED";
    default:
      return "SUBMITTED";
  }
}

function toDraftStatus(status: ApprovalStatus) {
  if (status === "APPROVED") return "approved";
  if (status === "CHANGES_REQUESTED") return "needs_revision";
  if (status === "REJECTED") return "skipped";
  return "needs_review";
}

export async function applyAndPersistTransition(
  postApprovalId: string,
  actorUserId: string,
  transition: ApprovalTransition,
) {
  const current = await db.postApproval.findUnique({
    where: { id: postApprovalId },
    include: {
      location: { include: { approvalRule: true } },
      history: true,
      scheduledPost: true,
    },
  });

  if (!current) return { ok: false as const, reason: "not-found" };

  const approverIds = Array.from(
    new Set(
      current.history
        .filter((h) => h.action === "APPROVED")
        .map((h) => h.actorUserId),
    ),
  );

  const snapshot: ApprovalSnapshot = {
    status: current.status,
    submitterUserId: current.submittedByUserId,
    reviewerUserIds: current.location.approvalRule?.reviewerUserIds ?? [],
    minApprovers: current.location.approvalRule?.minApprovers ?? 1,
    approverIds,
    submittedAt: current.createdAt,
    autoApproveAfterMs: current.location.approvalRule?.autoApproveAfterMs ?? null,
  };

  const result = applyApprovalTransition(snapshot, transition);
  if (!result.accepted) {
    return { ok: false as const, reason: result.reason ?? "rejected-transition" };
  }

  const updated = await db.postApproval.update({
    where: { id: current.id },
    data: {
      status: result.status,
      reviewedByUserId: actorUserId,
      reviewedAt: new Date(),
    },
  });

  await db.approvalEvent.create({
    data: {
      postApprovalId: current.id,
      actorUserId,
      action: toAction(transition),
    },
  });

  await db.scheduledPost.update({
    where: { id: current.scheduledPostId },
    data: {
      status: toDraftStatus(updated.status),
    },
  });

  return { ok: true as const, approval: updated };
}

