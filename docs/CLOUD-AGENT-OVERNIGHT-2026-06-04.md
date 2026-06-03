# Cloud Agent — Phase 0 setup

**Goal:** Run [MIGRATION plan Phase 0](./MIGRATION-LOCALSTORAGE-TO-DASHBOARD-API.md#phase-0--type-hygiene--zero-behavior-change-½-day) overnight — extract view types, delete dead `schedule-store` / `events-store` / `meta-store`, no UI changes.

| Item | Path |
|------|------|
| **Prompt (copy-paste)** | [`docs/cloud-agent/PHASE-0-PROMPT.txt`](./cloud-agent/PHASE-0-PROMPT.txt) |
| **API launcher (optional)** | `./scripts/start-cloud-agent-phase-0.sh` |
| **Repo** | `https://github.com/bradly413/thepostpal` |
| **Base branch** | `main` |
| **Output branch** | `chore/migrate-dead-stores-phase-0` |

---

## Option A — Cursor UI (no API key)

1. **Cursor** → **Agents** → **New Cloud Agent**
2. Repository: **bradly413/thepostpal**, start from **main**
3. Open [`docs/cloud-agent/PHASE-0-PROMPT.txt`](./cloud-agent/PHASE-0-PROMPT.txt) → select all → paste into the agent prompt
4. Turn on **Create PR when finished** (recommended)
5. **Start** — wait until status is **Running**
6. **Close laptop**

**Morning:** Agent URL in Cursor, or GitHub branch / PR `chore/migrate-dead-stores-phase-0`.

---

## Option B — API script (then close laptop)

```bash
cd ~/Desktop/ventures/thepostpal

# Add to .env.local (gitignored) or export in shell:
# CURSOR_API_KEY=cursor_...   # https://cursor.com/dashboard → API Keys

chmod +x scripts/start-cloud-agent-phase-0.sh
./scripts/start-cloud-agent-phase-0.sh
```

Script loads `CURSOR_API_KEY` from the environment or `.env.local`, posts to `POST https://api.cursor.com/v1/agents` with `autoCreatePR: true`, and prints the agent dashboard URL.

Without `CURSOR_API_KEY`, the script prints Option A steps.

**Already done locally?** Phase 0 may exist on branch `chore/migrate-dead-stores-phase-0` — skip the cloud agent and review that PR instead.

---

## What Phase 0 will change

| Action | Files |
|--------|--------|
| Add | `src/lib/dashboard-view-types.ts`, `src/lib/draft-status.ts` |
| Update imports | `scheduled-post-mappers.ts`, `use-dashboard-scheduled-posts.ts`, calendar, facebook, instagram |
| Delete (when unused) | `schedule-store.ts`, `events-store.ts`, `meta-store.ts` |

**Not touched:** editor `photo-store`, `issues-store`, `organization-store`, analytics logic (already on API).

---

## Success criteria (review tomorrow)

- [ ] `npx tsc --noEmit` and `npm run build` green on the branch
- [ ] No imports of `schedule-store` / `events-store` / `meta-store` in `src/`
- [ ] PR or branch ready for your review — **you merge to main** when happy (triggers prod deploy)

---

## Do not ask the agent to

- Push to `main` or deploy production
- Set Vercel / Neon env vars
- Run Phase 1–4 of the migration doc
