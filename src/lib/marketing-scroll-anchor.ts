import type Lenis from "lenis";

const HEADER_OFFSET = 88;

/** Scroll to a hash target; uses Lenis when available. */
export function scrollToMarketingAnchor(
  selector: string,
  lenis: Lenis | null,
): void {
  const el = document.querySelector(selector);
  if (!el || !(el instanceof HTMLElement)) return;

  if (lenis) {
    lenis.scrollTo(el, { offset: -HEADER_OFFSET, duration: 1.1 });
    return;
  }

  const top =
    el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}
