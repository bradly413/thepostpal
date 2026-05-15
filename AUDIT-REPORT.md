# Design & UX Audit Report

**Project:** thepostpal (angie-social-portal)  
**Date:** 2026-05-15  
**Scope:** All dashboard pages except AI Assistant  

Severity: **C** = Critical, **M** = Moderate, **m** = minor

---

## Global / Shell Issues

| # | Sev | Finding | File:Line |
|---|-----|---------|-----------|
| G1 | M | Sidebar nav highlight uses hardcoded `#0c0c0e` background color, breaks in light mode (highlight pill stays dark) | `DashboardShell.tsx:248` |
| G2 | m | Sidebar `direction: rtl` hack for scrollbar placement may cause text rendering issues in some browsers | `DashboardShell.tsx:195` |
| G3 | m | Mobile drawer has no focus trap — keyboard users can tab behind the overlay | `DashboardShell.tsx:369-407` |
| G4 | m | Footer "Logout" only visible via caret popover; easy to miss. No keyboard shortcut or visible link by default | `DashboardShell.tsx:526-538` |
| G5 | m | Vimeo nav item is external link (`https://vimeo.com`) — no internal Vimeo page exists despite being listed in nav | `DashboardShell.tsx:30` |
| G6 | m | Theme toggle in collapsed sidebar has no tooltip; looks like an orphaned knob | `DashboardShell.tsx:510-524` |

---

## Dashboard (Main Landing)

**File:** `src/app/dashboard/page.tsx`

| # | Sev | Finding | Line |
|---|-----|---------|------|
| D1 | M | `HERO_SLIDES` has 3 of 4 items with `src: ""` — shows empty gradient placeholders instead of actual preview images | `:369-373` |
| D2 | M | `FALLBACK_VIDEOS` has `src: ""` for all items — if Vimeo API fails, video carousel shows blank gradient slides with non-functional play buttons | `:13-17` |
| D3 | m | Dashboard bento grid uses `lg:overflow-hidden` which clips content on exactly-lg-sized screens if items are tall | `:580` |
| D4 | m | `eslint-disable @next/next/no-img-element` at top — using `<img>` instead of `next/image` throughout; loses optimization | `:3` |
| D5 | m | `filter` state is declared but never exposed as a UI control (no filter buttons on dashboard) | `:559` |
| D6 | m | AI Assistant card input has no visible label or `aria-label` attribute | `:109-117` |
| D7 | m | Video modal `role="presentation"` should be `role="dialog"` with `aria-modal="true"` for accessibility | `:266-268` |

---

## Templates

**File:** `src/app/dashboard/templates/page.tsx`

| # | Sev | Finding | Line |
|---|-----|---------|------|
| T1 | m | Pillar filter scroll container hides scrollbar with `scrollbarWidth: none` — no visual cue that more filters exist off-screen | `:135` |
| T2 | m | "New Post" button always links to first template (`templates[0]?.id`) instead of opening a template chooser | `:87` |
| T3 | m | Template preview cards show text-based placeholders (logo + default field values) rather than actual template previews for most items | `:173-189` |

---

## Calendar

**File:** `src/app/dashboard/calendar/page.tsx`

| # | Sev | Finding | Line |
|---|-----|---------|------|
| C1 | M | `window.confirm()` used for delete actions — breaks the glassmorphism UI with a native browser dialog | `:267, :292` |
| C2 | m | Calendar month cells have nested `<button>` inside `<button>` (cell is a button, events inside are buttons) — invalid HTML, screen reader confusion | `:424-466` |
| C3 | m | "+N more" overflow counter math looks wrong: `totalItems > (holiday ? 3 : 4)` but only slices 2 events + 2 posts = 4 shown, should be totalItems > 4 + (holiday ? 1 : 0) | `:462` |
| C4 | m | `meta` is read with `typeof window !== "undefined"` guard but used without null check in the template | `:83` |

---

## Photos

**File:** `src/app/dashboard/photos/page.tsx`

| # | Sev | Finding | Line |
|---|-----|---------|------|
| P1 | M | Photos stored as base64 data URLs in localStorage — will hit the ~5MB storage limit quickly with just a few photos | `:28-34` |
| P2 | m | `isUserPhoto` detection uses `id.length > 6` — fragile heuristic, brand photos with long IDs would be misidentified | `:53` |
| P3 | m | Empty state is well-designed. No issues. | — |
| P4 | m | "Edit in Creator Studio" button hardcodes link to `/dashboard/editor/photo-overlay` regardless of which photo is selected | `:152` |
| P5 | m | Photo modal lacks keyboard close (no Escape handler, unlike the video modal on dashboard) | `:177-196` |

---

## Videos

**File:** `src/app/dashboard/videos/page.tsx`

| # | Sev | Finding | Line |
|---|-----|---------|------|
| V1 | m | Local uploaded videos use `URL.createObjectURL` — URLs are session-only, uploads vanish on page refresh (no persistence) | `:49-72` |
| V2 | m | Error handling: Vimeo fetch failure shows generic "Failed to load videos" — no retry mechanism | `:33-34` |
| V3 | m | Video player modal lacks Escape key handler to close | `:261-291` |
| V4 | m | Vimeo iframe missing `title` attribute — accessibility issue | `:280-285` |

---

## Create Image

**File:** `src/app/dashboard/create-image/page.tsx`

| # | Sev | Finding | Line |
|---|-----|---------|------|
| CI1 | M | SVG filter-based silk background with 5 animated layers + displacement maps is very GPU-intensive; may cause jank on lower-end devices | `:330-348` |
| CI2 | m | `SIZES` array has duplicate `1:1` value for both "Instagram Post" and "Facebook Post" — different labels same output | `:15-21` |
| CI3 | m | "Template" and "Edit" hover action buttons are no-ops (`onClick` does `e.stopPropagation()` only) | `:407-422` |
| CI4 | m | Generated images stored in component state only — all images lost on navigation; no persistence | `:54` |
| CI5 | m | `catch { /* silent fail */ }` on enhance prompt — user gets no feedback if enhancement fails | `:126` |
| CI6 | m | Aspect ratio display doesn't update when non-1:1 ratio selected — carousel always uses `aspectRatio: "1"` | `:377` |

---

## Create Video

**File:** `src/app/dashboard/create-video/page.tsx`

| # | Sev | Finding | Line |
|---|-----|---------|------|
| CV1 | C | "Generate Video" button is completely non-functional — no `onClick` handler, no API call | `:82-85` |
| CV2 | M | Page uses `blue-500` for active states instead of the app's `accent` color — visually inconsistent with the rest of the app | `:40, 60, 78, 83` |
| CV3 | M | Static "coming soon" banner at bottom contradicts the functional-looking form above — confusing UX; form should either be disabled or banner should be more prominent | `:89-93` |
| CV4 | m | Page uses `font-semibold` for heading instead of `font-heading` font family used everywhere else | `:28` |
| CV5 | m | No page-level description/subtitle styling match (other pages use `text-text-secondary mt-1`, this uses `text-text-secondary/60 mb-8`) | `:29` |

---

## My Brand

**File:** `src/app/dashboard/brand/page.tsx`

| # | Sev | Finding | Line |
|---|-----|---------|------|
| B1 | m | Brand page is read-only — no way to edit brand information, upload new logos, or modify colors | — |
| B2 | m | Photography tab references brand images at `/brand/` paths — if any are missing, broken images with no fallback | `:447-463` |
| B3 | m | Tab navigation hides scrollbar (`scrollbarWidth: none`) on small screens with no indication of overflow | `:45` |

---

## Facebook

**File:** `src/app/dashboard/facebook/page.tsx`

| # | Sev | Finding | Line |
|---|-----|---------|------|
| FB1 | C | Dynamic Tailwind classes `text-${stat.color}` will NOT work — Tailwind purges classes not found as complete strings in source. Colors `text-accent`, `text-success`, `text-accent-cyan`, `text-warning` won't render | `:117` |
| FB2 | m | Disconnected state has good empty state design with CTA to Settings | — |
| FB3 | m | Scheduled/Published post lists have no link to edit posts — clicking does nothing | `:170-185` |
| FB4 | m | `img` elements for Facebook post pictures have no error handling — broken image if URL expires | `:136-139` |

---

## Instagram

**File:** `src/app/dashboard/instagram/page.tsx`

| # | Sev | Finding | Line |
|---|-----|---------|------|
| IG1 | C | Same dynamic Tailwind class bug as Facebook — `text-${stat.color}` won't be purged correctly | `:118` |
| IG2 | m | Media grid uses `img` with direct Instagram CDN URLs — these expire, will show broken images after token refresh | `:145` |
| IG3 | m | Engagement rate calculation divides by `media.length` (visible posts) not total posts — may be misleading | `:62-64` |
| IG4 | m | `img` in media grid uses `alt={item.caption?.slice(0, 60)}` — captions can contain hashtags/special chars making poor alt text | `:146` |

---

## Reports

**File:** `src/app/dashboard/reports/page.tsx`

| # | Sev | Finding | Line |
|---|-----|---------|------|
| R1 | C | Same dynamic Tailwind class bug — `bg-${stat.color}/10 text-${stat.color}` in stat cards won't render | `:78` |
| R2 | m | All data is derived from localStorage scheduled posts — no real analytics; numbers are activity counts not engagement | — |
| R3 | m | "Reports" also appears as a tab in Settings page — two different report views, potential confusion | Settings `:111, 385-408` |
| R4 | m | No export or download functionality for reports data | — |

---

## Settings

**File:** `src/app/dashboard/settings/page.tsx`

| # | Sev | Finding | Line |
|---|-----|---------|------|
| S1 | M | Profile data (name, email, phone) is hardcoded as default state and persisted to localStorage — not connected to any backend | `:23-30` |
| S2 | M | "Knowledge Base" tab shows hardcoded fake documents with a non-functional "Upload Document" button and non-functional "View" buttons | `:359-382` |
| S3 | M | "Reports" tab inside Settings shows hardcoded fake stats ("24 posts", "12.4K reach") not derived from actual data | `:385-408` |
| S4 | m | Legal tab items are styled as clickable (cursor, hover) but have no `onClick` or `href` — dead ends | `:423` |
| S5 | m | "Change Password" shows "Coming soon" badge — acceptable but should be noted | `:284` |
| S6 | m | Notifications settings are saved to localStorage but there's no notification system to use them | `:39-43` |
| S7 | m | Meta OAuth uses `process.env.NEXT_PUBLIC_META_APP_ID` — will silently fail with unclear error if not set | `:84-88` |

---

## Summary by Severity

| Severity | Count | Description |
|----------|-------|-------------|
| **Critical** | 4 | Dynamic Tailwind classes on Facebook, Instagram, Reports pages won't render (FB1, IG1, R1); Create Video button non-functional (CV1) |
| **Moderate** | 11 | Placeholder/fake content, visual inconsistencies, light-mode bugs, localStorage limitations |
| **Minor** | 34 | Accessibility gaps, missing keyboard handlers, dead buttons, minor UX polish |

---

## Top Priority Fixes

1. **Fix dynamic Tailwind classes** (FB1, IG1, R1) — Replace `text-${stat.color}` with a lookup map of complete class strings. This is a rendering bug visible on every page load.
2. **Create Video page** (CV1, CV2) — Either wire up the generate button or redesign as an explicit "coming soon" page. Current state is misleading.
3. **Create Video color inconsistency** (CV2) — Replace `blue-500` with `accent` throughout to match the app theme.
4. **Calendar nested buttons** (C2) — Replace outer `<button>` with `<div role="button" tabIndex={0}>` or restructure.
5. **Sidebar light-mode highlight** (G1) — Use CSS variable or theme-aware color for the nav highlight background.
