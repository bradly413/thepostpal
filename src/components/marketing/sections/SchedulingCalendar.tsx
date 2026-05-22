"use client";

import { useRef, useCallback, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useMarketingScroll } from "@/components/marketing/MarketingScrollProvider";
import { scheduleMarketingScrollRefresh } from "@/lib/marketing-scroll-engine";
import {
  imageToAsciiGrid,
  prepareAsciiCanvas,
  runAsciiReveal,
  showPostImageImmediate,
  type AsciiCleanupBag,
} from "@/lib/ascii-reveal";
import {
  SCHEDULING_CALENDAR_DAYS,
  SCHEDULING_CALENDAR_MONTH_LABEL,
  type CalendarDay,
} from "@/lib/scheduling-calendar-data";

gsap.registerPlugin(ScrollTrigger);

type PostSlot = {
  timeEl: HTMLTimeElement;
  canvas: HTMLCanvasElement;
  img: HTMLImageElement;
  src: string;
};

const POST_COUNT = SCHEDULING_CALENDAR_DAYS.filter((d) => d.kind === "post").length;

function BlankDay({ day }: { day: Extract<CalendarDay, { kind: "blank" }> }) {
  return (
    <time dateTime={day.iso} className="pb-cal-day pb-cal-day--blank">
      <span className="pb-cal-date">{day.label}</span>
    </time>
  );
}

function PostDay({
  day,
  onRegister,
}: {
  day: Extract<CalendarDay, { kind: "post" }>;
  onRegister: (slot: PostSlot) => void;
}) {
  const wired = useRef(false);

  return (
    <time
      ref={(timeEl) => {
        if (!timeEl || wired.current) return;
        const canvas = timeEl.querySelector("canvas");
        const img = timeEl.querySelector("img");
        if (!canvas || !img) return;
        wired.current = true;
        onRegister({ timeEl, canvas, img, src: day.post.image });
      }}
      dateTime={day.iso}
      className="pb-cal-day pb-cal-day--post"
    >
      <a href="#schedule" className="pb-cal-post" onClick={(e) => e.preventDefault()}>
        <div className="pb-cal-media">
          <canvas aria-hidden />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={day.post.image} alt={day.post.title} loading="lazy" decoding="async" />
        </div>
        <span className="pb-cal-date">{day.label}</span>
        <span className="pb-cal-title">{day.post.title}</span>
      </a>
    </time>
  );
}

/**
 * Scheduling calendar — ASCII reveal driven by section ScrollTrigger (top → bottom).
 */
export default function SchedulingCalendar() {
  const sectionRef = useRef<HTMLElement>(null);
  const postSlotsRef = useRef<PostSlot[]>([]);
  const startedRef = useRef<Set<HTMLTimeElement>>(new Set());
  const cleanupBag = useRef<AsciiCleanupBag>({ timeouts: [], intervals: [] });
  const [slotsReady, setSlotsReady] = useState(false);
  const { ready, reducedMotion } = useMarketingScroll();

  const registerPostSlot = useCallback((slot: PostSlot) => {
    if (postSlotsRef.current.some((s) => s.timeEl === slot.timeEl)) return;
    postSlotsRef.current.push(slot);
    if (postSlotsRef.current.length >= POST_COUNT) {
      setSlotsReady(true);
      scheduleMarketingScrollRefresh(80);
    }
  }, []);

  useGSAP(
    () => {
      if (!ready || !slotsReady) return;
      const section = sectionRef.current;
      const slots = [...postSlotsRef.current];
      if (!section || slots.length < POST_COUNT) return;

      const ordered = [...slots].sort(
        (a, b) => a.timeEl.offsetTop - b.timeEl.offsetTop,
      );

      const kills: ScrollTrigger[] = [];

      const runReveal = (slot: PostSlot) => {
        if (startedRef.current.has(slot.timeEl)) return;
        startedRef.current.add(slot.timeEl);

        gsap.set(slot.timeEl, { visibility: "visible" });

        if (reducedMotion) {
          showPostImageImmediate(slot.canvas, slot.img);
          return;
        }

        prepareAsciiCanvas(slot.canvas);
        slot.img.style.opacity = "0";
        slot.canvas.style.opacity = "1";

        const loader = new Image();
        loader.src = slot.src;
        loader.onload = () => {
          const { asciiGrid, brightnessGrid } = imageToAsciiGrid(loader);
          if (!asciiGrid.length) {
            showPostImageImmediate(slot.canvas, slot.img);
            return;
          }
          runAsciiReveal(
            slot.canvas,
            slot.img,
            asciiGrid,
            brightnessGrid,
            cleanupBag.current,
          );
        };
        loader.onerror = () => showPostImageImmediate(slot.canvas, slot.img);
      };

      ordered.forEach((slot) => {
        gsap.set(slot.timeEl, { visibility: "hidden" });
        gsap.set(slot.canvas, { opacity: 1 });
        gsap.set(slot.img, { opacity: 0 });
        if (reducedMotion) runReveal(slot);
      });

      if (!reducedMotion) {
        const step = 0.92 / Math.max(ordered.length, 1);

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: "top 78%",
            end: "bottom 28%",
            scrub: 0.65,
            invalidateOnRefresh: true,
          },
        });

        ordered.forEach((slot, i) => {
          const at = i * step;
          tl.call(() => runReveal(slot), [], at);
          tl.set(slot.timeEl, { visibility: "visible" }, at);
        });

        if (tl.scrollTrigger) kills.push(tl.scrollTrigger);
      }

      scheduleMarketingScrollRefresh(120);

      return () => {
        kills.forEach((t) => t.kill());
        cleanupBag.current.timeouts.forEach(clearTimeout);
        cleanupBag.current.intervals.forEach(clearInterval);
        cleanupBag.current = { timeouts: [], intervals: [] };
        startedRef.current.clear();
      };
    },
    { scope: sectionRef, dependencies: [ready, reducedMotion, slotsReady] },
  );

  return (
    <section
      ref={sectionRef}
      id="schedule"
      className="pb-schedule-calendar"
      aria-label="Scheduled posts calendar"
    >
      <div className="pb-schedule-calendar-head">
        <p className="type-label">Your week, handled</p>
        <h2 className="type-h2 pb-schedule-calendar-title">
          Posts land on the calendar.
          <br />
          You tap approve. That&apos;s all.
        </h2>
        <p className="type-body pb-schedule-calendar-lede">
          {SCHEDULING_CALENDAR_MONTH_LABEL} — scroll to watch posts resolve from ASCII into
          your queue.
        </p>
      </div>

      <main className="pb-schedule-calendar-main">
        <section className="pb-cal-grid" aria-label={SCHEDULING_CALENDAR_MONTH_LABEL}>
          {SCHEDULING_CALENDAR_DAYS.map((day) =>
            day.kind === "post" ? (
              <PostDay key={day.iso} day={day} onRegister={registerPostSlot} />
            ) : (
              <BlankDay key={day.iso} day={day} />
            ),
          )}
        </section>
      </main>
    </section>
  );
}
