"use client";

import { useState } from "react";

// Voice calibration loop: the assistant writes sample captions in the user's
// voice; the user taps ✓ / ✗ on each (no typing). Approved captions become the
// exemplar bank that sharpens future generation. This is the "does this sound
// like you?" step of the automated onboarding assistant.

interface Voice {
  tone: string;
  pillars: string[];
  weSay: string[];
  weDontSay: string[];
}

export default function VoiceCalibration({
  voice,
  locationId,
  onSaved,
}: {
  voice: Voice;
  locationId?: string;
  /** Called with the approved captions when the user saves — lets onboarding
   *  fold them into the brand-book generation as voice samples. */
  onSaved?: (approved: string[]) => void;
}) {
  const [captions, setCaptions] = useState<string[]>([]);
  const [choice, setChoice] = useState<Record<number, "yes" | "no">>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    setSaved(null);
    setChoice({});
    try {
      const res = await fetch("/api/brand-dna/calibrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice, count: 5 }),
      });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.captions)) throw new Error(data.error || "Couldn't generate samples");
      setCaptions(data.captions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    const approved = captions.filter((_, i) => choice[i] === "yes");
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/brand-dna/calibrate/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved, locationId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't save");
      setSaved(approved.length);
      onSaved?.(approved);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  const allRated = captions.length > 0 && captions.every((_, i) => choice[i]);

  return (
    <div className="pb-panel" data-testid="voice-calibration">
      <h2 className="pb-panel-h">Does this sound like you?</h2>
      <p className="pb-press-text" style={{ opacity: 0.7, marginTop: 4 }}>
        We wrote a few posts in your voice. Tap the ones that sound like you — that&apos;s how we
        learn. No typing.
      </p>

      {captions.length === 0 ? (
        <button
          type="button"
          className="pb-btn-primary"
          disabled={loading}
          onClick={generate}
          style={{ marginTop: 16 }}
        >
          {loading ? "Writing in your voice…" : "Show me sample posts"}
        </button>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
            {captions.map((c, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: 14,
                  padding: "12px 14px",
                  background:
                    choice[i] === "yes"
                      ? "rgba(31,157,77,0.08)"
                      : choice[i] === "no"
                        ? "rgba(200,30,42,0.06)"
                        : "rgba(255,255,255,0.6)",
                }}
              >
                <span className="pb-press-text" style={{ flex: 1, fontSize: 14, color: "#1c1c1e" }}>{c}</span>
                <button
                  type="button"
                  aria-label="Sounds like me"
                  onClick={() => setChoice((p) => ({ ...p, [i]: "yes" }))}
                  style={{
                    border: "none", borderRadius: 999, width: 38, height: 38, cursor: "pointer",
                    background: choice[i] === "yes" ? "#1f9d4d" : "rgba(0,0,0,0.05)",
                    color: choice[i] === "yes" ? "#fff" : "#1c1c1e", fontSize: 16,
                  }}
                >
                  ✓
                </button>
                <button
                  type="button"
                  aria-label="Not me"
                  onClick={() => setChoice((p) => ({ ...p, [i]: "no" }))}
                  style={{
                    border: "none", borderRadius: 999, width: 38, height: 38, cursor: "pointer",
                    background: choice[i] === "no" ? "#c81e2a" : "rgba(0,0,0,0.05)",
                    color: choice[i] === "no" ? "#fff" : "#1c1c1e", fontSize: 16,
                  }}
                >
                  ✗
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 16, alignItems: "center" }}>
            <button type="button" className="pb-btn-secondary" disabled={loading} onClick={generate}>
              {loading ? "…" : "Show different ones"}
            </button>
            <button
              type="button"
              className="pb-btn-primary"
              disabled={saving || !allRated}
              onClick={save}
              style={{ opacity: !allRated || saving ? 0.5 : 1 }}
            >
              {saving ? "Saving…" : "Save my voice"}
            </button>
          </div>
          {!allRated && (
            <p className="pb-press-text" style={{ opacity: 0.5, fontSize: 12, marginTop: 8 }}>
              Rate each one to continue.
            </p>
          )}
        </>
      )}

      {saved !== null && (
        <p className="pb-press-text" style={{ color: "#1f9d4d", marginTop: 12 }} role="status">
          Saved — {saved} post{saved === 1 ? "" : "s"}{" "}added to your voice. We&apos;ll write more like those.
        </p>
      )}
      {error && (
        <p className="pb-press-text" style={{ color: "#c81e2a", marginTop: 12 }} role="alert">{error}</p>
      )}
    </div>
  );
}
