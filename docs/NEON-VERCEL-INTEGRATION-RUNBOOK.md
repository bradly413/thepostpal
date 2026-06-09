# Neon ↔ Vercel Integration Runbook — Posterboy Social

Last verified: 2026-06-09

## Current production state

- Vercel project: `angie-social-portal`
- Vercel scope: `bradly413s-projects`
- Neon project: `posterboy-prod`
- Neon branch: `production`
- `DATABASE_URL` is currently a **manual** Vercel environment variable
- Neon Console `Integrations` showed `Vercel` with an `Add` button, which means the integration is **not connected yet**

This is the root-cause durability gap: if Brad rotates the Neon password today, he must also hand-edit `DATABASE_URL` in Vercel and redeploy before production can recover.

## Brad's click-path to connect Neon to Vercel

Use Neon as the source of truth for the integration.

1. Open Neon Console.
2. Open project `posterboy-prod`.
3. Open `Integrations`.
4. On the `Vercel` card, click `Add`.
5. Authorize/select the Vercel scope `bradly413s-projects` if prompted.
6. Select the Vercel project `angie-social-portal`.
7. Attach the Neon production branch to the Vercel production environment using Neon-managed variables.
8. Finish the integration flow.

## Brad's click-path to confirm the integration on Vercel

1. Open Vercel.
2. Open project `angie-social-portal`.
3. Open `Storage`.
4. Confirm Neon now appears as a connected storage/integration resource instead of only Upstash.
5. Open `Settings` → `Environment Variables`.
6. Confirm `DATABASE_URL` is integration-managed rather than a hand-maintained manual secret.

## Password rotation after the integration is connected

Goal: make the leaked Neon password unusable without creating a second manual env-sync step.

1. In Neon, open the production database credentials for the application role.
2. Rotate/reset the password for that role.
3. Let the Neon↔Vercel integration propagate the updated connection string.
4. In Vercel `Settings` → `Environment Variables`, confirm the managed `DATABASE_URL` shows an updated value timestamp.
5. Trigger a fresh production deployment.
6. Smoke-test production:
   - `/api/posts`
   - `/api/calendar`
   - `/api/meta/*`
   - `/api/cron/publish`

## If the integration cannot manage the exact variable automatically

Do not leave the project on the current fully manual setup without documenting it. If the integration flow only provisions a new managed variable or requires a one-time remap:

1. Keep the Neon integration connected anyway
2. Update the runtime to use the integration-managed variable
3. Remove the old manual `DATABASE_URL`
4. Redeploy immediately after the cutover

## Required follow-up security actions

After the integration is live:

1. Rotate the exposed Neon password
2. Rotate the exposed AWS IAM access key pair
3. Keep all secrets in env only
4. Do not paste live credentials into chat, docs, or tracked files
