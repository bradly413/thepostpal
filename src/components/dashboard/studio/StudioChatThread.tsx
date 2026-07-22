"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { StudioChatMessage } from "@/lib/studio/studio-chat";

type Props = {
  messages: StudioChatMessage[];
  welcome: string;
  /** Live generation / preview slot (current frame) — sits at end of thread. */
  liveSlot?: ReactNode;
  /** When set, hide thread image cards that match the live preview (no duplicate). */
  liveImageUrl?: string | null;
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

export default function StudioChatThread({
  messages,
  welcome,
  liveSlot,
  liveImageUrl = null,
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
  }, [key]);

  return (
    <div
      ref={scrollerRef}
      className={`studio-chat-thread${className ? ` ${className}` : ""}`}
      role="log"
      aria-live="polite"
      aria-relevant="additions"
    >
      <div className="studio-chat-inner">
        {messages.length === 0 ? (
          <div className="studio-chat-bubble studio-chat-bubble--assistant studio-chat-welcome">
            <p>{welcome}</p>
          </div>
        ) : null}

        {messages.map((msg) => {
          if (msg.role === "user") {
            return (
              <div key={msg.id} className="studio-chat-bubble studio-chat-bubble--user">
                <p>{msg.text}</p>
              </div>
            );
          }

          const badge = formatBadge(msg);
          const showCard =
            !!msg.imageUrl &&
            msg.status === "done" &&
            !(liveImageUrl && msg.imageUrl === liveImageUrl);
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
              {showCard ? (
                <div className="studio-chat-image-card">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={msg.imageUrl!} alt="" />
                  {badge ? <span className="studio-chat-format-badge on-image">{badge}</span> : null}
                </div>
              ) : null}
            </div>
          );
        })}

        {liveSlot ? <div className="studio-chat-live-slot">{liveSlot}</div> : null}
        <div ref={endRef} className="studio-chat-end" aria-hidden />
      </div>
    </div>
  );
}
