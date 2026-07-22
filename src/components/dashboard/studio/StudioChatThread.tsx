"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { StudioChatMessage } from "@/lib/studio/studio-chat";

type Props = {
  messages: StudioChatMessage[];
  welcome: string;
  /** Live generation / preview slot (current frame) — sits at end of thread. */
  liveSlot?: ReactNode;
  className?: string;
};

function formatBadge(msg: Extract<StudioChatMessage, { role: "assistant" }>): string | null {
  if (msg.format !== "carousel") return null;
  const n = msg.carouselCount ?? 3;
  return `Carousel · ${n} slides`;
}

export default function StudioChatThread({
  messages,
  welcome,
  liveSlot,
  className = "",
}: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = endRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, liveSlot]);

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
              {msg.imageUrl && msg.status === "done" ? (
                <div className="studio-chat-image-card">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={msg.imageUrl} alt="" />
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
