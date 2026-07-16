"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Bot, Send, X } from "lucide-react";
import { AnimatedOverlay } from "@/components/dashboard/AnimatedOverlay";

gsap.registerPlugin(useGSAP);

type ChatRole = "user" | "assistant";

interface PendingDelete {
  token: string;
  count: number;
  summary: string;
}

interface ChatMessage {
  role: ChatRole;
  content: string;
  toolSummaries?: string[];
  pendingDelete?: PendingDelete;
}

interface CalendarAssistantProps {
  locationId: string | null;
  onPostsChanged?: () => void;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function CalendarAssistant({
  locationId,
  onPostsChanged,
}: CalendarAssistantProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi — I can help with your schedule. Try asking how many posts are queued, what's coming up this week, or to remove specific posts.",
    },
  ]);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const msgCountRef = useRef(messages.length);
  const fabExpandedRef = useRef(true);
  const fabHoverRef = useRef(false);
  const fabTweenRef = useRef<gsap.core.Tween | null>(null);
  const fabBtnTweenRef = useRef<gsap.core.Tween | null>(null);
  const openRef = useRef(false);
  const wasOpenRef = useRef(false);
  openRef.current = open;

  const setFabExpanded = useCallback((expanded: boolean, immediate = false) => {
    const label = labelRef.current;
    if (!label) return;
    if (fabExpandedRef.current === expanded && !immediate) return;
    fabExpandedRef.current = expanded;

    fabTweenRef.current?.kill();
    fabBtnTweenRef.current?.kill();

    const labelW = Math.ceil(label.scrollWidth) || 1;
    const reduced = prefersReducedMotion();
    const dur = immediate || reduced ? 0 : 0.38;

    fabTweenRef.current = gsap.to(label, {
      maxWidth: expanded ? labelW : 0,
      autoAlpha: expanded ? 1 : 0,
      marginLeft: expanded ? 8 : 0,
      duration: dur,
      ease: expanded ? "power3.out" : "power2.inOut",
    });
  }, []);

  useGSAP(
    () => {
      const btn = triggerRef.current;
      const label = labelRef.current;
      if (!btn || !label) return;

      const mm = gsap.matchMedia();
      mm.add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
          reduce: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const reduce = Boolean(context.conditions?.reduce);
          const labelW = Math.ceil(label.scrollWidth) || 1;

          gsap.set(label, {
            maxWidth: labelW,
            autoAlpha: 1,
            marginLeft: 8,
            overflow: "hidden",
            display: "inline-block",
          });
          fabExpandedRef.current = true;

          if (reduce) {
            const id = window.setTimeout(() => {
              if (!fabHoverRef.current && !openRef.current) setFabExpanded(false, true);
            }, 1800);
            return () => window.clearTimeout(id);
          }

          gsap.fromTo(
            btn,
            { autoAlpha: 0, y: 14, scale: 0.92 },
            { autoAlpha: 1, y: 0, scale: 1, duration: 0.45, ease: "power3.out" },
          );

          const collapseId = window.setTimeout(() => {
            if (!fabHoverRef.current && !openRef.current) setFabExpanded(false);
          }, 2400);

          return () => window.clearTimeout(collapseId);
        },
      );

      return () => {
        mm.revert();
        fabTweenRef.current?.kill();
        fabBtnTweenRef.current?.kill();
      };
    },
    { dependencies: [setFabExpanded] },
  );

  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      setFabExpanded(false);
      return;
    }
    if (!wasOpenRef.current) return;
    wasOpenRef.current = false;
    if (fabHoverRef.current) {
      setFabExpanded(true);
      return;
    }
    setFabExpanded(true);
    const id = window.setTimeout(() => {
      if (!fabHoverRef.current && !openRef.current) setFabExpanded(false);
    }, 1600);
    return () => window.clearTimeout(id);
  }, [open, setFabExpanded]);

  const close = useCallback(() => {
    setOpen(false);
    window.setTimeout(() => triggerRef.current?.focus(), 320);
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 320);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open, busy]);

  useGSAP(
    () => {
      const list = listRef.current;
      if (!list || !open || prefersReducedMotion()) return;
      const bubbles = list.querySelectorAll<HTMLElement>("[data-chat-bubble]");
      if (bubbles.length === 0) return;
      if (bubbles.length <= msgCountRef.current) {
        msgCountRef.current = bubbles.length;
        return;
      }
      const newest = bubbles[bubbles.length - 1];
      msgCountRef.current = bubbles.length;
      gsap.fromTo(
        newest,
        { autoAlpha: 0, y: 10, scale: 0.98 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.32, ease: "power3.out" },
      );
    },
    { dependencies: [messages, open, busy] },
  );

  function openAssistant() {
    const btn = triggerRef.current;
    if (btn && !prefersReducedMotion()) {
      gsap.fromTo(
        btn,
        { scale: 1 },
        { scale: 0.94, duration: 0.08, yoyo: true, repeat: 1, ease: "power2.out" },
      );
    }
    setOpen(true);
  }

  async function postToAssistant(
    nextMessages: ChatMessage[],
    deleteConfirmToken?: string,
  ) {
    const res = await fetch("/api/ai/calendar-assistant", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locationId,
        messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        ...(deleteConfirmToken ? { deleteConfirmToken } : {}),
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      message?: string;
      error?: string;
      postsChanged?: boolean;
      toolSummaries?: string[];
      pendingDelete?: PendingDelete;
    };
    if (!res.ok) {
      throw new Error(data.error || "Assistant unavailable. Try again.");
    }

    const reply = (data.message || "Done.").trim();
    setMessages((prev) => {
      const cleared = deleteConfirmToken
        ? prev.map((m) =>
            m.pendingDelete ? { ...m, pendingDelete: undefined } : m,
          )
        : prev;
      return [
        ...cleared,
        {
          role: "assistant",
          content: reply,
          toolSummaries: data.toolSummaries?.length ? data.toolSummaries : undefined,
          pendingDelete: data.pendingDelete,
        },
      ];
    });
    if (data.postsChanged) onPostsChanged?.();
  }

  async function send(deleteConfirmToken?: string) {
    const text = input.trim();
    if ((!text && !deleteConfirmToken) || busy) return;
    if (!locationId) {
      setError("Pick a location before using the assistant.");
      return;
    }

    const userContent = deleteConfirmToken ? "Yes, delete them" : text;
    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: userContent },
    ];
    if (!deleteConfirmToken) setInput("");
    setMessages(nextMessages);
    setBusy(true);
    setError(null);

    try {
      await postToAssistant(nextMessages, deleteConfirmToken);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Assistant unavailable.";
      setError(msg);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Sorry — ${msg}` },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete(token: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: "Yes, delete them" },
    ];
    setMessages(nextMessages);
    try {
      await postToAssistant(nextMessages, token);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Assistant unavailable.";
      setError(msg);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Sorry — ${msg}` },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openAssistant}
        onMouseEnter={() => {
          fabHoverRef.current = true;
          if (!open) setFabExpanded(true);
        }}
        onMouseLeave={() => {
          fabHoverRef.current = false;
          if (!open) setFabExpanded(false);
        }}
        onFocus={() => {
          fabHoverRef.current = true;
          if (!open) setFabExpanded(true);
        }}
        onBlur={() => {
          fabHoverRef.current = false;
          if (!open) setFabExpanded(false);
        }}
        aria-label="Open schedule assistant"
        aria-haspopup="dialog"
        className="pb-safe-fab fixed z-[61] mb-14 flex h-[38px] items-center justify-center rounded-full border border-white/70 bg-[#ee2532] px-4 py-2.5 text-xs font-semibold text-white shadow-[0_18px_48px_-24px_rgba(238,37,50,0.55)] backdrop-blur-md transition-colors hover:bg-[#c81e2a] active:scale-[0.98]"
      >
        <Bot size={14} strokeWidth={2.25} className="shrink-0" aria-hidden />
        <span
          ref={labelRef}
          className="inline-block overflow-hidden whitespace-nowrap will-change-[max-width,opacity]"
        >
          Assistant
        </span>
      </button>

      <AnimatedOverlay
        open={open}
        onClose={close}
        ariaLabel="Schedule assistant"
        align="bottom-end"
        zIndexClass="z-[80]"
        backdropClassName="bg-[#1c1c1e]/30 backdrop-blur-sm"
        panelRef={panelRef}
        panelClassName="pb-safe-sheet relative m-3 flex h-[min(560px,78dvh)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/50 bg-white/90 shadow-[0_30px_70px_-28px_rgba(20,20,40,0.5)] backdrop-blur-xl sm:mb-20 sm:mr-4"
      >
        <div className="flex items-center justify-between border-b border-black/8 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-black">Schedule assistant</p>
            <p className="text-[11px] text-black/45">Ask about queued posts or your calendar</p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-black/45 hover:bg-black/[0.05] hover:text-black"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {messages.map((m, i) => (
            <div
              key={`${m.role}-${i}`}
              className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} w-full`}
              >
                <div
                  data-chat-bubble
                  className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                    m.role === "user"
                      ? "bg-[#ee2532] text-white"
                      : "border border-black/8 bg-white/80 text-black/80"
                  }`}
                >
                  {m.content}
                </div>
              </div>
              {m.role === "assistant" && m.toolSummaries?.length ? (
                <p className="mt-1 max-w-[90%] px-1 text-[10px] leading-snug text-black/40">
                  {m.toolSummaries.join(" · ")}
                </p>
              ) : null}
              {m.role === "assistant" && m.pendingDelete ? (
                <div className="mt-2 flex flex-wrap gap-2 px-1">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void confirmDelete(m.pendingDelete!.token)}
                    className="rounded-lg bg-[#ee2532] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#c81e2a] disabled:opacity-50"
                  >
                    Yes, delete {m.pendingDelete.count} post
                    {m.pendingDelete.count === 1 ? "" : "s"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      setMessages((prev) => [
                        ...prev.map((msg) =>
                          msg.pendingDelete
                            ? { ...msg, pendingDelete: undefined }
                            : msg,
                        ),
                        { role: "user", content: "Cancel" },
                        {
                          role: "assistant",
                          content: "Got it — nothing was deleted.",
                        },
                      ])
                    }
                    className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-[11px] font-semibold text-black/65 hover:bg-black/[0.03] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : null}
            </div>
          ))}
          {busy && (
            <p className="text-[12px] font-medium text-[#ee2532] animate-pulse">Thinking…</p>
          )}
        </div>

        {error && (
          <p className="px-4 pb-1 text-[11px] text-[#c81e2a]">{error}</p>
        )}

        <div className="border-t border-black/8 p-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={2}
              placeholder="e.g. how many posts are queued?"
              disabled={busy}
              className="min-h-[44px] flex-1 resize-none rounded-xl border border-black/10 bg-white px-3 py-2.5 text-[13px] text-black outline-none placeholder:text-black/35 focus:border-[#ee2532]/40 disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={busy || !input.trim()}
              aria-label="Send"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ee2532] text-white transition-colors hover:bg-[#c81e2a] disabled:opacity-40"
            >
              <Send size={16} aria-hidden />
            </button>
          </div>
        </div>
      </AnimatedOverlay>
    </>
  );
}
