"use client";

import { useCallback, useState } from "react";

const PROMPT_LABELS = [
  "Packaging, bags, or boxes",
  "Branded coaster or touchpoint",
  "Staff apparel",
] as const;

export default function CollateralPromptsSection({
  prompts,
}: {
  prompts: string[];
}) {
  if (!prompts?.length) return null;

  return (
    <section
      aria-labelledby="collateral-heading"
      style={{
        marginTop: "clamp(48px, 6vw, 80px)",
        marginBottom: "clamp(48px, 6vw, 80px)",
        padding: "clamp(28px, 4vw, 40px)",
        borderRadius: 24,
        background: "rgba(255, 255, 255, 0.72)",
        backdropFilter: "blur(22px) saturate(1.5)",
        WebkitBackdropFilter: "blur(22px) saturate(1.5)",
        border: "1px solid rgba(255, 255, 255, 0.62)",
        boxShadow:
          "0 24px 60px -38px rgba(20, 20, 40, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.7)",
      }}
    >
      <p
        id="collateral-heading"
        style={{
          margin: 0,
          fontSize: 11,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          fontWeight: 600,
          color: "var(--neutral)",
        }}
      >
        Vibe Coding &amp; Collateral
      </p>
      <p
        style={{
          margin: "12px 0 0",
          fontSize: 15,
          lineHeight: 1.55,
          color: "var(--ink)",
          maxWidth: "52ch",
          opacity: 0.85,
        }}
      >
        Paste these prompts into Midjourney, Kling, or your image tool to visualize your brand on
        physical lifestyle touchpoints.
      </p>

      <ul
        style={{
          listStyle: "none",
          margin: "28px 0 0",
          padding: 0,
          display: "grid",
          gap: 20,
        }}
      >
        {prompts.slice(0, 3).map((prompt, i) => (
          <li key={i}>
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                fontWeight: 600,
                color: "var(--neutral)",
                marginBottom: 8,
              }}
            >
              {String(i + 1).padStart(2, "0")} · {PROMPT_LABELS[i] ?? "Collateral"}
            </div>
            <PromptBlock text={prompt} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function PromptBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [text]);

  return (
    <div style={{ position: "relative" }}>
      <pre
        style={{
          margin: 0,
          padding: "16px 48px 16px 18px",
          borderRadius: 12,
          background: "#323232",
          color: "#f4f4f5",
          fontSize: 13,
          lineHeight: 1.55,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {text}
      </pre>
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={copied ? "Copied" : "Copy prompt"}
        title={copied ? "Copied" : "Copy"}
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          borderRadius: 8,
          border: "none",
          background: "rgba(255, 255, 255, 0.12)",
          color: "#f4f4f5",
          cursor: "pointer",
        }}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
