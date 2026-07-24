"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { StudioChatMessage } from "@/lib/studio/studio-chat";

type Props = {
  messages: StudioChatMessage[];
  /** Live generation preview (progress / frame) — sits at end of thread. */
  liveSlot?: ReactNode;
  /**
   * Current result URL from studio state. The canvas stage renders the active
   * image; the thread uses this URL only to suppress its duplicate message card.
   */
  resultUrl?: string | null;
  className?: string;
};

function formatBadge(msg: Extract<StudioChatMessage, { role: "assistant" }>): string | null {
  if (msg.format !== "carousel") return null;
  const n = msg.carouselCount ?? 3;
  return `Carousel · ${n} slides`;
}

function scrollKey(messages: StudioChatMessage[]): string {
  const last = messages[messages.length - 1];
  if (!last) return "0";
  if (last.role === "user") return `${messages.length}:${last.id}`;
  return `${messages.length}:${last.id}:${last.status}`;
}

function ResultImage({ src, badge }: { src: string; badge?: string | null }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="studio-chat-image-card studio-chat-image-card--error" role="alert">
        <p>Image generated but couldn’t display. Try Create again.</p>
      </div>
    );
  }
  return (
    <div className="studio-chat-image-card">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Generated studio image" onError={() => setFailed(true)} />
      {badge ? <span className="studio-chat-format-badge on-image">{badge}</span> : null}
    </div>
  );
}

export default function StudioChatThread({
  messages,
  liveSlot,
  resultUrl = null,
  className = "",
}: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const key = scrollKey(messages);

  useEffect(() => {
    const el = endRef.current;
    if (!el) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "end" });
  }, [key, resultUrl]);

  const lastAsst = [...messages].reverse().find((m) => m.role === "assistant");
  return (
    <div
      ref={scrollerRef}
      className={`studio-chat-thread${className ? ` ${className}` : ""}`}
      role="log"
      aria-live="polite"
      aria-relevant="additions"
    >
      <div className="studio-chat-inner">
        {messages.map((msg) => {
          if (msg.role === "user") {
            return (
              <div key={msg.id} className="studio-chat-bubble studio-chat-bubble--user">
                <p>{msg.text}</p>
              </div>
            );
          }

          const badge = formatBadge(msg);
          // History cards for single posts only — carousel uses the coverflow stage.
          const showCard =
            !!msg.imageUrl &&
            msg.status === "done" &&
            msg.format !== "carousel" &&
            !(resultUrl && msg.imageUrl === resultUrl);
          return (
            <div
              key={msg.id}
              className={`studio-chat-msg-asst${msg.status === "working" ? " is-working" : ""}`}
              data-status={msg.status}
            >
              <div className="studio-chat-bubble studio-chat-bubble--assistant">
                <p>{msg.text}</p>
                {badge ? <span className="studio-chat-format-badge">{badge}</span> : null}
                {msg.aspect ? (
                  <span className="studio-chat-aspect-badge">{msg.aspect}</span>
                ) : null}
              </div>
              {showCard ? <ResultImage src={msg.imageUrl!} badge={badge} /> : null}
            </div>
          );
        })}
        {lastAsst?.status === "done" && !resultUrl && !lastAsst.imageUrl ? (
          <div className="studio-chat-image-card studio-chat-image-card--error" role="alert">
            <p>Generation finished without an image URL. Try Create again.</p>
          </div>
        ) : null}

        {liveSlot ? <div className="studio-chat-live-slot">{liveSlot}</div> : null}
        <div ref={endRef} className="studio-chat-end" aria-hidden />
      </div>
    </div>
  );
}
