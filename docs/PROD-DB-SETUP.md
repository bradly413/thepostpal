# Production database setup (Neon) — Tier-0 deploy gate

The dashboard runs on Postgres + Prisma with app-managed RLS (`withTenantDb` sets
`app.current_tenant_id` per transaction). Production needs a hosted Postgres with
the migrations applied. This is the **one blocker** nothing else can proceed without.

Recommended: **Neon** (serverless Postgres). Supabase also works — if you use it,
take its **connection string** only; you don't need Supabase Auth/RLS (ours is in Prisma).

---

## 1. Create the database (Neon)
1. Go to https://neon.tech → sign up / log in (GitHub login is fine).
2. **Create project** → name it `posterboy-prod` → region closest to your Vercel
   region (US East if unsure) → Postgres 16.
3. After creation, open **Connection Details**. Neon gives two host forms:
   - **Pooled** host — contains `-pooler` in the hostname (for the app at runtime).
   - **Direct** host — no `-pooler` (for running migrations).
   Copy both connection strings. They look like:
   ```
   postgresql://USER:PASSWORD@ep-xxxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require   # pooled
   postgresql://USER:PASSWORD@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require           # direct
   ```

## 2. Apply schema + RLS to prod (uses the DIRECT url)
From the repo root, run the safe migration script with the **direct** string:
```bash
./scripts/deploy-prod-db.sh "postgresql://USER:PASSWORD@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
```
It shows pending migrations, asks to confirm, runs `prisma migrate deploy`
(no data loss), and verifies the RLS migration landed.

## 3. Set DATABASE_URL on Vercel (use the POOLED url)
Serverless functions should use the pooled connection. Append the pgbouncer flags:
```bash
npx vercel env add DATABASE_URL production --scope bradly413s-projects
# paste:
# postgresql://USER:PASSWORD@ep-xxxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connection_limit=1
```
(`pgbouncer=true` tells Prisma to skip prepared statements, which the pooler can't hold;
`connection_limit=1` keeps each serverless invocation lean.)

> If you'd rather keep it dead simple for beta, you can set DATABASE_URL to the
> **direct** url for both steps — fine at low traffic, just less efficient under load.

## 4. (Optional) pull it down to verify
```bash
npx vercel env pull .env.production.local --environment=production --scope bradly413s-projects
grep DATABASE_URL .env.production.local
```

---

## After the DB is live
Set the remaining Tier-1 vars from `docs/PROD-ENV-CHECKLIST.md` (Leonardo, Upstash,
S3, Stripe, `NEXT_PUBLIC_APP_URL`), then merge `pricing/solo-command-june-2026` → `main`
to deploy. Post-deploy smoke test:
1. Sign in (`demo`/`demo123`) → confirm dashboard loads (no 500s).
2. `/api/me` returns a plan.
3. Upload a photo, create a calendar event — both persist.
4. Sign up a fresh account → sees only its own location (RLS isolation holds).
5. Re-login any pre-existing demo sessions (they predate DB provisioning).

## Notes
- Free Neon projects auto-suspend on idle; first request after idle has a cold start
  (~1s). Fine for beta. Upgrade the plan if you want always-on.
- Keep the connection string out of git — it only lives in Vercel env + your local
  `.env*.local` (gitignored).
