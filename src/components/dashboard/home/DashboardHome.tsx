"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  MoreHorizontal,
  Search,
} from "lucide-react";
import AppSidebar from "@/components/dashboard/AppSidebar";
import { usePlan } from "@/components/dashboard/PlanProvider";
import { useActiveLocation } from "@/lib/use-active-location";
import {
  formatScheduleLabel,
  formatShortDate,
  loadDashboardHomeSnapshot,
  type DashboardHomeSnapshot,
} from "@/lib/dashboard-home-data";
import { buildHeroHolidaySlides, type HeroHolidaySlide } from "@/lib/hero-holiday-slides";

const TOP_PERFORMING_DUPE_BRIEF =
  "Create a fresh Instagram variation of this top-performing post — same subject and energy, new composition, vivid commercial photography, no text overlay.";
const CSS = `
.pb-fig {
  --ink: #1a1a2e;
  --muted: #8b8b9a;
  --red: #ee2532;
  --line: #ececf0;
  --soft: #f7f7f9;
  height: 100%;
  max-height: 100%;
  overflow: hidden;
  background: #fff;
  color: var(--ink);
  font-family: var(--font-instrument-sans), Inter, -apple-system, BlinkMacSystemFont, sans-serif;
  -webkit-font-smoothing: antialiased;
}
.pb-fig-shell {
  display: flex;
  height: 100%;
  max-height: 100%;
  overflow: hidden;
  width: 100%;
}
.pb-fig-main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
}
.pb-fig-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 22px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}
.pb-fig-search {
  flex: 1;
  max-width: 380px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 10px;
  height: 40px;
  padding: 0 14px;
  border-radius: 999px;
  background: var(--soft);
  color: var(--muted);
}
.pb-fig-search input {
  flex: 1;
  border: 0;
  background: transparent;
  outline: none;
  font: inherit;
  font-size: 13px;
  color: var(--ink);
}
.pb-fig-search input::placeholder { color: var(--muted); }
.pb-fig-top-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.pb-fig-icon-btn {
  position: relative;
  width: 38px; height: 38px;
  border: 0; border-radius: 11px;
  background: transparent;
  color: var(--ink);
  display: grid; place-items: center;
  cursor: pointer;
  text-decoration: none;
}
.pb-fig-icon-btn:hover { background: var(--soft); }
.pb-fig-icon-btn .badge {
  position: absolute; top: 8px; right: 8px;
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--red); border: 2px solid #fff;
}
.pb-fig-user {
  display: flex; align-items: center; gap: 8px;
  margin-left: 6px; padding: 2px;
  border: 0; background: transparent; cursor: pointer;
  color: inherit; font: inherit; text-decoration: none;
}
.pb-fig-user img,
.pb-fig-user .pb-fig-avatar {
  width: 34px; height: 34px; border-radius: 50%; object-fit: cover;
}
.pb-fig-user .pb-fig-avatar {
  display: grid; place-items: center;
  background: #1a1a2e;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1;
  flex-shrink: 0;
}
.pb-fig-user span {
  font-size: 13.5px; font-weight: 600; color: var(--ink);
}
.pb-fig-user svg { color: var(--muted); width: 15px; height: 15px; }

.pb-fig-body {
  flex: 1;
  min-height: 0;
  padding: 16px 22px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}
.pb-fig-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: #151528;
  flex-shrink: 0;
}

.pb-fig-layout {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(260px, 0.82fr);
  gap: 14px;
  align-items: stretch;
  overflow: hidden;
}
.pb-fig-left,
.pb-fig-right {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.pb-fig-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  flex-shrink: 0;
}
.pb-fig-stat {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 14px 14px 12px;
}
.pb-fig-stat .label {
  font-size: 12px; font-weight: 500; color: var(--muted); margin-bottom: 8px;
}
.pb-fig-stat .value {
  font-size: 28px; font-weight: 700; letter-spacing: -0.04em; line-height: 1; color: var(--ink);
  margin-bottom: 6px;
}
.pb-fig-stat .sub {
  font-size: 12px; font-weight: 600; color: var(--red);
  text-decoration: none;
}

.pb-fig-mid {
  display: grid;
  grid-template-columns: 1.35fr 1fr;
  gap: 10px;
  flex-shrink: 0;
}
.pb-fig-top-perf {
  position: relative;
  overflow: hidden;
  border-radius: 16px;
  min-height: 148px;
  color: #fff;
  isolation: isolate;
  background: #1a1a2e;
}
.pb-fig-top-perf .bg {
  position: absolute;
  inset: 0;
  z-index: 0;
}
.pb-fig-top-perf .bg img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.pb-fig-top-perf .shade {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background:
    linear-gradient(
      90deg,
      rgba(12, 12, 14, 0.82) 0%,
      rgba(12, 12, 14, 0.55) 38%,
      rgba(12, 12, 14, 0.18) 62%,
      rgba(12, 12, 14, 0.06) 100%
    ),
    linear-gradient(0deg, rgba(12, 12, 14, 0.28) 0%, transparent 42%);
}
.pb-fig-top-perf .copy {
  position: relative;
  z-index: 2;
  padding: 16px 14px 14px 16px;
  max-width: 58%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 148px;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.35);
}
.pb-fig-top-perf .kicker {
  font-size: 12px; font-weight: 600; opacity: 0.92; margin-bottom: 10px;
}
.pb-fig-top-perf .likes {
  font-size: 34px; font-weight: 750; letter-spacing: -0.045em; line-height: 1;
}
.pb-fig-top-perf .likes small,
.pb-fig-top-perf .comments small {
  display: block; margin-top: 3px;
  font-size: 12px; font-weight: 500; opacity: 0.88; letter-spacing: 0;
}
.pb-fig-top-perf .comments {
  margin-top: 10px;
  font-size: 22px; font-weight: 700; letter-spacing: -0.03em; line-height: 1;
}
.pb-fig-top-perf .dupe {
  position: absolute;
  right: 12px;
  bottom: 12px;
  z-index: 2;
  border: 1px solid rgba(255, 255, 255, 0.55);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.94);
  color: #1a1a1c;
  font-size: 11.5px;
  font-weight: 700;
  padding: 7px 14px;
  cursor: pointer;
  white-space: nowrap;
  text-decoration: none;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.22);
  transition: transform 0.15s ease, background 0.15s ease;
}
.pb-fig-top-perf .dupe:hover {
  background: #fff;
  transform: translateY(-1px);
}
.pb-fig-top-perf .dupe:focus-visible {
  outline: 2px solid #ee2532;
  outline-offset: 2px;
}
.pb-fig-top-perf--empty {
  background: var(--soft);
  color: var(--ink);
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 18px 16px;
  min-height: 148px;
}
.pb-fig-top-perf--empty .kicker {
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  margin-bottom: 8px;
}
.pb-fig-top-perf--empty p {
  margin: 0 0 12px;
  font-size: 13.5px;
  line-height: 1.45;
  color: var(--ink);
  max-width: 28ch;
}
.pb-fig-top-perf--empty a {
  font-size: 12.5px;
  font-weight: 650;
  color: var(--red);
  text-decoration: none;
}

.pb-fig-nextup {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 14px;
  display: flex; flex-direction: column;
  min-height: 148px;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
a.pb-fig-nextup:hover {
  border-color: rgba(238, 37, 50, 0.28);
  box-shadow: 0 8px 22px -16px rgba(20, 20, 40, 0.35);
}
.pb-fig-nextup .kicker {
  font-size: 12px; font-weight: 500; color: var(--muted); margin-bottom: 6px;
}
.pb-fig-nextup .row {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;
  flex: 1;
}
.pb-fig-nextup .value {
  font-size: 34px; font-weight: 750; letter-spacing: -0.045em; line-height: 1;
}
.pb-fig-nextup .demo {
  font-size: 12px; color: var(--muted); margin-top: 8px; line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.pb-fig-nextup .thumb-wrap {
  width: 72px; height: 72px; flex-shrink: 0;
  align-self: center;
  border-radius: 12px;
  overflow: hidden;
  background: var(--soft);
  border: 1px solid var(--line);
}
.pb-fig-nextup .thumb-wrap img {
  width: 100%; height: 100%; object-fit: cover; display: block;
}
.pb-fig-nextup .thumb-wrap.empty {
  display: grid; place-items: center;
  color: var(--muted);
}
.pb-fig-nextup .delta {
  align-self: flex-start;
  margin-top: 8px;
  font-size: 11px; font-weight: 700; color: var(--red);
  background: #fff1f2;
  border-radius: 999px;
  padding: 5px 9px;
}

.pb-fig-coming {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 14px 14px 12px;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.pb-fig-coming-head {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  margin-bottom: 4px; flex-shrink: 0;
}
.pb-fig-coming-head h2 {
  margin: 0; font-size: 15px; font-weight: 700; letter-spacing: -0.02em;
}
.pb-fig-chip {
  display: inline-flex; align-items: center; gap: 5px;
  border: 1px solid var(--line);
  background: #fff;
  border-radius: 9px;
  padding: 5px 9px;
  font-size: 11.5px; font-weight: 500; color: var(--muted);
}
.pb-fig-rows {
  list-style: none; margin: 0; padding: 0;
  flex: 1; min-height: 0; overflow: hidden;
  display: flex; flex-direction: column;
}
.pb-fig-rows li {
  display: grid;
  grid-template-columns: 40px 1fr auto;
  gap: 10px;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--line);
  min-height: 0;
}
.pb-fig-rows li:last-child { border-bottom: 0; }
.pb-fig-rows .thumb {
  width: 40px; height: 40px; border-radius: 10px; object-fit: cover;
  background: var(--soft);
}
.pb-fig-rows .t {
  margin: 0 0 2px;
  font-size: 13px; font-weight: 600; letter-spacing: -0.015em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.pb-fig-rows .when { margin: 0; font-size: 11.5px; color: var(--muted); }
.pb-fig-rows .ico {
  width: 30px; height: 30px; border-radius: 9px;
  display: grid; place-items: center;
  color: var(--muted); background: transparent; border: 0; cursor: pointer;
}
.pb-fig-rows .ico:hover { background: var(--soft); color: var(--ink); }
.pb-fig-empty {
  flex: 1;
  display: grid;
  place-items: center;
  text-align: center;
  color: var(--muted);
  font-size: 13px;
  padding: 12px;
}
.pb-fig-see-all {
  display: inline-block;
  margin-top: 4px;
  font-size: 12.5px; font-weight: 700; color: var(--red);
  text-decoration: none;
  flex-shrink: 0;
}
.pb-fig-see-all:hover { text-decoration: underline; }

.pb-fig-promo {
  position: relative;
  overflow: hidden;
  border-radius: 16px;
  flex: 1.15;
  min-height: 0;
  color: #fff;
  background: #1a1a2e;
}
.pb-fig-promo .slide-img {
  position: absolute; inset: 0;
  width: 100%; height: 100%; object-fit: cover;
  filter: brightness(0.7);
  will-change: transform, opacity;
}
.pb-fig-promo .shade {
  position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(10,10,20,0.12) 0%, rgba(10,10,20,0.35) 45%, rgba(10,10,20,0.82) 100%);
}
.pb-fig-promo .inner {
  position: relative; z-index: 1;
  height: 100%;
  padding: 18px 16px 14px;
  display: flex; flex-direction: column;
  justify-content: flex-end;
  gap: 14px;
}
.pb-fig-promo .copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.pb-fig-promo h3 {
  margin: 0;
  font-size: clamp(22px, 2.2vw, 28px);
  font-weight: 750;
  letter-spacing: -0.03em;
  line-height: 1.05;
  text-transform: uppercase;
}
.pb-fig-promo .date {
  margin: 6px 0 0;
  font-size: 13px; font-weight: 500; opacity: 0.9;
}
.pb-fig-promo .cta {
  margin-top: 12px;
  display: inline-flex; align-items: center; justify-content: center;
  min-height: 36px; padding: 0 14px;
  border-radius: 9px;
  background: var(--red); color: #fff;
  font-size: 12.5px; font-weight: 700;
  text-decoration: none;
}
.pb-fig-promo .cta:hover { background: #c81e2a; }
.pb-fig-promo .pager {
  display: flex; align-items: center; justify-content: space-between;
  flex-shrink: 0;
}
.pb-fig-promo .dots { display: flex; gap: 5px; }
.pb-fig-promo .dots button {
  width: 7px; height: 7px; border-radius: 50%;
  border: 0; padding: 0; cursor: pointer;
  background: rgba(255,255,255,0.35);
}
.pb-fig-promo .dots button.on { background: #fff; }
.pb-fig-promo .arrows { display: flex; gap: 6px; }
.pb-fig-promo .arrows button {
  width: 30px; height: 30px; border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.35);
  background: rgba(0,0,0,0.22);
  color: #fff; display: grid; place-items: center; cursor: pointer;
}

.pb-fig-cal {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 12px 12px 10px;
  flex: 0.95;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.pb-fig-cal-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 8px; flex-shrink: 0;
}
.pb-fig-cal-head h3 {
  margin: 0; font-size: 12.5px; font-weight: 700; letter-spacing: 0.04em;
  text-transform: uppercase;
}
.pb-fig-cal-head .nav { display: flex; gap: 2px; }
.pb-fig-cal-head .nav button {
  width: 26px; height: 26px; border: 0; border-radius: 8px;
  background: transparent; color: var(--ink);
  display: grid; place-items: center; cursor: pointer;
}
.pb-fig-cal-head .nav button:hover { background: var(--soft); }
.pb-fig-cal-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-auto-rows: minmax(0, 1fr);
  gap: 2px;
  text-align: center;
}
.pb-fig-cal-grid .dow {
  font-size: 10px; font-weight: 600; color: var(--muted);
  display: grid; place-items: center;
  height: 18px;
}
.pb-fig-cal-grid .day {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border-radius: 10px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--ink);
  min-height: 0;
  text-decoration: none;
  transition: background 180ms cubic-bezier(0.32, 0.72, 0, 1), color 180ms cubic-bezier(0.32, 0.72, 0, 1);
}
.pb-fig-cal-grid a.day:hover:not(.out):not(.today) {
  background: rgba(238, 37, 50, 0.08);
}
.pb-fig-cal-grid .day.out { color: #c8c8d2; font-weight: 500; pointer-events: none; }
.pb-fig-cal-grid .day.today {
  background: var(--red);
  color: #fff;
  box-shadow: 0 8px 16px -10px rgba(238,37,50,0.7);
}
.pb-fig-cal-grid .day.has-posts:not(.today) {
  background: #faf7f7;
}
.pb-fig-cal-grid .marks {
  display: flex; gap: 2px; height: 4px; align-items: center;
}
.pb-fig-cal-grid .marks i {
  width: 4px; height: 4px; border-radius: 1.5px; display: block;
}
.pb-fig-cal-grid .day.today .marks i {
  background: rgba(255,255,255,0.85) !important;
}

@media (max-width: 1100px) {
  .pb-fig-body {
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
  }
  .pb-fig-layout {
    grid-template-columns: 1fr;
    overflow: visible;
    height: auto;
    flex: none;
    gap: 12px;
  }
  .pb-fig-left,
  .pb-fig-right {
    overflow: visible;
    min-height: auto;
  }
  .pb-fig-mid {
    grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
  }
  .pb-fig-coming,
  .pb-fig-promo,
  .pb-fig-cal {
    flex: none;
  }
  .pb-fig-coming {
    min-height: 180px;
    overflow: visible;
  }
  .pb-fig-rows {
    overflow: visible;
    flex: none;
  }
  .pb-fig-promo {
    min-height: 260px;
  }
  .pb-fig-cal {
    min-height: 300px;
  }
  .pb-fig-cal-grid {
    flex: none;
    grid-auto-rows: minmax(36px, 1fr);
  }
}

@media (max-width: 1100px) and (min-width: 769px) {
  .pb-fig-body {
    padding: 14px 16px 18px;
  }
  .pb-fig-top {
    padding: 12px 16px;
  }
  .pb-fig-title {
    font-size: 22px;
  }
  .pb-fig-stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .pb-fig-mid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .pb-fig-shell {
    height: 100%;
  }
  .pb-fig-top {
    padding: 10px 12px;
    gap: 8px;
  }
  .pb-fig-search {
    max-width: none;
    height: 36px;
    margin: 0;
    padding: 0 12px;
  }
  .pb-fig-search input {
    font-size: 16px; /* avoid iOS zoom */
  }
  .pb-fig-icon-btn {
    width: 36px;
    height: 36px;
    border-radius: 10px;
  }
  .pb-fig-user {
    margin-left: 2px;
  }
  .pb-fig-user span:not(.pb-fig-avatar),
  .pb-fig-user svg {
    display: none;
  }
  .pb-fig-body {
    padding: 12px 12px calc(80px + env(safe-area-inset-bottom, 0px));
    gap: 10px;
    overflow-y: auto;
  }
  .pb-fig-title {
    font-size: 20px;
  }
  .pb-fig-layout {
    overflow: visible;
    height: auto;
  }
  .pb-fig-stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }
  .pb-fig-stat {
    padding: 10px 10px 8px;
    border-radius: 12px;
  }
  .pb-fig-stat .label {
    font-size: 10.5px;
  }
  .pb-fig-stat .value {
    font-size: 22px;
    letter-spacing: -0.04em;
  }
  .pb-fig-stat .sub {
    font-size: 10.5px;
  }
  .pb-fig-top-perf {
    min-height: 168px;
    border-radius: 14px;
  }
  .pb-fig-top-perf .copy {
    max-width: 68%;
    min-height: 168px;
    padding: 14px 12px 12px 14px;
  }
  .pb-fig-top-perf .likes {
    font-size: 28px;
  }
  .pb-fig-top-perf .comments {
    font-size: 18px;
    margin-top: 8px;
  }
  .pb-fig-top-perf .dupe {
    right: 10px;
    bottom: 10px;
    padding: 7px 12px;
    font-size: 11px;
  }
  .pb-fig-nextup {
    min-height: 140px;
    padding: 12px;
    border-radius: 14px;
  }
  .pb-fig-nextup .value {
    font-size: 28px;
  }
  .pb-fig-nextup .thumb-wrap {
    width: 64px;
    height: 64px;
  }
  .pb-fig-coming {
    padding: 12px;
    border-radius: 14px;
    min-height: 0;
  }
  .pb-fig-coming-head h2 {
    font-size: 14px;
  }
  .pb-fig-rows li {
    grid-template-columns: 36px 1fr auto;
    gap: 8px;
    padding: 9px 0;
  }
  .pb-fig-rows .thumb {
    width: 36px;
    height: 36px;
    border-radius: 9px;
  }
  .pb-fig-promo {
    min-height: 220px;
    border-radius: 14px;
  }
  .pb-fig-promo .inner {
    padding: 16px 14px 12px;
    gap: 12px;
  }
  .pb-fig-promo h3 {
    font-size: 22px;
  }
  .pb-fig-promo .cta {
    min-height: 34px;
    font-size: 12px;
  }
  .pb-fig-cal {
    min-height: 0;
    padding: 12px 10px 10px;
    border-radius: 14px;
  }
  .pb-fig-cal-head h3 {
    font-size: 13px;
  }
  .pb-fig-cal-grid {
    flex: none;
    gap: 2px;
    grid-auto-rows: 36px;
  }
  .pb-fig-cal-grid .dow {
    font-size: 10px;
    padding: 4px 0;
    height: auto;
  }
  .pb-fig-cal-grid .day {
    min-height: 34px;
    font-size: 12px;
    border-radius: 8px;
  }
}

@media (max-width: 420px) {
  .pb-fig-stats {
    grid-template-columns: 1fr;
  }
  .pb-fig-stat {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    column-gap: 10px;
    align-items: baseline;
  }
  .pb-fig-stat .label {
    grid-column: 1;
  }
  .pb-fig-stat .value {
    grid-column: 2;
    grid-row: 1 / span 2;
    font-size: 26px;
    align-self: center;
  }
  .pb-fig-stat .sub {
    grid-column: 1;
  }
  .pb-fig-top-perf .copy {
    max-width: 72%;
  }
  .pb-fig-icon-btn[aria-label="Message support"] {
    display: none;
  }
}
`;

function postTitle(copy: string | null | undefined): string {
  const t = (copy ?? "").trim().replace(/\s+/g, " ");
  if (!t) return "Untitled post";
  return t.length > 42 ? `${t.slice(0, 42)}…` : t;
}

function holidayImage(slide: HeroHolidaySlide): string | null {
  return slide.img || null;
}

function nextUpCountdown(scheduledFor: string | null | undefined): string {
  if (!scheduledFor) return "—";
  const ms = new Date(scheduledFor).getTime() - Date.now();
  if (Number.isNaN(ms)) return "—";
  if (ms <= 0) return "Now";
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${Math.max(1, mins)}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function MonthCalendar({
  cursor,
  onPrev,
  onNext,
  markedDays,
}: {
  cursor: Date;
  onPrev: () => void;
  onNext: () => void;
  markedDays: Record<number, string[]>;
}) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDate = today.getDate();

  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();

  const cells: Array<{ day: number; out: boolean; today: boolean; marks?: string[] }> = [];
  for (let i = firstDow - 1; i >= 0; i--) {
    cells.push({ day: prevDays - i, out: true, today: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      day: d,
      out: false,
      today: isCurrentMonth && d === todayDate,
      marks: markedDays[d],
    });
  }
  let trailing = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ day: trailing++, out: true, today: false });
  }

  const label = cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase();
  const dateKey = (day: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return (
    <div className="pb-fig-cal">
      <div className="pb-fig-cal-head">
        <h3>{label}</h3>
        <div className="nav">
          <button type="button" aria-label="Previous month" onClick={onPrev}>
            <ChevronLeft size={15} />
          </button>
          <button type="button" aria-label="Next month" onClick={onNext}>
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
      <div className="pb-fig-cal-grid">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={`dow-${i}`} className="dow">
            {d}
          </div>
        ))}
        {cells.map((cell, i) => {
          const className = `day${cell.out ? " out" : ""}${cell.today ? " today" : ""}${cell.marks?.length ? " has-posts" : ""}`;
          const marks = cell.marks?.length ? (
            <span className="marks" aria-hidden>
              {cell.marks.slice(0, 3).map((c) => (
                <i key={c} style={{ background: c }} />
              ))}
            </span>
          ) : (
            <span className="marks" aria-hidden />
          );
          if (cell.out) {
            return (
              <div key={`o-${cell.day}-${i}`} className={className} aria-hidden>
                <span>{cell.day}</span>
                {marks}
              </div>
            );
          }
          return (
            <Link
              key={`i-${cell.day}-${i}`}
              href={`/dashboard/calendar?date=${dateKey(cell.day)}`}
              className={className}
              aria-label={`Open schedule for ${dateKey(cell.day)}`}
            >
              <span>{cell.day}</span>
              {marks}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardHome() {
  const router = useRouter();
  const { workspaceName } = usePlan();
  const { locationId } = useActiveLocation();
  const [data, setData] = useState<DashboardHomeSnapshot | null>(null);
  const [holidayIndex, setHolidayIndex] = useState(0);
  const [calCursor, setCalCursor] = useState(() => new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const promoRef = useRef<HTMLElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const holidays = useMemo(() => buildHeroHolidaySlides(new Date(), 6), []);
  const slide = holidays[holidayIndex] ?? holidays[0];

  const shortName =
    data?.userName?.trim().split(/\s+/).slice(0, 2).join(" ") ||
    workspaceName.trim().split(/\s+/).slice(0, 2).join(" ") ||
    "Account";
  const userInitials = data?.userInitials || "PB";

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    router.push(q ? `/dashboard/drafts?q=${encodeURIComponent(q)}` : "/dashboard/photos");
  };

  const refresh = useCallback(async () => {
    try {
      setData(await loadDashboardHomeSnapshot(locationId));
    } catch {
      /* keep empty-friendly home if snapshot fails */
    }
  }, [locationId]);

  useEffect(() => {
    void refresh();
    window.addEventListener("dashboard-location-updated", refresh);
    return () => window.removeEventListener("dashboard-location-updated", refresh);
  }, [refresh]);

  const comingUp = useMemo(() => {
    if (!data) return [];
    const now = Date.now();
    const isFuture = (p: { scheduledFor?: string | null }) => {
      if (!p.scheduledFor) return false;
      const t = new Date(p.scheduledFor).getTime();
      return Number.isFinite(t) && t > now;
    };
    const items = [];
    if (data.nextUp && isFuture(data.nextUp)) items.push(data.nextUp);
    for (const p of data.recentPosts) {
      if (items.length >= 3) break;
      if (!isFuture(p)) continue;
      if (!items.some((x) => x.id === p.id)) items.push(p);
    }
    return items.slice(0, 3);
  }, [data]);

  const markedDays = useMemo(() => {
    const map: Record<number, string[]> = {};
    const colors = ["#4f8cff", "#7c5cfc", "#34c759", "#ff9f0a"];
    const posts = [...(data?.recentPosts ?? [])];
    if (data?.nextUp) posts.unshift(data.nextUp);
    for (const post of posts) {
      if (!post.scheduledFor) continue;
      const d = new Date(post.scheduledFor);
      if (d.getFullYear() !== calCursor.getFullYear() || d.getMonth() !== calCursor.getMonth()) continue;
      const day = d.getDate();
      map[day] = [...(map[day] ?? []), colors[(map[day]?.length ?? 0) % colors.length]];
    }
    return map;
  }, [data, calCursor]);

  const goHoliday = useCallback(
    (next: number | "prev" | "next") => {
      setHolidayIndex((i) => {
        if (next === "prev") return (i - 1 + holidays.length) % holidays.length;
        if (next === "next") return (i + 1) % holidays.length;
        return next;
      });
    },
    [holidays.length],
  );

  useGSAP(
    () => {
      const img = imgRef.current;
      if (!img || !slide) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        gsap.set(img, { autoAlpha: 1, scale: 1 });
        return;
      }
      gsap.fromTo(
        img,
        { autoAlpha: 0.35, scale: 1.06 },
        { autoAlpha: 1, scale: 1, duration: 0.55, ease: "power2.out" },
      );
    },
    { dependencies: [holidayIndex, slide?.img, slide?.title], scope: promoRef },
  );

  const scheduledMonth = data?.scheduledCount ?? 0;
  const postsWeek = data?.weeklyOverview?.postsCount ?? 0;

  return (
    <div className="pb-fig">
      <style>{CSS}</style>
      <div className="pb-fig-shell">
        <AppSidebar />
        <div className="pb-fig-main">
          <header className="pb-fig-top">
            <form className="pb-fig-search" role="search" onSubmit={submitSearch}>
              <Search size={15} aria-hidden />
              <input
                type="search"
                placeholder="Search library"
                aria-label="Search library"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
            <div className="pb-fig-top-right">
              <Link
                href="/dashboard/drafts"
                className="pb-fig-icon-btn"
                aria-label="Content & drafts"
                title="Content & drafts"
              >
                <Bell size={17} />
                {(data?.pendingCount ?? 0) > 0 ? <span className="badge" aria-hidden /> : null}
              </Link>
              <a
                href="mailto:hello@posterboysocial.com"
                className="pb-fig-icon-btn"
                aria-label="Message support"
                title="Message support"
              >
                <MessageCircle size={17} />
              </a>
              <Link href="/dashboard/settings" className="pb-fig-user" aria-label="Account settings">
                <span className="pb-fig-avatar" aria-hidden>
                  {userInitials}
                </span>
                <span>{shortName}</span>
                <ChevronDown aria-hidden />
              </Link>
            </div>
          </header>

          <div className="pb-fig-body">
            <h1 className="pb-fig-title">Dashboard</h1>

            <div className="pb-fig-layout">
              <div className="pb-fig-left">
                <div className="pb-fig-stats">
                  <div className="pb-fig-stat">
                    <div className="label">Posts Scheduled</div>
                    <div className="value">{data ? scheduledMonth : "—"}</div>
                    <div className="sub">This Month</div>
                  </div>
                  <div className="pb-fig-stat">
                    <div className="label">Posts This Week</div>
                    <div className="value">{data ? postsWeek : "—"}</div>
                    <Link href="/dashboard/studio" className="sub">
                      + Add More
                    </Link>
                  </div>
                  <div className="pb-fig-stat">
                    <div className="label">Audience</div>
                    <div className="value">
                      {data == null
                        ? "—"
                        : data.audienceGrowth28d != null
                          ? `${data.audienceGrowth28d > 0 ? "+" : ""}${data.audienceGrowth28d.toLocaleString()}`
                          : data.audienceFollowers != null
                            ? data.audienceFollowers.toLocaleString()
                            : "—"}
                    </div>
                    <div className="sub">
                      {!data
                        ? "Followers"
                        : !data.metaConnected
                          ? "Connect Meta"
                          : data.audienceGrowth28d != null
                            ? "New Followers (28d)"
                            : data.audienceFollowers != null
                              ? "Followers"
                              : "No data yet"}
                    </div>
                  </div>
                </div>

                <div className="pb-fig-mid">
                  {data?.topPerforming ? (
                    <div className="pb-fig-top-perf">
                      <div className="bg" aria-hidden>
                        {data.topPerforming.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={data.topPerforming.imageUrl} alt="" />
                        ) : null}
                      </div>
                      <div className="shade" aria-hidden />
                      <div className="copy">
                        <div className="kicker">Top Performing</div>
                        <div className="likes">
                          {data.topPerforming.likes.toLocaleString()}
                          <small>Likes</small>
                        </div>
                        <div className="comments">
                          {data.topPerforming.comments.toLocaleString()}
                          <small>Comments</small>
                        </div>
                      </div>
                      <Link
                        href={
                          data.topPerforming.imageUrl
                            ? `/dashboard/studio?dupe=${encodeURIComponent(data.topPerforming.imageUrl)}&brief=${encodeURIComponent(TOP_PERFORMING_DUPE_BRIEF)}`
                            : `/dashboard/studio?brief=${encodeURIComponent(TOP_PERFORMING_DUPE_BRIEF)}`
                        }
                        className="dupe"
                      >
                        Dupe Post
                      </Link>
                    </div>
                  ) : (
                    <div className="pb-fig-top-perf pb-fig-top-perf--empty">
                      <div className="kicker">Top Performing</div>
                      <p>
                        {!data
                          ? "Loading engagement…"
                          : !data.metaConnected
                            ? "Connect Facebook & Instagram to see your top post here."
                            : "Publish a few posts — top likes and comments will show up here."}
                      </p>
                      <Link
                        href={
                          data && !data.metaConnected
                            ? "/dashboard/settings?tab=account"
                            : "/dashboard/studio"
                        }
                      >
                        {data && !data.metaConnected ? "Connect Meta" : "Open Studio"}
                      </Link>
                    </div>
                  )}

                  {data?.nextUp ? (
                    <Link
                      href="/dashboard/calendar"
                      className="pb-fig-nextup"
                      aria-label={`Next up in ${nextUpCountdown(data.nextUp.scheduledFor)}`}
                    >
                      <div className="kicker">Next up</div>
                      <div className="row">
                        <div>
                          <div className="value">{nextUpCountdown(data.nextUp.scheduledFor)}</div>
                          <div className="demo">{postTitle(data.nextUp.copy)}</div>
                        </div>
                        <div className="thumb-wrap">
                          {(data.nextUpImage || data.nextUp.mediaUrl || data.nextUp.mediaUrls?.[0]) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={
                                data.nextUpImage ||
                                data.nextUp.mediaUrl ||
                                data.nextUp.mediaUrls?.[0] ||
                                ""
                              }
                              alt=""
                            />
                          ) : (
                            <CalendarDays size={20} aria-hidden />
                          )}
                        </div>
                      </div>
                      <div className="delta">{formatShortDate(data.nextUp)}</div>
                    </Link>
                  ) : (
                    <Link
                      href="/dashboard/calendar"
                      className="pb-fig-nextup"
                      aria-label="Nothing scheduled — open schedule"
                    >
                      <div className="kicker">Next up</div>
                      <div className="row">
                        <div>
                          <div className="value">—</div>
                          <div className="demo">Nothing scheduled yet</div>
                        </div>
                        <div className="thumb-wrap empty" aria-hidden>
                          <CalendarDays size={20} />
                        </div>
                      </div>
                      <div className="delta">Schedule</div>
                    </Link>
                  )}
                </div>

                <section className="pb-fig-coming" aria-label="Coming up">
                  <div className="pb-fig-coming-head">
                    <h2>Coming up</h2>
                    <span className="pb-fig-chip">
                      <CalendarDays size={12} aria-hidden />
                      This week
                    </span>
                  </div>
                  {comingUp.length === 0 ? (
                    <div className="pb-fig-empty">
                      <p>Nothing queued yet — create a post to fill this week.</p>
                      <Link href="/dashboard/studio" className="pb-fig-see-all" style={{ marginTop: 10 }}>
                        Open Studio
                      </Link>
                    </div>
                  ) : (
                    <ul className="pb-fig-rows">
                      {comingUp.map((post) => {
                        const img = post.mediaUrl ?? post.mediaUrls?.[0] ?? null;
                        return (
                          <li key={post.id}>
                            {img ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img className="thumb" src={img} alt="" />
                            ) : (
                              <span className="thumb" aria-hidden />
                            )}
                            <div>
                              <p className="t">{postTitle(post.copy)}</p>
                              <p className="when">
                                {post.scheduledFor
                                  ? formatScheduleLabel(post)
                                  : formatShortDate(post)}
                              </p>
                            </div>
                            <Link
                              href="/dashboard/calendar"
                              className="ico"
                              aria-label="Open in schedule"
                            >
                              <MoreHorizontal size={15} />
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <Link href="/dashboard/calendar" className="pb-fig-see-all">
                    View schedule
                  </Link>
                </section>
              </div>

              <div className="pb-fig-right">
                <section className="pb-fig-promo" ref={promoRef} aria-roledescription="carousel">
                  {slide ? (
                    <>
                      {holidayImage(slide) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={slide.dateKey || slide.title}
                          ref={imgRef}
                          className="slide-img"
                          src={holidayImage(slide) || undefined}
                          alt=""
                        />
                      ) : (
                        <div
                          className="slide-img"
                          aria-hidden
                          style={{
                            background: `linear-gradient(145deg, hsl(${210 + (slide.grad % 5) * 28} 28% 28%), hsl(${210 + (slide.grad % 5) * 28} 18% 14%))`,
                          }}
                        />
                      )}
                      <div className="shade" aria-hidden />
                      <div className="inner">
                        <div className="copy">
                          <h3>{slide.title}</h3>
                          <p className="date">{slide.date}</p>
                          <Link
                            href={`/dashboard/studio?brief=${encodeURIComponent(slide.brief)}`}
                            className="cta"
                          >
                            Create Post
                          </Link>
                        </div>
                        <div className="pager">
                          <div className="dots">
                            {holidays.map((h, i) => (
                              <button
                                key={h.dateKey || h.title}
                                type="button"
                                className={i === holidayIndex ? "on" : ""}
                                aria-label={`Show ${h.title}`}
                                aria-current={i === holidayIndex ? "true" : undefined}
                                onClick={() => goHoliday(i)}
                              />
                            ))}
                          </div>
                          <div className="arrows">
                            <button type="button" aria-label="Previous holiday" onClick={() => goHoliday("prev")}>
                              <ChevronLeft size={15} />
                            </button>
                            <button type="button" aria-label="Next holiday" onClick={() => goHoliday("next")}>
                              <ChevronRight size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : null}
                </section>

                <MonthCalendar
                  cursor={calCursor}
                  onPrev={() =>
                    setCalCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
                  }
                  onNext={() =>
                    setCalCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
                  }
                  markedDays={markedDays}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
