# Sentry Alert Runbook — Posterboy Social production

Last verified: 2026-06-09

## Current production state

- Code capture is wired in `instrumentation.ts`, `instrumentation-client.ts`, and the cron publish route.
- The Vercel production project `angie-social-portal` did **not** have `SENTRY_DSN` or `NEXT_PUBLIC_SENTRY_DSN` set when checked on 2026-06-09.
- Because the DSNs are missing, a forced production error cannot appear in Sentry yet.
- Browser access also did not land in an existing Sentry org session from this machine, so alert rule creation is still blocked until Brad signs into the correct Sentry org.

## Required Vercel env vars

Set these on the Vercel project `angie-social-portal` in the `Production` environment:

```bash
SENTRY_DSN
NEXT_PUBLIC_SENTRY_DSN
SENTRY_ENVIRONMENT=production
```

Optional but recommended:

```bash
SENTRY_TRACES_SAMPLE_RATE=0.1
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.1
```

After adding or editing the DSNs, trigger a fresh production deployment so the runtime picks them up.

## Sentry alert rules to create

Use the production project that receives events from `posterboysocial.com`.

### Rule 1: New production issue

Goal: page/email/Slack on the first occurrence of a new production issue.

Suggested conditions:

- Environment equals `production`
- Event type equals `error`
- Issue state is `unresolved`
- Issue age is less than 1 hour, or use Sentry's built-in "new issue" condition if the UI offers it

Suggested actions:

- Send alert to the production on-call notification target
- Open incident in the configured alert destination if one exists

### Rule 2: Any `/api/cron/*` failure

Goal: alert immediately when cron work starts failing in production.

Suggested conditions:

- Environment equals `production`
- Event type equals `error`
- Tag `route` contains `/api/cron/`

If the UI does not expose route-tag matching cleanly, use one of these fallbacks:

- Tag `job` equals `cron_publish` for the current publish job
- Message or transaction contains `/api/cron/`

Suggested actions:

- Send alert to the same production notification target
- Mark as high priority if the alerting destination supports severity

## Forced-error verification

Run this only after the DSNs are set and production has been redeployed.

1. Trigger a known production server error from a safe route or a temporary explicit test route.
2. Confirm the event appears in Sentry under the production environment.
3. Confirm the alert rule fires to the configured destination.
4. Remove the temporary trigger if you created one solely for testing.

## Blocking note

This repo is ready to emit Sentry events, but the acceptance item "forced prod error appears in Sentry with an alert firing" is blocked until:

1. Brad signs into the correct Sentry org
2. `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` are set on Vercel Production
3. A fresh production deployment is completed
