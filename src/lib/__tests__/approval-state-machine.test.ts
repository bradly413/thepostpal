import { describe, expect, it } from "vitest";
import { applyApprovalTransition, type ApprovalSnapshot } from "@/lib/approval-state-machine";

function baseState(overrides: Partial<ApprovalSnapshot> = {}): ApprovalSnapshot {
  return {
    status: "PENDING_REVIEW",
    submitterUserId: "user-submit",
    reviewerUserIds: ["user-reviewer-a", "user-reviewer-b"],
    minApprovers: 1,
    approverIds: [],
    submittedAt: new Date("2026-05-20T00:00:00.000Z"),
    autoApproveAfterMs: null,
    ...overrides,
  };
}

describe("approval state machine", () => {
  it("approves when reviewer acts and minApprovers=1", () => {
    const result = applyApprovalTransition(baseState(), {
      type: "approve",
      actorUserId: "user-reviewer-a",
    });
    expect(result.accepted).toBe(true);
    expect(result.status).toBe("APPROVED");
  });

  it("requires multiple independent approvals when minApprovers>1", () => {
    const first = applyApprovalTransition(
      baseState({ minApprovers: 2 }),
      { type: "approve", actorUserId: "user-reviewer-a" },
    );
    expect(first.accepted).toBe(true);
    expect(first.status).toBe("PENDING_REVIEW");
    expect(first.approverIds).toEqual(["user-reviewer-a"]);

    const second = applyApprovalTransition(
      baseState({ minApprovers: 2, approverIds: first.approverIds }),
      { type: "approve", actorUserId: "user-reviewer-b" },
    );
    expect(second.accepted).toBe(true);
    expect(second.status).toBe("APPROVED");
  });

  it("moves to changes requested", () => {
    const result = applyApprovalTransition(baseState(), {
      type: "request_changes",
      actorUserId: "user-reviewer-a",
    });
    expect(result.accepted).toBe(true);
    expect(result.status).toBe("CHANGES_REQUESTED");
  });

  it("moves to rejected", () => {
    const result = applyApprovalTransition(baseState(), {
      type: "reject",
      actorUserId: "user-reviewer-a",
    });
    expect(result.accepted).toBe(true);
    expect(result.status).toBe("REJECTED");
  });

  it("auto-approves after configured window", () => {
    const result = applyApprovalTransition(
      baseState({ autoApproveAfterMs: 60_000 }),
      {
        type: "auto_approve",
        at: new Date("2026-05-20T00:02:00.000Z"),
      },
    );
    expect(result.accepted).toBe(true);
    expect(result.status).toBe("APPROVED");
  });

  it("allows submitter withdrawal from pending review", () => {
    const result = applyApprovalTransition(baseState(), {
      type: "withdraw",
      actorUserId: "user-submit",
    });
    expect(result.accepted).toBe(true);
    expect(result.status).toBe("CHANGES_REQUESTED");
  });
});
