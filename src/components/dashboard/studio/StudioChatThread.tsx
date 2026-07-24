"use client";

import { useState, type ReactNode } from "react";
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
  /** Opens a historical result without changing the active editor image. */
  onPreviewImage?: (src: string, turnId: string) => void;
  /** Historical turn currently shown in the preview dialog. */
  previewTurnId?: string | null;
  /** Keeps the parent timeline anchored after a cached image resolves its size. */
  onHistoryImageLoad?: () => void;
  className?: string;
};

function formatBadge(msg: Extract<StudioChatMessage, { role: "assistant" }>): string | null {
  if (msg.format !== "carousel") return null;
  const n = msg.carouselCount ?? 3;
  return `Carousel · ${n} slides`;
}

function ResultImage({
  src,
  badge,
  onPreview,
  onLoad,
  expanded = false,
  turnId,
  label,
}: {
  src: string;
  badge?: string | null;
  onPreview?: (src: string, turnId: string) => void;
  onLoad?: () => void;
  expanded?: boolean;
  turnId: string;
  label: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="studio-chat-image-card studio-chat-image-card--error" role="alert">
        <p>Image generated but couldn’t display. Try Create again.</p>
      </div>
    );
  }
  return (
    <button
      type="button"
      className="studio-chat-image-card studio-chat-image-card--button"
      data-studio-history-image="true"
      aria-label={label}
      aria-haspopup="dialog"
      aria-expanded={expanded}
      onClick={() => onPreview?.(src, turnId)}
      disabled={!onPreview}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Previous generated studio image"
        onLoad={onLoad}
        onError={() => setFailed(true)}
      />
      {badge ? <span className="studio-chat-format-badge on-image">{badge}</span> : null}
    </button>
  );
}

export default function StudioChatThread({
  messages,
  liveSlot,
  resultUrl = null,
  onPreviewImage,
  previewTurnId = null,
  onHistoryImageLoad,
  className = "",
}: Props) {
  const lastAsst = [...messages].reverse().find((m) => m.role === "assistant");
  const promptByAssistantId = new Map<string, string>();
  const ordinalByAssistantId = new Map<string, number>();
  let latestUserPrompt = "";
  let imageOrdinal = 0;
  for (const message of messages) {
    if (message.role === "user") {
      latestUserPrompt = message.text;
      continue;
    }
    promptByAssistantId.set(message.id, latestUserPrompt);
    if (message.status === "done" && message.imageUrl) {
      imageOrdinal += 1;
      ordinalByAssistantId.set(message.id, imageOrdinal);
    }
  }
  return (
    <div
      className={`studio-chat-thread${className ? ` ${className}` : ""}`}
      data-studio-history="session"
      data-empty={messages.length === 0 && !liveSlot ? "true" : "false"}
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
          const isCurrentCarousel =
            msg.format === "carousel" &&
            lastAsst?.id === msg.id &&
            lastAsst.status === "done" &&
            !resultUrl;
          // The active single result is suppressed by URL; the active carousel
          // is suppressed by turn while its coverflow owns the stage. Older
          // carousel covers remain available in the upward history.
          const showCard =
            !!msg.imageUrl &&
            msg.status === "done" &&
            !(resultUrl && msg.imageUrl === resultUrl) &&
            !isCurrentCarousel;
          const sourcePrompt = promptByAssistantId.get(msg.id)?.trim().slice(0, 90);
          const ordinal = ordinalByAssistantId.get(msg.id) ?? 1;
          const previewLabel = sourcePrompt
            ? `Enlarge previous generation ${ordinal}: ${sourcePrompt}`
            : `Enlarge previous generation ${ordinal}`;
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
                <ResultImage
                  src={msg.imageUrl!}
                  badge={badge}
                  onPreview={onPreviewImage}
                  onLoad={onHistoryImageLoad}
                  expanded={previewTurnId === msg.id}
                  turnId={msg.id}
                  label={previewLabel}
                />
              ) : null}
            </div>
          );
        })}
        {lastAsst?.status === "done" && !resultUrl && !lastAsst.imageUrl ? (
          <div className="studio-chat-image-card studio-chat-image-card--error" role="alert">
            <p>Generation finished without an image URL. Try Create again.</p>
          </div>
        ) : null}

        {liveSlot ? <div className="studio-chat-live-slot">{liveSlot}</div> : null}
        <div className="studio-chat-end" aria-hidden />
      </div>
    </div>
  );
}
