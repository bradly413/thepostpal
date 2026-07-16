"use client";

import {
  useCallback,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const RED_SOLID = "#ee2532";
/** Clear / glass red on hover */
const RED_CLEAR = "rgba(238, 37, 50, 0.72)";

interface CollapsingLabelButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon: ReactNode;
  label: string;
  /** ms to stay expanded after mount before collapsing */
  collapseAfterMs?: number;
}

/**
 * Solid red control that enters with full label, collapses to icon-only,
 * then re-expands on hover/focus with a clear (glassy) red fill.
 */
export default function CollapsingLabelButton({
  icon,
  label,
  collapseAfterMs = 2400,
  className = "",
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  ...rest
}: CollapsingLabelButtonProps) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const expandedRef = useRef(true);
  const hoverRef = useRef(false);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const paintTweenRef = useRef<gsap.core.Tween | null>(null);

  const paintHover = useCallback((hovering: boolean, immediate = false) => {
    const btn = btnRef.current;
    if (!btn) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dur = immediate || reduced ? 0 : 0.28;
    paintTweenRef.current?.kill();
    paintTweenRef.current = gsap.to(btn, {
      backgroundColor: hovering ? RED_CLEAR : RED_SOLID,
      borderColor: hovering ? "rgba(255,255,255,0.55)" : "transparent",
      backdropFilter: hovering ? "blur(10px)" : "blur(0px)",
      duration: dur,
      ease: "power2.out",
      overwrite: "auto",
    });
  }, []);

  const setExpanded = useCallback((expanded: boolean, immediate = false) => {
    const labelEl = labelRef.current;
    if (!labelEl) return;
    if (expandedRef.current === expanded && !immediate) {
      paintHover(hoverRef.current, immediate);
      return;
    }
    expandedRef.current = expanded;

    tweenRef.current?.kill();
    const labelW = Math.ceil(labelEl.scrollWidth) || 1;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dur = immediate || reduced ? 0 : 0.36;

    tweenRef.current = gsap.to(labelEl, {
      maxWidth: expanded ? labelW : 0,
      autoAlpha: expanded ? 1 : 0,
      marginLeft: expanded ? 6 : 0,
      duration: dur,
      ease: expanded ? "power3.out" : "power2.inOut",
    });
    paintHover(hoverRef.current, immediate);
  }, [paintHover]);

  useGSAP(
    () => {
      const btn = btnRef.current;
      const labelEl = labelRef.current;
      if (!btn || !labelEl) return;

      const mm = gsap.matchMedia();
      mm.add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
          reduce: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const reduce = Boolean(context.conditions?.reduce);
          const labelW = Math.ceil(labelEl.scrollWidth) || 1;

          gsap.set(labelEl, {
            maxWidth: labelW,
            autoAlpha: 1,
            marginLeft: 6,
            overflow: "hidden",
            display: "inline-block",
          });
          gsap.set(btn, {
            paddingLeft: 16,
            paddingRight: 16,
            backgroundColor: RED_SOLID,
            borderColor: "transparent",
          });
          expandedRef.current = true;

          if (reduce) {
            const id = window.setTimeout(() => {
              if (!hoverRef.current) setExpanded(false, true);
            }, Math.min(collapseAfterMs, 1800));
            return () => window.clearTimeout(id);
          }

          gsap.fromTo(
            btn,
            { autoAlpha: 0, y: 10, scale: 0.94 },
            { autoAlpha: 1, y: 0, scale: 1, duration: 0.42, ease: "power3.out" },
          );

          const collapseId = window.setTimeout(() => {
            if (!hoverRef.current) setExpanded(false);
          }, collapseAfterMs);

          return () => window.clearTimeout(collapseId);
        },
      );

      return () => {
        mm.revert();
        tweenRef.current?.kill();
        paintTweenRef.current?.kill();
      };
    },
    { dependencies: [setExpanded, collapseAfterMs] },
  );

  return (
    <button
      ref={btnRef}
      type="button"
      onMouseEnter={(e) => {
        hoverRef.current = true;
        setExpanded(true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        hoverRef.current = false;
        setExpanded(false);
        onMouseLeave?.(e);
      }}
      onFocus={(e) => {
        hoverRef.current = true;
        setExpanded(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        hoverRef.current = false;
        setExpanded(false);
        onBlur?.(e);
      }}
      className={`inline-flex h-10 items-center justify-center rounded-xl border border-transparent px-4 text-sm font-semibold text-white shadow-[0_10px_28px_-16px_rgba(238,37,50,0.65)] ${className}`}
      {...rest}
    >
      <span className="inline-flex shrink-0 items-center justify-center" aria-hidden>
        {icon}
      </span>
      <span
        ref={labelRef}
        className="inline-block overflow-hidden whitespace-nowrap will-change-[max-width,opacity]"
      >
        {label}
      </span>
    </button>
  );
}
