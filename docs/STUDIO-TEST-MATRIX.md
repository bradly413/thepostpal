# Studio test matrix

Manual + automated coverage for `/dashboard/studio` (Posterboy Studio).

## Quick commands

```bash
# Unit + API contract tests (fast, no browser)
npm run test:studio

# Full unit suite
npm run test

# E2E smoke (needs dev server + DB — see below)
npm run test:e2e
```

**E2E prerequisites:** `.env.local` with `DATABASE_URL`, app reachable at `http://127.0.0.1:8240`, demo user `demo` / `demo123`.

Playwright reuses an existing dev server when one is already running on port 8240.

---

## Automated coverage map

| Layer | File | What it proves |
|-------|------|----------------|
| Intent routing | `src/lib/studio/scene-intent.test.ts` | Scenic vs listing detection, platform inference |
| Reprompt routing | `src/lib/__tests__/reprompt-delta.test.ts` | Edit vs fresh-subject decisions |
| Image path routing | `src/lib/studio/studio-image-routing.test.ts` | Listing gate, passthrough, reprompt, compose |
| Compose API | `src/app/api/studio/compose/route.test.ts` | `listing_photo_required` 422 |
| Generate API | `src/app/api/generate-image/route.test.ts` | Unreadable/missing listing reference 422 |
| E2E smoke | `e2e/studio.spec.ts` | UI gates, listing passthrough, mocked scenic gen |

---

## Manual checklist

Record **Pass / Fail / Notes** when validating image quality or before a release.

### Fixture prompts

```
# Listing (P0)
make an instagram post about my new listing 223 victor ct. in ballwin, mo 63021

# Scenic
a palm tree on the beach

# Business
make an instagram post about our weekend happy hour

# Reprompt — run after generating a cupcake
brighter closeup of the cupcake

# Fresh subject — should NOT reprompt from cupcake
a burger
```

### Fixture images

- `e2e/fixtures/listing-sample.jpg` — any real exterior listing photo also works for manual runs

---

## Scenario matrix

| # | Scenario | Steps | Expected | Auto? |
|---|----------|-------|----------|-------|
| **Prompt bar** |
| 1 | Empty idle | Open Studio | Rotating placeholder; Create disabled | E2E |
| 2 | Prefix mode | Type `thanksgiving` only | Composes as Instagram post about thanksgiving | Manual |
| 3 | Full sentence | Type `make a facebook post about…` | Uses literal brief; exits prefix mode | Manual |
| 4 | Ideas intent | Ideas → pick template + detail | Intent placeholder; structured brief | Manual |
| **Listing (P0)** |
| 5 | Listing, no photo | Listing prompt, no attach | Pink nudge; **Add listing photo**; no generation | E2E + API |
| 6 | Listing + photo | Attach property JPG → Create | **Your photo** on canvas (4:5 crop), not AI props | E2E |
| 7 | Upload race | Attach + click before thumb | **Uploading…** until thumbnail visible | Manual |
| **Generation** |
| 8 | Scenic | `a palm tree` | Wide tropical scene; level horizon | Manual |
| 9 | Business | `weekend happy hour` | Documentary local-business look | Manual |
| 10 | With reference | Food brief + food photo | Same subject preserved | Manual |
| 11 | Pro model | Pro chip (if entitled) | Pro / 2K toggle | Manual |
| **Post-generation** |
| 12 | Reprompt edit | `brighter closeup` on done image | Edits canvas image; same subject | Unit + Manual |
| 13 | New subject | `a burger` after cupcake | Fresh compose, not edit | Unit |
| 14 | New image | **New image** button | Canvas clears; idle prompt bar | Manual |
| 15 | Caption | **Write caption** | Auto-starts; no extra brief question | Manual |
| 16 | Caption rotate | **Another** with variants | Cycles in place | Manual |
| 17 | History | Pick from gallery | Adopts image + prompt anchor | Manual |
| **Edge** |
| 18 | Video switch | Toggle video with image on canvas | Confirm discard dialog | Manual |
| 19 | Platform menu | Switch platform | Aspect chip updates | Manual |
| 20 | Multiline | Shift+Enter vs Enter | Newline vs submit | Manual |

---

## Release smoke (5 min)

1. Row **5** — listing gate  
2. Row **6** — listing passthrough with real photo  
3. Row **12** — reprompt preserves subject  
4. Row **8** — one scenic prompt (subjective quality check)  
5. `npm run test:studio` — all green  

---

## Adding a new Studio scenario

1. Add a row to the matrix above.  
2. If it's **routing logic** → extend `studio-image-routing.test.ts`.  
3. If it's an **API contract** → extend `compose/route.test.ts` or `generate-image/route.test.ts`.  
4. If it's **UI state** → add a Playwright spec in `e2e/studio.spec.ts` (mock AI routes when possible).
