# Orphaned dashboard pages — review for deletion

_Generated 2026-06-03 during the dashboard warm-light unification._

While unifying the dashboard onto the warm-light `pb-app` design system, I
migrated the **6 live dark pages** (settings, calendar, ads, templates, photos,
editor). The pages below were **left untouched** per Brad's call ("flag for
review, leave as-is") because they appear to be orphaned or superseded.

## Evidence

Reachability was measured by counting inbound `/dashboard/<route>` references
across `src/` (excluding the page's own file) and whether the route appears in
the primary nav (`DashboardShell.tsx`).

| Page | Inbound links | In nav | Theme | Likely status |
|------|---------------|--------|-------|---------------|
| `facebook` | 0 | no | dark | Superseded by Meta connect in settings + analytics |
| `instagram` | 0 | no | dark | Superseded (same as facebook) |
| `knowledge` | 0 | no | dark | Folded into `settings` → "Knowledge Base" tab |
| `reports` | 0 | no | dark | Folded into `settings` → "Reports" tab + `analytics` |
| `create-image` | 0 | no | dark | Superseded by `studio` (Posterboy Studio) |
| `create-video` | 0 | no | dark | Superseded / never linked |
| `creator-studio` | 0 | no | dark | Superseded by `studio` |
| `videos` | 0 | no | dark | Never linked; local-blob thumbnailer only |
| `ai-assistant` | 0 | no | dark | Never linked |
| `feedback` | 0 | no | dark | Superseded by the floating FeedbackWidget |

All ten have **zero inbound links** and are **absent from the nav**, so a user
cannot reach them through the UI (only by typing the URL directly).

## Overlap / duplication notes

- **Image creation** has three overlapping surfaces: `studio` (the live one,
  in nav as "Create"), `creator-studio`, and `create-image`. The latter two
  look like earlier iterations of the same flow.
- **`facebook` / `instagram`** predate the unified Meta connection flow now
  living in `settings` → Account and `analytics`.
- **`knowledge` / `reports`** duplicate the same-named tabs already inside
  `settings`.

## Recommendation

Safe to **delete** the clearly-superseded ones after a quick confirm:
`create-image`, `create-video`, `creator-studio`, `facebook`, `instagram`,
`knowledge`, `reports`, `ai-assistant`, `feedback`. Keep `videos` only if a
video library is on the roadmap (otherwise delete).

Before deleting any: re-grep for the route string and check `DashboardShell`
nav + any `router.push`/`<Link>` added since this audit. None reference them
today.

_No code was changed for these pages in this pass._
