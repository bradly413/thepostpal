"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useFocusTrap } from "@/components/dashboard/use-focus-trap";

gsap.registerPlugin(useGSAP);

export type OverlayAlign = "center" | "bottom" | "bottom-end";

interface AnimatedOverlayProps {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  children: ReactNode;
  /** Layout of the sheet within the viewport */
  align?: OverlayAlign;
  zIndexClass?: string;
  backdropClassName?: string;
  panelClassName?: string;
  /** Optional ref to the dialog panel (focus traps, etc.) */
  panelRef?: Ref<HTMLDivElement | null>;
  /** Close when backdrop is clicked (default true) */
  closeOnBackdrop?: boolean;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function assignRef<T>(ref: Ref<T> | undefined, value: T) {
  if (!ref) return;
  if (typeof ref === "function") ref(value);
  else ref.current = value;
}

/**
 * Shared dashboard overlay: backdrop fade + panel rise/scale via GSAP.
 * Portaled to document.body so stacking isn't trapped by page overflow.
 * Stays mounted through the exit tween so close isn't abrupt.
 */
export function AnimatedOverlay({
  open,
  onClose,
  ariaLabel,
  children,
  align = "center",
  zIndexClass = "z-50",
  backdropClassName = "bg-[#1c1c1e]/35 backdrop-blur-sm",
  panelClassName = "",
  panelRef,
  closeOnBackdrop = true,
}: AnimatedOverlayProps) {
  const [present, setPresent] = useState(open);
  const [focusReady, setFocusReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLButtonElement>(null);
  const panelElRef = useRef<HTMLDivElement | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const openRef = useRef(open);
  openRef.current = open;

  useFocusTrap(focusReady, panelElRef, onClose, { focusContainer: true });

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (open) setPresent(true);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) setFocusReady(false);
  }, [open]);

  // Body scroll lock while overlay is mounted (enter + exit).
  useEffect(() => {
    if (!present) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [present]);

  // Safety: never leave a ghost overlay mounted forever.
  useEffect(() => {
    if (open || !present) return;
    const id = window.setTimeout(() => {
      if (!openRef.current) setPresent(false);
    }, 600);
    return () => window.clearTimeout(id);
  }, [open, present]);

  useGSAP(
    () => {
      if (!present) return;
      const root = rootRef.current;
      const backdrop = backdropRef.current;
      const panel = panelElRef.current;
      if (!root || !backdrop || !panel) return;

      tlRef.current?.kill();
      const reduced = prefersReducedMotion();
      const durIn = reduced ? 0 : 0.42;
      const durOut = reduced ? 0 : 0.28;
      const fromY = align === "center" ? 18 : 36;

      if (open) {
        gsap.set(root, { pointerEvents: "auto" });
        gsap.set(backdrop, { autoAlpha: 0 });
        gsap.set(panel, { autoAlpha: 0, y: fromY, scale: 0.96 });
        tlRef.current = gsap
          .timeline({
            onComplete: () => {
              if (!openRef.current) return;
              setFocusReady(true);
            },
          })
          .to(
            backdrop,
            { autoAlpha: 1, duration: durIn * 0.8, ease: "power2.out" },
            0,
          )
          .to(
            panel,
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              duration: durIn,
              ease: "power3.out",
            },
            0.03,
          );
        if (reduced) {
          tlRef.current.progress(1);
        }
      } else {
        setFocusReady(false);
        // Stop blocking the page immediately while we fade out.
        gsap.set(root, { pointerEvents: "none" });
        tlRef.current = gsap
          .timeline({
            onComplete: () => {
              if (!openRef.current) setPresent(false);
            },
          })
          .to(
            panel,
            {
              autoAlpha: 0,
              y: fromY * 0.55,
              scale: 0.98,
              duration: durOut,
              ease: "power2.in",
            },
            0,
          )
          .to(
            backdrop,
            { autoAlpha: 0, duration: durOut * 0.85, ease: "power2.in" },
            0.02,
          );
      }
    },
    { dependencies: [open, present, align] },
  );

  useEffect(() => {
    return () => {
      tlRef.current?.kill();
    };
  }, []);

  if (!mounted || !present) return null;

  const alignClass =
    align === "bottom-end"
      ? "items-end justify-center sm:items-end sm:justify-end"
      : align === "bottom"
        ? "items-end justify-center sm:items-center"
        : "items-end justify-center sm:items-center sm:p-4";

  return createPortal(
    <div
      ref={rootRef}
      className={`fixed inset-0 ${zIndexClass} flex ${alignClass}`}
      data-overlay={ariaLabel}
      data-overlay-open={open ? "true" : "false"}
    >
      <button
        ref={backdropRef}
        type="button"
        className={`absolute inset-0 ${backdropClassName}`}
        aria-label="Close dialog"
        onClick={() => {
          if (closeOnBackdrop) onClose();
        }}
      />
      <div
        ref={(node) => {
          panelElRef.current = node;
          assignRef(panelRef, node);
        }}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        className={panelClassName}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
