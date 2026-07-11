"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquare } from "lucide-react";

const TYPES = [
  { value: "bug" as const, label: "Bug" },
  { value: "feature" as const, label: "Feature" },
  { value: "other" as const, label: "Other" },
] as const;

export default function FeedbackWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"bug" | "feature" | "other">("bug");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    if (sent) return;
    setOpen(false);
  }, [sent]);

  useEffect(() => {
    if (!open) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusables = dialog.querySelectorAll<HTMLElement>(
      'button, textarea, [href], input, select, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    first?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        triggerRef.current?.focus();
        return;
      }
      if (e.key !== "Tab" || focusables.length === 0) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close, sent]);

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
      triggerRef.current?.focus();
    }, 1800);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Send beta feedback"
        aria-haspopup="dialog"
        className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 rounded-full border border-white/70 bg-white/90 px-4 py-2.5 text-xs font-semibold text-[#1c1c1e] shadow-[0_18px_48px_-24px_rgba(20,20,40,0.45)] backdrop-blur-md transition-all hover:-translate-y-px hover:shadow-[0_22px_52px_-22px_rgba(20,20,40,0.5)] active:scale-[0.98]"
      >
        <MessageSquare size={14} strokeWidth={2} aria-hidden />
        Beta feedback
      </button>

      {open ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-[#1c1c1e]/25 backdrop-blur-sm"
            aria-label="Close feedback dialog"
            onClick={close}
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-title"
            className="relative mx-4 mb-4 w-full max-w-md overflow-hidden rounded-2xl border border-white/70 bg-white/95 shadow-[0_30px_70px_-28px_rgba(20,20,40,0.45)] backdrop-blur-xl sm:mb-0"
            onClick={(e) => e.stopPropagation()}
          >
            {sent ? (
              <div className="flex flex-col items-center justify-center px-6 py-12" role="status">
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
          </div>
        </div>
      ) : null}
    </>
  );
}
