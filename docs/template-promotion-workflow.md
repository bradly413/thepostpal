# Template Promotion Workflow

This document defines the bridge from imported commercial source packs to real, usable Posterboy Social templates inside the product.

## Current State

We have four separate layers today:

1. imported source packs
2. preview/mockup assets
3. normalization specs and shortlists
4. live app templates in `src/lib/templates.ts`

That means the workflow exists, but it is still partially outside the product.

## Goal

Turn the current manual process into a true in-product admin workflow without forcing that migration before the product model is ready.

## Recommended Phases

### Phase 1 — Manual Promotion Bridge (Current)

Source of truth:

- imported pack registry and manifests
- Desktop asset browser / preview inventory
- normalization shortlist/spec documents
- live code-backed template library

Manual promotion steps:

1. ingest source pack
2. classify by vertical and content type
3. shortlist strongest pack(s)
4. define normalized outputs
5. create app-ready template objects
6. commit into live library
7. verify editor route and templates page

This is good enough for launch.

### Phase 2 — In-Product Review Queue

Add an internal admin workflow that sits in front of the live template library.

#### Proposed Core Entities

Existing foundation already points us in this direction with `TemplatePack` and `TemplateFile`.

Add:

- `TemplateDefinition`
- `TemplatePromotion`
- `TemplateReview`
- `TemplateTag`
- `TemplateScope` (`SYSTEM`, `ACCOUNT`, later `LOCATION`)

#### Suggested Lifecycle

- `imported`
- `shortlisted`
- `normalized`
- `review`
- `live`
- `retired`

#### Suggested Admin Screens

1. **Imported Packs**
   - list source packs
   - preview files
   - show vertical/category/license state

2. **Normalization Review**
   - propose 1..N live templates from a source pack
   - assign pillar
   - assign format (`post`, `story`, `carousel`, etc.)
   - define editable fields

3. **Promotion Queue**
   - compare proposed template against existing live library
   - avoid duplicates
   - publish to library

4. **Library Manager**
   - mark live/draft/retired
   - later assign system/account/location visibility

## API Shape To Add Later

- `GET /api/account/template-packs`
- `POST /api/account/template-packs`
- `GET /api/admin/template-normalizations`
- `POST /api/admin/template-normalizations`
- `PATCH /api/admin/template-normalizations/:id`
- `POST /api/admin/templates/promote`
- `PATCH /api/admin/templates/:id`

## Why Not Build Full Admin First

Because the product still has two larger blockers:

- multi-location plus approvals
- production auth hardening

Until those settle, the admin workflow should stay intentionally lightweight.

## Recommendation

Keep Phase 1 for now, but build Phase 2 next after launch-critical auth and multi-location architecture are stable.

That gives us the right order:

1. prove the template library
2. stabilize permissions and account/location model
3. productize the promotion workflow inside the app
