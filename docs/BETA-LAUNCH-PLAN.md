# Closed Beta — Launch Plan & Fleet Task Briefs (2026-06-09)

**Target:** Closed beta — invite a handful of testers, add each as a **Meta app Tester** (no App Review needed). Est. **3–5 focused days** across the fleet.

**Repo:** `~/Desktop/ventures/thepostpal/` · **Prod:** Vercel `angie-social-portal` (`bradly413s-projects`), `main` auto-deploys to https://www.posterboysocial.com · **DB:** Neon Postgres + Prisma + app-managed RLS · dev server `localhost:8240`.

**Shared-tree note:** all agents work the same working tree. Commit in small logical chunks; **Gemini owns prod deploys**. Don't push half-done work to `main` (it auto-deploys).

---

## Blocker status (must be done for closed beta)
1. Meta engine → prod — **Gemini**
2. Scheduled auto-publish verified on prod — **Gemini/Codex**
3. Meta token refresh (60-day expiry) — **Gemini/Codex**
4. Error monitoring + crash alerts (none today) — **Codex**
5. Security cleanup (rotate leaked creds, encrypt tokens, fix 401-mask) — **Codex**
6. Privacy + ToS pages — **Cursor**
7. Real compose→publish UI path on prod — **Cursor/Claude**

---

# ───────────────  BRIEF: GEMINI (backend / architect / deploys)  ───────────────

You own backend + production deploys for Posterboy Social. The Meta publishing engine is **proven working locally** (real FB post published) but is **not on production**. Get it live for a closed beta, harden scheduling, and add token refresh.

**Context you need**
- Meta OAuth: `src/app/api/auth/meta/login` + `/callback`; helper `src/lib/meta.ts`; publish via `src/lib/social/meta-publisher.ts#publishToMeta(accountId, imageUrl, caption)`.
- Prisma model `SocialAccount` (in `prisma/schema.prisma`) + migration `prisma/migrations/20260518143000_social_account/` are **drafted/uncommitted** — they've NEVER shipped to prod, so Neon lacks the table.
- Meta app id `4470114259980817`, Development mode. Permissions already configured (pages_show_list/manage_posts/read_engagement, instagram_basic, instagram_content_publish).
- Scheduled publish cron exists: `vercel.json` → `/api/cron/publish` every 5 min. The `20260518120000_scheduled_post_meta_publish` migration added `mediaUrl/mediaType/errorLog` + a `failed` status.

**Tasks**
1. **Ship the Meta engine to prod.**
   - Commit the held files: `prisma/schema.prisma` (SocialAccount), the `20260518143000_social_account` migration, `src/lib/meta.ts`, `src/app/api/auth/meta/**`, `src/lib/social/**`, `src/app/api/test-publish/**`.
   - Apply the migration to **Neon prod** with `prisma migrate deploy` (NEVER `migrate dev` against Neon — it can reset the DB). Use `scripts/deploy-prod-db.sh` if present.
   - Set prod env on Vercel (coordinate with Brad — agents can't set prod env): `NEXT_PUBLIC_META_APP_ID`, `META_APP_SECRET`, `NEXT_PUBLIC_APP_URL=https://www.posterboysocial.com`, `META_AUTH_REDIRECT_URI=https://www.posterboysocial.com/api/auth/meta/callback`.
   - Add `https://www.posterboysocial.com/api/auth/meta/callback` to the Meta app's Facebook-Login "Valid OAuth Redirect URIs".
2. **Verify scheduled auto-publish on prod end-to-end.** Confirm `/api/cron/publish` selects due `scheduled` posts and calls `publishToMeta`, writes `failed` + `errorLog` on failure, and is protected by `CRON_SECRET`. Add structured logging. Prove it: schedule a post on prod, confirm it posts within 5 min.
3. **Meta token refresh.** Tokens expire ~60 days (`SocialAccount.tokenExpiresAt`). Add a refresh path (FB `fb_exchange_token` long-lived refresh) via a daily cron or inside the publish cron when near expiry. Never let a beta tester's connection silently die.

**Acceptance criteria**
- [ ] `SocialAccount` table exists on Neon; OAuth connect works on `posterboysocial.com`.
- [ ] A post scheduled in the prod UI auto-publishes to its FB Page within 5 min; failures set `status=failed` + `errorLog`.
- [ ] Tokens refresh before expiry (verifiable in code + a dry-run).
- [ ] Prod deploy green; no secrets committed (env only).

---

# ───────────────  BRIEF: CODEX (data / Prisma / security)  ───────────────

You own data + security. Close the security gaps before testers touch prod.

**Tasks**
1. **Encrypt Meta tokens at rest.** `SocialAccount.accessToken` is stored **plaintext**. Add app-level encryption (AES-256-GCM with a new `TOKEN_ENC_KEY` env): encrypt on write in `src/app/api/auth/meta/callback` (+ `src/lib/social/social-account-db.ts`), decrypt in `publishToMeta`. Migrate existing rows.
2. **Fix error-masking auth catch-alls.** `src/app/api/posts/route.ts` has blanket `catch { return 401 }` (lines ~53, ~96) that masks DB/logic errors as "Unauthorized" (this caused a phantom dashboard "Unauthorized" earlier). Return proper 500 with a safe message; only 401 on genuine auth failure. Audit other routes for the same pattern.
3. **Stand up error monitoring.** Integrate Sentry (client + server + the `/api/cron/publish` job). Wire alerting so Brad sees tester crashes. No monitoring exists today.
4. **Fix local `prisma migrate dev`.** It fails on a shadow-DB history bug (`DraftStatus` enum referenced before creation during replay). Repair migration ordering so `migrate dev` works again (doesn't affect `migrate deploy`, but blocks local dev).
5. **RLS isolation audit.** Confirm every tenant route is scoped (`requireAuthContext` → `withTenantDb` → `resolveAccess`). `/api/photos` is confirmed clean — audit posts, calendar, brand-book, meta, upload. Produce a short findings doc.
6. **Coordinate credential rotation.** The Neon DB password and AWS IAM keys were pasted into chat during setup — flag to Brad to rotate, and ensure all secrets live in env (never code).

**Acceptance criteria**
- [ ] Tokens encrypted in DB (verify a row is ciphertext); publish still works.
- [ ] `/api/posts` returns 500 (not 401) on non-auth errors; auth audit doc committed.
- [ ] Sentry capturing client+server+cron errors with alerting on.
- [ ] `npx prisma migrate dev` runs clean locally.
- [ ] RLS audit doc in `docs/`.

---

# ───────────────  BRIEF: CURSOR (feature engineering)  ───────────────

You own user-facing flows needed for beta.

**Tasks**
1. **Privacy Policy + Terms of Service pages.** `/privacy` and `/terms` are already public in `src/proxy.ts` but need real content. Write proper pages (data handling, Meta/Instagram usage, cookies). **Required for Meta App Review later**, and basic trust for testers.
2. **Account management (Settings → Account).** Today "Change Password" says "Coming soon" and there's no delete-account. Implement: (a) password change, (b) **delete account** in the Danger zone — confirmation modal → server route that tenant-safely deletes the org/user data (cascade) and signs out. Be careful with RLS + cascade.
3. **Real compose → publish path on prod.** Verify/finish the actual user publish flow (editor `src/app/dashboard/editor/[templateId]` and calendar composer → `/api/meta/publish`), independent of the dev-only `/api/test-publish`. A tester must be able to: pick image + caption → choose FB/IG → Publish now or Schedule → it posts. Fix any breaks.
4. **(Fast-follow, lower priority)** Post-type groundwork: carousel / multi-image. Video is out of scope for closed beta.

**Acceptance criteria**
- [ ] `/privacy` + `/terms` render real, reviewable content.
- [ ] Password change works; delete-account fully removes the tenant's data + signs out (tested with a throwaway account).
- [ ] A tester can compose in the UI and publish a real post to their connected FB Page (and IG if linked) — Publish-now and Schedule both verified on prod.

---

## Claude (me) — keeping
Editor crop/layering/undo polish · FE polish + brand-book content (e.g. lowercase name) · end-to-end QA on each agent's work · maintain this plan + briefs · coordinate the shared tree.

## Brad — yours
Meta **App Review + Business Verification** prep (privacy/ToS must be live first) · **add beta testers as Meta app Testers** (App roles → Testers) so they can connect in Dev mode · rotate leaked creds · set prod env vars Gemini needs · AI cost/pricing model · billing/Stripe decision.
