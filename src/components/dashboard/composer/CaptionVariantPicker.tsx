"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import {
  type CaptionCompliance,
  isComplianceBlock,
} from "@/lib/compliance/client-types";
import {
  COMPLIANCE_BLOCK_DEFAULT_MESSAGE,
  complianceFlagLabel,
} from "@/lib/compliance/compliance-ui";
import {
  createDashboardPost,
  DashboardApiError,
  submitDashboardPost,
  updateDashboardPost,
} from "@/lib/dashboard-api";
import { socialPlatformsFromComposerId, type SocialPlatform } from "@/lib/posterboy-types";

export interface CaptionVariant {
  angle: string;
  caption: string;
  hashtags: string[];
}

interface Props {
  brief: string;
  platform: string;
  onSelect: (variant: CaptionVariant) => void;
  disabled?: boolean;
  /** Command-tier approval pipeline — enables "Send for review" on block. */
  approvalPipeline?: boolean;
  locationId?: string | null;
  platforms?: SocialPlatform[];
  /** Bump this to trigger generation externally (e.g. from the prompt bar). */
  runSignal?: number;
  /** Hide the built-in "Generate options" button (when driven externally). */
  hideTrigger?: boolean;
}

export default function CaptionVariantPicker({
  brief,
  platform,
  onSelect,
  disabled,
  approvalPipeline,
  locationId,
  platforms,
  runSignal,
  hideTrigger,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [variants, setVariants] = useState<CaptionVariant[]>([]);
  const [compliance, setCompliance] = useState<CaptionCompliance | null>(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSent, setReviewSent] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  async function generate() {
    const trimmed = brief.trim();
    if (!trimmed) {
      setError("Add a brief or prompt first.");
      return;
    }
    setLoading(true);
    setError(null);
    setReviewError(null);
    setReviewSent(false);
    setVariants([]);
    setCompliance(null);
    try {
      const res = await fetch("/api/ai/captions", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: trimmed, platform, count: 3 }),
      });
      const data = (await res.json()) as {
        variants?: CaptionVariant[];
        compliance?: CaptionCompliance;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error || "Could not generate options. Try again.");
        return;
      }
      if (isComplianceBlock(data.compliance)) {
        setCompliance(data.compliance);
        setVariants([]);
        return;
      }
      if (!data.variants?.length) {
        setError(data.error || "Could not generate options. Try again.");
        return;
      }
      setCompliance(data.compliance ?? null);
      setVariants(data.variants);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function sendForComplianceReview() {
    if (!approvalPipeline || !locationId || !isComplianceBlock(compliance)) return;
    const trimmed = brief.trim();
    if (!trimmed) return;

    setReviewSubmitting(true);
    setReviewError(null);
    try {
      const post = await createDashboardPost({
        locationId,
        copy: trimmed,
        platforms: platforms ?? socialPlatformsFromComposerId(platform),
        status: "draft",
      });
      const flagged = compliance.flaggedPhrases?.length
        ? `Flagged: ${compliance.flaggedPhrases.join(", ")}`
        : compliance.message;
      await updateDashboardPost(post.id, {
        note: "Compliance review",
        reviewerNotes: flagged,
      });
      await submitDashboardPost(post.id);
      setReviewSent(true);
      router.push("/dashboard/drafts");
    } catch (err) {
      setReviewError(
        err instanceof DashboardApiError
          ? err.message
          : "Could not send for review. Try again.",
      );
    } finally {
      setReviewSubmitting(false);
    }
  }

  const warnFlags =
    compliance && !isComplianceBlock(compliance) && compliance.flags?.length
      ? new Map(compliance.flags.map((f) => [f.variantIndex, f]))
      : null;

  // externally-driven generation (e.g. the studio prompt bar after the image is ready).
  // lastRunRef guards the double-fetch from React StrictMode's dev mount/remount —
  // the panel mounts with runSignal already > 0, so the mount effect runs twice.
  const lastRunRef = useRef(0);
  useEffect(() => {
    if (!runSignal || runSignal <= lastRunRef.current) return;
    lastRunRef.current = runSignal;
    void generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runSignal]);

  return (
    <div className="pb-caption-variants">
      {hideTrigger ? (
        loading ? <p className="pb-caption-variants-loading">Writing caption options…</p> : null
      ) : (
        <button
          type="button"
          className="pb-caption-variants-trigger"
          onClick={() => void generate()}
          disabled={disabled || loading}
        >
          <Sparkles size={14} />
          {loading ? "Generating…" : "Generate options"}
        </button>
      )}

      {error ? <p className="pb-caption-variants-error">{error}</p> : null}

      {isComplianceBlock(compliance) ? (
        <div className="pb-caption-compliance-block" role="status">
          <p className="pb-caption-compliance-block-text">
            {compliance.message || COMPLIANCE_BLOCK_DEFAULT_MESSAGE}
          </p>
          {approvalPipeline && locationId ? (
            <div className="pb-caption-compliance-actions">
              <button
                type="button"
                className="pb-caption-compliance-cta"
                disabled={reviewSubmitting || reviewSent}
                onClick={() => void sendForComplianceReview()}
              >
                {reviewSubmitting
                  ? "Sending…"
                  : reviewSent
                    ? "Sent for review"
                    : "Send for review"}
              </button>
              <span className="pb-caption-compliance-label">Compliance review</span>
            </div>
          ) : null}
          {reviewError ? (
            <p className="pb-caption-variants-error">{reviewError}</p>
          ) : null}
        </div>
      ) : null}

      {variants.length > 0 ? (
        <div className="pb-caption-variants-list">
          {variants.map((v, i) => {
            const flag = warnFlags?.get(i);
            return (
              <button
                key={`${v.angle}-${i}`}
                type="button"
                className="pb-caption-variant-card"
                onClick={() => onSelect(v)}
              >
                <span className="pb-caption-variant-angle">{v.angle}</span>
                <p className="pb-caption-variant-text">{v.caption}</p>
                {flag ? (
                  <p className="pb-caption-variant-flag">
                    {complianceFlagLabel(
                      !isComplianceBlock(compliance) ? compliance?.regulatoryBody : undefined,
                      flag.phrases,
                    )}
                  </p>
                ) : null}
                {v.hashtags.length > 0 ? (
                  <p className="pb-caption-variant-tags">{v.hashtags.join(" ")}</p>
                ) : null}
                <span className="pb-caption-variant-use">Use this</span>
              </button>
            );
          })}
        </div>
      ) : null}

      <style>{`
        .pb-caption-variants { display: flex; flex-direction: column; gap: 8px; }
        .pb-caption-variants-trigger {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 7px 12px; border-radius: 10px; font-size: var(--text-caption); font-weight: 600;
          border: 1px solid rgba(238,37,50,0.25); background: rgba(238,37,50,0.06);
          color: #c41e2a; cursor: pointer; transition: var(--transition-color);
        }
        .pb-caption-variants-trigger:hover:not(:disabled) { background: rgba(238,37,50,0.12); }
        .pb-caption-variants-trigger:disabled { opacity: 0.5; cursor: not-allowed; }
        .pb-caption-variants-error { font-size: var(--text-label); color: #c41e2a; margin: 0; }
        .pb-caption-variants-loading { font-size: var(--text-caption); color: #76767e; margin: 0; }
        .pb-caption-compliance-block {
          padding: 10px 12px; border-radius: 12px;
          border: 1px solid rgba(200,140,40,0.35); background: rgba(200,140,40,0.08);
        }
        .pb-caption-compliance-block-text {
          font-size: var(--text-caption); line-height: var(--leading-body); margin: 0; color: rgba(22,22,28,0.82);
        }
        .pb-caption-compliance-actions {
          display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 8px;
        }
        .pb-caption-compliance-cta {
          padding: 6px 10px; border-radius: 8px; font-size: var(--text-label); font-weight: 600;
          border: 1px solid rgba(238,37,50,0.35); background: rgba(238,37,50,0.08);
          color: #c41e2a; cursor: pointer;
        }
        .pb-caption-compliance-cta:disabled { opacity: 0.55; cursor: not-allowed; }
        .pb-caption-compliance-label {
          font-size: var(--text-eyebrow); font-weight: 700; text-transform: uppercase;
          letter-spacing: var(--tracking-label); color: rgba(22,22,28,0.62);
        }
        .pb-caption-variants-list { display: flex; flex-direction: column; gap: 8px; max-height: 220px; overflow-y: auto; }
        .pb-caption-variant-card {
          text-align: left; padding: 10px 12px; border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.08); background: rgba(255,255,255,0.92);
          cursor: pointer; transition: border-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard);
        }
        .pb-caption-variant-card:hover {
          border-color: rgba(238,37,50,0.35);
          box-shadow: 0 4px 14px rgba(238,37,50,0.08);
        }
        .pb-caption-variant-angle {
          display: block; font-size: var(--text-eyebrow); font-weight: 700; text-transform: uppercase;
          letter-spacing: var(--tracking-label); color: rgba(22,22,28,0.62); margin-bottom: 4px;
        }
        .pb-caption-variant-text { font-size: var(--text-caption); line-height: var(--leading-body); margin: 0 0 4px; color: rgba(22,22,28,0.88); }
        .pb-caption-variant-flag {
          font-size: var(--text-label); line-height: 1.35; margin: 0 0 4px;
          color: #9a6b12;
        }
        .pb-caption-variant-tags { font-size: var(--text-label); color: #1d6fd6; margin: 0 0 6px; }
        .pb-caption-variant-use { font-size: var(--text-eyebrow); font-weight: 600; color: #c41e2a; }
      `}</style>
    </div>
  );
}
