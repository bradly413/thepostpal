"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { MessageSquare } from "lucide-react";
import { AnimatedOverlay } from "@/components/dashboard/AnimatedOverlay";

const TYPES = [
  { value: "bug" as const, label: "Bug" },
  { value: "feature" as const, label: "Feature" },
  { value: "other" as const, label: "Other" },
] as const;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function FeedbackWidget() {
  const pathname = usePathname();
  const isStudio = Boolean(pathname?.startsWith("/dashboard/studio"));
  const isCalendar = Boolean(pathname?.startsWith("/dashboard/calendar"));
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"bug" | "feature" | "other">("bug");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [labelExpanded, setLabelExpanded] = useState(!isCalendar);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const labelTweenRef = useRef<gsap.core.Tween | null>(null);

  const labelText = isCalendar ? "Feedback" : "Beta feedback";

  const setLabelVisible = useCallback(
    (expanded: boolean, immediate = false) => {
      const label = labelRef.current;
      if (!label) return;
      labelTweenRef.current?.kill();
      const labelW = Math.ceil(label.scrollWidth) || 1;
      const reduced = prefersReducedMotion();
      const dur = immediate || reduced ? 0 : 0.32;
      labelTweenRef.current = gsap.to(label, {
        maxWidth: expanded ? labelW : 0,
        autoAlpha: expanded ? 1 : 0,
        marginLeft: expanded ? 8 : 0,
        duration: dur,
        ease: expanded ? "power3.out" : "power2.inOut",
      });
      setLabelExpanded(expanded);
    },
    [],
  );

  useEffect(() => {
    const label = labelRef.current;
    if (!label) return;
    const labelW = Math.ceil(label.scrollWidth) || 1;
    gsap.set(label, {
      maxWidth: isCalendar ? 0 : labelW,
      autoAlpha: isCalendar ? 0 : 1,
      marginLeft: isCalendar ? 0 : 8,
      overflow: "hidden",
      display: "inline-block",
    });
    setLabelExpanded(!isCalendar);
  }, [isCalendar]);

  useEffect(() => {
    return () => {
      labelTweenRef.current?.kill();
    };
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    window.setTimeout(() => triggerRef.current?.focus(), 300);
  }, []);

  function openFeedback() {
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

  async function handleSubmit() {
    if (!message.trim()) return;
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, message: message.trim(), page: pathname }),
      });
    } catch {
      /* still acknowledge — feedback is best-effort */
    }
    setMessage("");
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setOpen(false);
      setType("bug");
      window.setTimeout(() => triggerRef.current?.focus(), 300);
    }, 1800);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openFeedback}
        onMouseEnter={() => setLabelVisible(true)}
        onMouseLeave={() => {
          if (!isCalendar) return;
          setLabelVisible(false);
        }}
        onFocus={() => setLabelVisible(true)}
        onBlur={() => {
          if (!isCalendar) return;
          setLabelVisible(false);
        }}
        aria-label="Send beta feedback"
        aria-haspopup="dialog"
        className={`fixed z-[60] flex h-[38px] items-center rounded-full border border-white/70 bg-white/90 px-4 py-2.5 text-xs font-semibold text-[#1c1c1e] shadow-[0_18px_48px_-24px_rgba(20,20,40,0.45)] backdrop-blur-md transition-shadow hover:shadow-[0_22px_52px_-22px_rgba(20,20,40,0.5)] active:scale-[0.98] ${
          isStudio ? "pb-safe-fab-studio" : "pb-safe-fab"
        }`}
      >
        <MessageSquare size={14} strokeWidth={2} className="shrink-0" aria-hidden />
        <span
          ref={labelRef}
          className="inline-block overflow-hidden whitespace-nowrap will-change-[max-width,opacity]"
          aria-hidden={!labelExpanded}
        >
          {labelText}
        </span>
      </button>

      <AnimatedOverlay
        open={open}
        onClose={close}
        ariaLabel="Send feedback"
        align="center"
        zIndexClass="z-[70]"
        backdropClassName="bg-[#1c1c1e]/25 backdrop-blur-sm"
        panelRef={dialogRef}
        panelClassName="pb-safe-sheet relative mx-4 mb-4 w-full max-w-md overflow-hidden rounded-2xl border border-white/70 bg-white/95 shadow-[0_30px_70px_-28px_rgba(20,20,40,0.45)] backdrop-blur-xl sm:mb-0"
        closeOnBackdrop={!sent}
      >
        {sent ? (
          <div className="relative flex flex-col items-center justify-center px-6 py-12" role="status">
            <button
              type="button"
              aria-label="Close"
              onClick={close}
              className="absolute right-4 top-4 rounded-lg p-1 text-[#76767e] transition-colors hover:bg-black/[0.04] hover:text-[#1c1c1e]"
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#1f9d4d]/12">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#1f9d4d" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-[#1c1c1e]">Thanks for your feedback</p>
            <p className="mt-1 text-xs text-[#76767e]">We will review it shortly.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-[rgba(20,20,30,0.07)] px-5 py-4">
              <div>
                <h3 id="feedback-title" className="text-sm font-semibold text-[#1c1c1e]">
                  Send feedback
                </h3>
                <p className="mt-0.5 text-[11px] text-[#76767e]">Help us improve Posterboy</p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="rounded-lg p-1 text-[#76767e] transition-colors hover:bg-black/[0.04] hover:text-[#1c1c1e]"
              >
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div className="flex gap-2" role="group" aria-label="Feedback type">
                {TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    aria-pressed={type === t.value}
                    className={`flex-1 rounded-xl border py-2.5 text-xs font-medium transition-all ${
                      type === t.value
                        ? "border-[rgba(238,37,50,0.35)] bg-[rgba(238,37,50,0.1)] text-[#c81e2a]"
                        : "border-[rgba(20,20,30,0.08)] bg-black/[0.02] text-[#76767e] hover:border-[rgba(20,20,30,0.14)] hover:text-[#1c1c1e]"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <label className="block">
                <span className="sr-only">Your message</span>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    type === "bug"
                      ? "What went wrong? What did you expect to happen?"
                      : type === "feature"
                        ? "What would you like to see added or changed?"
                        : "Tell us anything..."
                  }
                  rows={4}
                  className="w-full resize-none rounded-xl border border-[rgba(20,20,30,0.1)] bg-white px-4 py-3 text-sm text-[#1c1c1e] placeholder:text-[#9a9aa3] focus:border-[rgba(238,37,50,0.4)] focus:outline-none focus:ring-2 focus:ring-[rgba(238,37,50,0.12)]"
                />
              </label>

              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-[10px] text-[#9a9aa3]">Page: {pathname}</p>
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={!message.trim()}
                  className="rounded-full bg-[#1c1c1e] px-5 py-2 text-xs font-semibold text-white transition-all hover:bg-[#2a2a2e] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  Submit
                </button>
              </div>
            </div>
          </>
        )}
      </AnimatedOverlay>
    </>
  );
}
