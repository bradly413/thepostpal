"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

type BlobMode = "idle" | "typing" | "busy" | "ready";

type Props = {
  question: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  /** Optional secondary action (e.g. Skip). */
  skipLabel?: string;
  onSkip?: () => void;
  /** Optional helper action under the pill (e.g. Use my location). */
  actionLabel?: string;
  onAction?: () => void;
  actionBusy?: boolean;
  hint?: string | null;
  autoComplete?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  /** Short line under the question. */
  support?: string;
};

/**
 * Origin-style AI prompt — visible question + paper-inset pill.
 * Warm-light Posterboy chrome.
 */
export default function AiPillPrompt({
  question,
  value,
  onChange,
  onSubmit,
  skipLabel,
  onSkip,
  actionLabel,
  onAction,
  actionBusy = false,
  hint,
  autoComplete = "organization",
  autoFocus = true,
  disabled = false,
  support,
}: Props) {
  const wrapRef = useRef<HTMLFormElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const typingTimer = useRef<number | null>(null);
  const [typing, setTyping] = useState(false);

  const blobMode: BlobMode = useMemo(() => {
    if (actionBusy) return "busy";
    if (typing) return "typing";
    if (value.trim()) return "ready";
    return "idle";
  }, [actionBusy, typing, value]);

  useEffect(() => {
    return () => {
      if (typingTimer.current != null) window.clearTimeout(typingTimer.current);
    };
  }, []);

  const markTyping = () => {
    setTyping(true);
    if (typingTimer.current != null) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => setTyping(false), 720);
  };

  useGSAP(
    () => {
      const root = wrapRef.current;
      if (!root) return;
      const reduce =
        typeof window !== "undefined" &&
        Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
      const head = root.querySelectorAll(".va-pill-question, .va-pill-support");
      const pill = root.querySelector(".va-pill");
      const actions = root.querySelector(".va-pill-actions");
      if (reduce) {
        gsap.set([head, pill, actions].filter(Boolean), { autoAlpha: 1, y: 0 });
        return;
      }
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.fromTo(head, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.06 })
        .fromTo(pill, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.45 }, "-=0.22");
      if (actions) {
        tl.fromTo(actions, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.35 }, "-=0.2");
      }
      // Background-tab / low-power can stall GSAP — never leave the answer field hidden.
      const failsafe = window.setTimeout(() => {
        if (tl.progress() < 1) tl.progress(1);
      }, 2500);
      return () => window.clearTimeout(failsafe);
    },
    { scope: wrapRef, dependencies: [question] },
  );

  useGSAP(
    () => {
      if (blobMode !== "ready") return;
      const blob = wrapRef.current?.querySelector(".va-blob");
      if (!blob) return;
      const reduce =
        typeof window !== "undefined" &&
        Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
      if (reduce) return;
      gsap.fromTo(
        blob,
        { scale: 1.12 },
        { scale: 1, duration: 0.45, ease: "power2.out", overwrite: "auto" },
      );
    },
    { scope: wrapRef, dependencies: [blobMode] },
  );

  useEffect(() => {
    if (!autoFocus || disabled) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => window.clearTimeout(t);
  }, [question, autoFocus, disabled]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (disabled) return;
    onSubmit();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };

  return (
    <form className="va-pill-wrap" ref={wrapRef} onSubmit={submit}>
      <div className="va-pill-head">
        <h1 className="va-pill-question" id="va-pill-label">
          {question}
        </h1>
        {support ? <p className="va-pill-support">{support}</p> : null}
      </div>

      <div
        className={`va-pill${disabled ? " is-disabled" : ""}${value.trim() ? " is-ready" : ""}`}
      >
        <span className="va-pill-mark" aria-hidden>
          <span className="va-blob" data-mode={blobMode}>
            <span className="va-blob-a" />
            <span className="va-blob-b" />
            <span className="va-blob-c" />
          </span>
        </span>
        <input
          id="va-pill-input"
          ref={inputRef}
          className="va-pill-input"
          type="text"
          value={value}
          placeholder="Type here"
          aria-labelledby="va-pill-label"
          onChange={(e) => {
            markTyping();
            onChange(e.target.value);
          }}
          onKeyDown={onKeyDown}
          disabled={disabled || actionBusy}
          autoComplete={autoComplete}
          enterKeyHint="done"
        />
        <button
          type="submit"
          className="va-pill-go"
          disabled={disabled || actionBusy || !value.trim()}
          aria-label="Continue"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path
              d="M5 2.5L9.5 7L5 11.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {(actionLabel && onAction) || (skipLabel && onSkip) || hint ? (
        <div className="va-pill-actions">
          {actionLabel && onAction ? (
            <button
              type="button"
              className="va-pill-action"
              onClick={onAction}
              disabled={disabled || actionBusy}
            >
              {actionBusy ? "Finding you…" : actionLabel}
            </button>
          ) : null}
          {skipLabel && onSkip ? (
            <button
              type="button"
              className="va-pill-skip"
              onClick={onSkip}
              disabled={disabled || actionBusy}
            >
              {skipLabel}
            </button>
          ) : null}
          {hint ? <p className="va-pill-hint">{hint}</p> : null}
        </div>
      ) : null}

      <style>{`
        .va-pill-wrap {
          width: min(440px, 92vw);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 22px;
        }
        .va-pill-head {
          width: 100%;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .va-pill-question {
          margin: 0;
          width: 100%;
          max-width: none;
          font-size: clamp(22px, 3.2vw, 28px);
          font-weight: 700;
          letter-spacing: -0.03em;
          line-height: 1.2;
          white-space: nowrap;
          text-align: center;
          color: #141418;
        }
        @media (max-width: 400px) {
          .va-pill-question {
            white-space: normal;
            text-wrap: balance;
            font-size: 20px;
          }
        }
        .va-pill-support {
          margin: 0;
          max-width: 100%;
          font-size: 12.5px;
          line-height: 1.35;
          color: rgba(20, 20, 24, 0.48);
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        @media (max-width: 400px) {
          .va-pill-support {
            white-space: normal;
            text-wrap: balance;
            font-size: 12px;
          }
        }
        .va-pill {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          min-height: 56px;
          padding: 6px 10px 6px 16px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid rgba(20, 20, 24, 0.1);
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.8) inset,
            0 10px 28px -18px rgba(20, 20, 40, 0.28);
          transition:
            border-color 0.28s cubic-bezier(0.32, 0.72, 0, 1),
            box-shadow 0.28s cubic-bezier(0.32, 0.72, 0, 1),
            background 0.28s cubic-bezier(0.32, 0.72, 0, 1);
        }
        .va-pill:focus-within {
          border-color: rgba(238, 37, 50, 0.45);
          background: rgba(255, 255, 255, 0.9);
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.9) inset,
            0 0 0 3px rgba(238, 37, 50, 0.08),
            0 12px 32px -18px rgba(20, 20, 40, 0.3);
        }
        .va-pill.is-disabled { opacity: 0.65; }
        .va-pill-mark {
          flex-shrink: 0;
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
        }
        .va-blob {
          position: relative;
          width: 36px;
          height: 36px;
          filter: blur(0.35px);
          transform-origin: center;
        }
        .va-blob-a,
        .va-blob-b,
        .va-blob-c {
          position: absolute;
          inset: 0;
        }
        .va-blob-a {
          background: #ee2532;
          border-radius: 42% 58% 55% 45% / 48% 42% 58% 52%;
          opacity: 0.95;
          animation: va-morph-a 3.2s ease-in-out infinite;
          box-shadow: 0 0 12px rgba(238, 37, 50, 0.4);
          transition: box-shadow 0.35s cubic-bezier(0.32, 0.72, 0, 1);
        }
        .va-blob-b {
          inset: 2px;
          background: linear-gradient(135deg, #ff6b8a 0%, #ee2532 55%, #c81e2a 100%);
          border-radius: 58% 42% 45% 55% / 52% 58% 42% 48%;
          opacity: 0.75;
          mix-blend-mode: multiply;
          animation: va-morph-b 2.6s ease-in-out infinite reverse;
        }
        .va-blob-c {
          inset: -1px;
          background: radial-gradient(
            circle at 40% 35%,
            rgba(255, 255, 255, 0.55) 0%,
            rgba(255, 120, 150, 0.25) 35%,
            transparent 62%
          );
          border-radius: 50% 40% 60% 45% / 45% 55% 40% 60%;
          opacity: 0.9;
          animation: va-morph-c 2.1s ease-in-out infinite;
          filter: blur(1px);
        }
        /* Idle — slow morph */
        .va-blob[data-mode="idle"] .va-blob-a { animation-duration: 3.2s; }
        .va-blob[data-mode="idle"] .va-blob-b { animation-duration: 2.6s; }
        .va-blob[data-mode="idle"] .va-blob-c { animation-duration: 2.1s; }
        /* Typing — quicker pulse with caret */
        .va-blob[data-mode="typing"] .va-blob-a {
          animation-duration: 0.95s;
          box-shadow: 0 0 16px rgba(238, 37, 50, 0.55);
        }
        .va-blob[data-mode="typing"] .va-blob-b { animation-duration: 0.8s; }
        .va-blob[data-mode="typing"] .va-blob-c { animation-duration: 0.7s; }
        /* Busy — fast breathe (location / async) */
        .va-blob[data-mode="busy"] .va-blob-a {
          animation: va-morph-a 0.55s ease-in-out infinite, va-breathe 0.55s ease-in-out infinite;
          box-shadow: 0 0 18px rgba(238, 37, 50, 0.62);
        }
        .va-blob[data-mode="busy"] .va-blob-b { animation-duration: 0.5s; }
        .va-blob[data-mode="busy"] .va-blob-c { animation-duration: 0.45s; }
        /* Ready — settled, calmer */
        .va-blob[data-mode="ready"] .va-blob-a {
          animation-duration: 5.5s;
          box-shadow: 0 0 8px rgba(238, 37, 50, 0.28);
        }
        .va-blob[data-mode="ready"] .va-blob-b { animation-duration: 4.8s; }
        .va-blob[data-mode="ready"] .va-blob-c { animation-duration: 4.2s; }
        @keyframes va-morph-a {
          0%, 100% {
            border-radius: 42% 58% 55% 45% / 48% 42% 58% 52%;
            transform: rotate(0deg) scale(1);
          }
          33% {
            border-radius: 60% 40% 48% 52% / 40% 60% 45% 55%;
            transform: rotate(18deg) scale(1.08);
          }
          66% {
            border-radius: 48% 52% 40% 60% / 55% 45% 58% 42%;
            transform: rotate(-12deg) scale(0.94);
          }
        }
        @keyframes va-morph-b {
          0%, 100% {
            border-radius: 58% 42% 45% 55% / 52% 58% 42% 48%;
            transform: translate(1px, -1px) scale(1);
          }
          50% {
            border-radius: 40% 60% 55% 45% / 60% 40% 55% 45%;
            transform: translate(-2px, 2px) scale(1.12);
          }
        }
        @keyframes va-morph-c {
          0%, 100% {
            border-radius: 50% 40% 60% 45% / 45% 55% 40% 60%;
            transform: translate(0, 0) rotate(0deg);
            opacity: 0.85;
          }
          50% {
            border-radius: 40% 60% 45% 55% / 60% 40% 55% 45%;
            transform: translate(1px, -2px) rotate(40deg);
            opacity: 1;
          }
        }
        @keyframes va-breathe {
          0%, 100% { opacity: 0.9; }
          50% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .va-blob-a,
          .va-blob-b,
          .va-blob-c { animation: none !important; }
          .va-blob-a { border-radius: 48% 52% 50% 50% / 50% 48% 52% 50%; }
        }
        .va-pill-input {
          flex: 1;
          min-width: 0;
          border: 0;
          background: transparent;
          outline: none;
          font-size: clamp(15px, 2vw, 17px);
          font-weight: 550;
          letter-spacing: -0.02em;
          color: #141418;
          caret-color: #ee2532;
        }
        .va-pill-input::placeholder {
          color: rgba(20, 20, 24, 0.32);
          font-weight: 500;
        }
        .va-pill-go {
          flex-shrink: 0;
          width: 36px;
          height: 36px;
          border: 0;
          border-radius: 999px;
          padding: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          color: rgba(20, 20, 24, 0.28);
          cursor: pointer;
          transition:
            color 0.28s cubic-bezier(0.32, 0.72, 0, 1),
            background 0.28s cubic-bezier(0.32, 0.72, 0, 1),
            transform 0.2s cubic-bezier(0.32, 0.72, 0, 1);
        }
        .va-pill.is-ready .va-pill-go {
          background: #ee2532;
          color: #fff;
        }
        .va-pill.is-ready .va-pill-go:hover:not(:disabled) {
          background: #c81e2a;
        }
        .va-pill-go:active:not(:disabled) {
          transform: scale(0.96);
        }
        .va-pill-go:disabled {
          cursor: default;
        }
        .va-pill-go:focus-visible {
          outline: 2px solid rgba(20, 20, 24, 0.35);
          outline-offset: 2px;
        }
        .va-pill-actions {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        .va-pill-action {
          border: 0;
          background: none;
          font-size: 13px;
          font-weight: 650;
          color: #ee2532;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 4px;
        }
        .va-pill-action:hover:not(:disabled) { color: #c81e2a; }
        .va-pill-action:disabled { opacity: 0.55; cursor: progress; }
        .va-pill-skip {
          border: 0;
          background: none;
          font-size: 13px;
          font-weight: 600;
          color: rgba(20, 20, 24, 0.42);
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 4px;
        }
        .va-pill-skip:hover { color: #141418; }
        .va-pill-hint {
          margin: 0;
          max-width: 34ch;
          text-align: center;
          font-size: 12.5px;
          line-height: 1.4;
          color: rgba(20, 20, 24, 0.48);
        }
      `}</style>
    </form>
  );
}
