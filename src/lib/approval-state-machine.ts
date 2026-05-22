import { ApprovalStatus } from "@prisma/client";

export interface ApprovalSnapshot {
  status: ApprovalStatus;
  submitterUserId: string;
  reviewerUserIds: string[];
  minApprovers: number;
  approverIds: string[];
  submittedAt: Date;
  autoApproveAfterMs: number | null;
}

export type ApprovalTransition =
  | { type: "approve"; actorUserId: string; at?: Date }
  | { type: "request_changes"; actorUserId: string; at?: Date }
  | { type: "reject"; actorUserId: string; at?: Date }
  | { type: "withdraw"; actorUserId: string; at?: Date }
  | { type: "resubmit"; actorUserId: string; at?: Date }
  | { type: "auto_approve"; at?: Date };

export interface TransitionResult {
  status: ApprovalStatus;
  approverIds: string[];
  accepted: boolean;
  reason?: string;
}

function isReviewer(state: ApprovalSnapshot, actorUserId: string): boolean {
  return state.reviewerUserIds.includes(actorUserId);
}

export function applyApprovalTransition(
  state: ApprovalSnapshot,
  transition: ApprovalTransition,
): TransitionResult {
  const at = transition.at ?? new Date();

  if (transition.type === "withdraw") {
    if (state.status !== "PENDING_REVIEW") {
      return { status: state.status, approverIds: state.approverIds, accepted: false, reason: "not-pending" };
    }
    if (transition.actorUserId !== state.submitterUserId) {
      return { status: state.status, approverIds: state.approverIds, accepted: false, reason: "only-submitter" };
    }
    return { status: "CHANGES_REQUESTED", approverIds: [], accepted: true };
  }

  if (transition.type === "resubmit") {
    if (state.status !== "CHANGES_REQUESTED") {
      return { status: state.status, approverIds: state.approverIds, accepted: false, reason: "not-changes-requested" };
    }
    if (transition.actorUserId !== state.submitterUserId) {
      return { status: state.status, approverIds: state.approverIds, accepted: false, reason: "only-submitter" };
    }
    return { status: "PENDING_REVIEW", approverIds: [], accepted: true };
  }

  if (state.status !== "PENDING_REVIEW") {
    return { status: state.status, approverIds: state.approverIds, accepted: false, reason: "not-pending" };
  }

  if (transition.type === "auto_approve") {
    if (!state.autoApproveAfterMs) {
      return { status: state.status, approverIds: state.approverIds, accepted: false, reason: "auto-approve-disabled" };
    }
    const elapsed = at.getTime() - state.submittedAt.getTime();
    if (elapsed < state.autoApproveAfterMs) {
      return { status: state.status, approverIds: state.approverIds, accepted: false, reason: "window-not-reached" };
    }
    return { status: "APPROVED", approverIds: state.approverIds, accepted: true };
  }

  if (!isReviewer(state, transition.actorUserId)) {
    return { status: state.status, approverIds: state.approverIds, accepted: false, reason: "reviewer-only" };
  }

  if (transition.type === "request_changes") {
    return { status: "CHANGES_REQUESTED", approverIds: [], accepted: true };
  }

  if (transition.type === "reject") {
    return { status: "REJECTED", approverIds: state.approverIds, accepted: true };
  }

  if (transition.type === "approve") {
    const approverIds = state.approverIds.includes(transition.actorUserId)
      ? state.approverIds
      : [...state.approverIds, transition.actorUserId];

    if (approverIds.length >= Math.max(1, state.minApprovers)) {
      return { status: "APPROVED", approverIds, accepted: true };
    }
    return { status: "PENDING_REVIEW", approverIds, accepted: true };
  }

  return { status: state.status, approverIds: state.approverIds, accepted: false, reason: "unsupported-transition" };
}

