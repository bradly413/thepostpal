"use client";

import { useState } from "react";

// "Teach Posterboy your voice" — paste real owned writing (website copy, a
// newsletter, listing descriptions, a few real posts) and the extractor folds
// the authentic voice + topics into the brand book. The cold-start sharpener:
// even a thin onboarding profile gets real, grounded voice from one paste.

interface Learned {
  phrases: number;
  avoid: number;
  topics: number;
  tone: string[];
  hero: string;
}

export default function LearnVoiceFromDocs({
  locationId,
  onLearned,
}: {
  locationId: string | null;
  onLearned?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [learned, setLearned] = useState<Learned | null>(null);

  async function submit() {
    if (!locationId || busy || text.trim().length < 40) return;
    setBusy(true);
    setError(null);
    setLearned(null);
    try {
      const res = await fetch("/api/voice/ingest-docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId, text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't read your voice. Try more text.");
      setLearned(data.learned as Learned);
      setText("");
      // NOTE: don't reload here — reload() remounts this panel and wipes the
      // "here's what we learned" summary before the user can read it. Reload on
      // Done instead, so the brand doc refreshes after they acknowledge.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read your voice. Try more text.");
    } finally {
      setBusy(false);
    }
  }

  const btn: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    border: "1px solid rgba(238,37,50,0.3)",
    background: "rgba(238,37,50,0.06)",
    color: "#c41e2a",
    cursor: "pointer",
  };

  if (!open) {
    return (
      <button type="button" style={btn} onClick={() => setOpen(true)} className="brand-print-hide">
        Teach Posterboy your voice
      </button>
    );
  }

  return (
    <div
      className="brand-print-hide"
      style={{
        width: "min(440px, 90vw)",
        padding: 16,
        borderRadius: 16,
        background: "rgba(255,255,255,0.97)",
        border: "1px solid rgba(0,0,0,0.08)",
        boxShadow: "0 24px 60px -22px rgba(20,20,40,0.45)",
        textAlign: "left",
      }}
    >
      <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: "#1c1c1e" }}>
        Teach Posterboy your voice
      </p>
      <p style={{ margin: "0 0 10px", fontSize: 12.5, color: "#76767e", lineHeight: 1.45 }}>
        Paste your website copy, a newsletter, listing descriptions, or a few real posts. Posterboy
        learns how you actually write — and every draft after this sounds more like you.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder={"Paste real writing here — the more, the sharper."}
        style={{
          width: "100%",
          resize: "vertical",
          borderRadius: 10,
          border: "1px solid rgba(0,0,0,0.12)",
          padding: "10px 12px",
          fontSize: 13.5,
          lineHeight: 1.5,
          color: "#1c1c1e",
          background: "#fff",
        }}
      />
      {error ? (
        <p style={{ margin: "8px 0 0", fontSize: 12.5, color: "#c41e2a" }} role="alert">
          {error}
        </p>
      ) : null}
      {learned ? (
        <div
          role="status"
          style={{ margin: "10px 0 0", fontSize: 12.5, color: "#1f7a3d", lineHeight: 1.5 }}
        >
          Learned your voice — added {learned.phrases} signature phrase
          {learned.phrases === 1 ? "" : "s"}
          {learned.topics > 0 ? `, ${learned.topics} topic${learned.topics === 1 ? "" : "s"}` : ""}.
          {learned.tone?.length ? (
            <>
              {" "}
              Reads as <strong>{learned.tone.slice(0, 3).join(", ")}</strong>.
            </>
          ) : null}
        </div>
      ) : null}
      <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={() => {
            const didLearn = !!learned;
            setOpen(false);
            setError(null);
            setLearned(null);
            // Refresh the brand doc only after the user is done reading the result.
            if (didLearn) onLearned?.();
          }}
          style={{ ...btn, border: "0", background: "transparent", color: "#76767e" }}
        >
          {learned ? "Done" : "Cancel"}
        </button>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy || text.trim().length < 40}
          style={{
            ...btn,
            border: "1px solid #c81e2a",
            background: "#c81e2a",
            color: "#fff",
            opacity: busy || text.trim().length < 40 ? 0.5 : 1,
            cursor: busy || text.trim().length < 40 ? "not-allowed" : "pointer",
          }}
        >
          {busy ? "Reading your voice…" : "Learn my voice"}
        </button>
      </div>
    </div>
  );
}
