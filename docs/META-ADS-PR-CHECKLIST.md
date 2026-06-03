# Meta App Review checklist (PR description)

Use this block in the pull request for `feature/meta-ads`.

## Product summary

Posterboy Social adds a **Command-only** Meta Ads builder. Users connect Marketing API access incrementally (separate from organic page OAuth). The builder creates **campaign, ad set, creative, and ad** objects via Graph API v25.0. **Every object is created with `status: PAUSED`** — no automatic spend or live delivery from Posterboy.

## Permissions requested

| Permission | Use |
|------------|-----|
| `ads_management` | Create paused campaigns, ad sets, creatives, and ads |
| `ads_read` | List ad accounts and read insights |
| `business_management` | Resolve business/ad account hierarchy |

Organic scopes (`pages_manage_posts`, `instagram_content_publish`, etc.) remain on the existing `/api/meta/callback` flow only.

## Reviewer test path

1. Set `META_ADS_ENABLED=true` on staging.
2. Sign in as a **Command** (`house_account`) demo tenant.
3. Connect organic Meta on Settings (existing flow).
4. Open **Dashboard → Ads** → **Connect Meta Ads** (incremental OAuth).
5. Select ad account, fill builder form, submit.
6. Confirm success copy: **"Created as PAUSED in Meta Ads Manager"**.
7. In Meta Ads Manager, verify campaign/ad set/ad are **Paused**.

## Screencast script (2–3 min)

1. Show Solo tenant: Ads nav hidden or feature unavailable.
2. Show Command tenant: Ads page, connect flow, builder, submit.
3. Show Meta Ads Manager: paused entities only.
4. State that Posterboy does not auto-activate or charge ad spend.

## Data handling

- Ads user token stored in `SocialConnection` with `platform: meta_ads` (tenant RLS).
- Ad account registry in `MetaAdAccount` (tenant RLS).
- Tokens never returned to the browser after OAuth.

## Env vars (staging / prod)

| Variable | Required |
|----------|----------|
| `META_ADS_ENABLED` | `true` to enable feature |
| `NEXT_PUBLIC_META_APP_ID` | Existing |
| `META_APP_SECRET` | Existing |
| `META_ADS_REDIRECT_URI` | Optional; defaults to `{APP_URL}/api/meta/ads/callback` |

## DB migration (not auto-applied to prod by agents)

- `prisma/migrations/20260604120000_meta_ad_account/migration.sql`
- Adds `MetaAdAccount` table, `meta_ads` enum value, RLS policies

## Compliance notes

- No auto-launch of live ads.
- No billing of ad spend through Posterboy.
- User must unpause and fund ads in Meta Ads Manager.
