"use client";

import { useRef, useState } from "react";
import VoiceCalibration from "@/components/brand-dna/VoiceCalibration";

// Brand DNA preview — uploads the user's captions (+ optional post images) to
// POST /api/brand-dna/analyze and renders the resulting profile: brand palette,
// voice fingerprint, signature vocabulary, and (when enrichment is on) the
// model-inferred tone/pillars + visual identity. Reusable: this is the surface
// the onboarding Brand Architect will embed once the flow is wired.

interface PaletteColor {
  hex: string;
  weight: number;
}
interface AnalyzeResult {
  profile: {
    voice: {
      sampleCount: number;
      avgWordsPerCaption: number;
      emojiPer100Words: number;
      hashtagsPerCaption: number;
      lexicalDiversity: number;
    };
    visual: { palette: PaletteColor[]; imageCount: number };
    signatureVocabulary: string[];
    sampleSummary: { captions: number; images: number };
  };
  enrichment?: {
    voice: { tone: string; pillars: string[]; weSay: string[]; weDontSay: string[] } | null;
    visual: { summary: string; subjects: string[]; mood: string[] } | null;
  };
}

export default function BrandDnaPreview() {
  const [captions, setCaptions] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [enrich, setEnrich] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const canSubmit = (captions.trim().length > 0 || files.length > 0) && !loading;

  const analyze = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      if (captions.trim()) form.append("captions", captions);
      for (const f of files) form.append("image", f);
      if (enrich) form.append("enrich", "all");

      const res = await fetch("/api/brand-dna/analyze", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || !data.profile) throw new Error(data.error || "Analysis failed");
      setResult(data as AnalyzeResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-app" style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 760 }}>
      <div className="pb-panel">
        <h1 className="pb-panel-h">Brand DNA preview</h1>
        <p className="pb-press-text" style={{ opacity: 0.7, marginTop: 4 }}>
          Paste a few of your real captions (one per line) and optionally add post images.
          We read your actual voice and palette — no templates.
        </p>

        <label className="pb-label" style={{ marginTop: 16 }}>Your captions</label>
        <textarea
          className="pb-field"
          rows={6}
          placeholder={"fresh fades every day 💈\ncome hungry, leave happy\nmade fresh, every time"}
          value={captions}
          onChange={(e) => setCaptions(e.target.value)}
          style={{ width: "100%", resize: "vertical" }}
        />

        <label className="pb-label" style={{ marginTop: 16 }}>Post images (optional)</label>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          style={{ display: "block", marginTop: 6 }}
        />
        {files.length > 0 && (
          <p className="pb-press-text" style={{ opacity: 0.6, marginTop: 6 }}>{files.length} image(s) selected</p>
        )}

        <label className="pb-row" style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={enrich} onChange={(e) => setEnrich(e.target.checked)} />
          <span className="pb-press-text">Add AI tone &amp; visual analysis (slower)</span>
        </label>

        <button
          type="button"
          className="pb-btn-primary"
          disabled={!canSubmit}
          onClick={analyze}
          style={{ marginTop: 18, opacity: canSubmit ? 1 : 0.5 }}
        >
          {loading ? "Analyzing…" : "Analyze my brand"}
        </button>

        {error && (
          <p className="pb-press-text" style={{ color: "#c81e2a", marginTop: 12 }} role="alert">{error}</p>
        )}
      </div>

      {result && (
        <>
        <div className="pb-panel" data-testid="brand-dna-result">
          <h2 className="pb-panel-h">Your Brand DNA</h2>
          <p className="pb-press-text" style={{ opacity: 0.6 }}>
            From {result.profile.sampleSummary.captions} caption(s) and {result.profile.sampleSummary.images} image(s).
          </p>

          {result.profile.visual.palette.length > 0 && (
            <>
              <div className="pb-label" style={{ marginTop: 16 }}>Palette</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {result.profile.visual.palette.map((c) => (
                  <div key={c.hex} style={{ textAlign: "center" }}>
                    <div style={{ width: 56, height: 56, borderRadius: 12, background: c.hex, border: "1px solid rgba(0,0,0,0.1)" }} />
                    <div className="pb-press-text" style={{ fontSize: 11, marginTop: 4 }}>{c.hex}</div>
                    <div className="pb-press-text" style={{ fontSize: 11, opacity: 0.55 }}>{Math.round(c.weight * 100)}%</div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="pb-label" style={{ marginTop: 16 }}>Voice fingerprint</div>
          <div className="pb-press-text" style={{ fontSize: 13, lineHeight: 1.7 }}>
            ~{result.profile.voice.avgWordsPerCaption} words/post ·{" "}
            {result.profile.voice.emojiPer100Words} emoji/100 words ·{" "}
            {result.profile.voice.hashtagsPerCaption} hashtags/post ·{" "}
            {Math.round(result.profile.voice.lexicalDiversity * 100)}% lexical diversity
          </div>

          {result.profile.signatureVocabulary.length > 0 && (
            <>
              <div className="pb-label" style={{ marginTop: 16 }}>Signature vocabulary</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {result.profile.signatureVocabulary.map((w) => (
                  <span key={w} className="pb-chip-soft">{w}</span>
                ))}
              </div>
            </>
          )}

          {result.enrichment?.voice && (
            <>
              <div className="pb-label" style={{ marginTop: 16 }}>Tone &amp; pillars (AI)</div>
              <div className="pb-press-text" style={{ fontSize: 13 }}>
                <strong>{result.enrichment.voice.tone}</strong> — {result.enrichment.voice.pillars.join(" · ")}
              </div>
            </>
          )}
          {result.enrichment?.visual && (
            <>
              <div className="pb-label" style={{ marginTop: 16 }}>Visual identity (AI)</div>
              <div className="pb-press-text" style={{ fontSize: 13 }}>{result.enrichment.visual.summary}</div>
            </>
          )}
        </div>
        {result.enrichment?.voice && <VoiceCalibration voice={result.enrichment.voice} />}
        </>
      )}
    </div>
  );
}
