# Launch-Critical Workstreams

This document turns the remaining high-priority platform work into concrete tracks.

## Priority Order

1. production auth hardening
2. multi-location plus approval architecture
3. monitoring / Sentry
4. final brand asset swap
5. trademark filing execution support

## 1. Production Auth Hardening

### Current Reality

The live app still uses transitional auth behavior in important places.

Recent verification confirmed:

- `signup` can create a valid session cookie
- dashboard access works
- but the signup path is still session-first, not durable-user-first

### What Needs To Change

- create real durable users/accounts/memberships on signup or invite acceptance
- move off legacy env-var-style auth assumptions
- ensure password reset/change/revoke flows operate on durable user records
- audit all public auth routes explicitly
- add stronger server-side authorization for account-scoped resources

### Definition Of Done

- every authenticated session maps to a real user record
- every user belongs to a real account/workspace
- revoked or changed credentials invalidate old sessions predictably
- invite-based team growth works without fallback behavior

## 2. Multi-Location Plus Approval Architecture

### Why It Matters

If the latest product brief holds, this is launch-blocking for the multi-location tier.

### Core Deliverables

- `Location` model
- `LocationMembership`
- `ApprovalRule`
- `PostApproval`
- `ApprovalEvent`
- location switcher in app shell
- location-scoped calendar, assets, brand context, scheduling, and reporting
- corporate review / approve / reject workflow before publish
- Stripe quantity sync for location-based billing

### Recommended Build Order

1. schema and migration design
2. account-to-location scoping audit
3. approval state machine for posts
4. UI shell and location switcher
5. billing quantity sync

## 3. Monitoring / Sentry

### What To Add

- Sentry for Next.js client/server/edge
- scheduler/cron capture
- publish processor error capture
- release tagging for deploys
- alert routing for failed scheduled publishing paths

### Minimum First Pass

- app init
- API route coverage
- cron route coverage
- scheduler exception capture
- environment-aware DSN config

## 4. Final Brand Asset Swap

### Current Reality

Visible copy has been rebranded, but some underlying asset filenames still point to old `thepostpal` image paths.

### What Needs To Change

- replace remaining logo image assets
- replace favicon / icon / OG assets as needed
- update mail/header graphics if any old brand files remain
- verify alt text and metadata once final assets land

### Important Constraint

Do this only when final approved Posterboy assets are ready, so we do not create broken image paths.

## 5. Trademark Filing Execution Support

### Product / Ops Work Needed

This is not primarily a code task, but the product needs to support it.

### Support Checklist

- keep customer-facing source identifier consistent with filing strategy
- preserve specimen-friendly public usage of `Posterboy Social`
- collect screenshots of homepage, login, and in-app branded surfaces
- finalize goods/services descriptions for filing package
- file under Bradly Robert Creative LLC if that remains the owner choice

### Current Recommendation

- primary filing target: `Posterboy Social`
- likely classes: `42`, `35`, optional `9`
- treat `Posterboy` alone as a later, more cautious decision

## Bottom Line

The product now has enough momentum that the biggest risks are no longer “do we have templates?” or “does the scheduler exist?”

They are:

- auth maturity
- account/location model maturity
- operational monitoring
- launch polish and legal execution

That is where the next serious build effort should go.
