# Vercel production vs staging

Same GitHub repo (`bradly413/thepostpal`) deploys to **two** Vercel projects. Env vars and domain aliases are **per project** — changing one does not affect the other.

## Live (production)

| Field | Value |
|-------|--------|
| **Project** | `angie-social-portal` |
| **Project ID** | `prj_EtYVaDgXLp5EADQq8CuDAkExkWQZ` |
| **Domains** | `posterboysocial.com`, `www.posterboysocial.com` |
| **Env settings** | [angie-social-portal → Environment Variables](https://vercel.com/bradly413s-projects/angie-social-portal/settings/environment-variables) |

Set production secrets here (`ANTHROPIC_API_KEY`, `AUTH_SECRET`, Upstash, Meta, etc.).

```bash
cd ~/Code/thepostpal-readable-v2
npx vercel link --yes --project angie-social-portal --scope bradly413s-projects
npx vercel deploy --prod -y
```

## Staging / experiments

| Field | Value |
|-------|--------|
| **Project** | `thepostpal-readable-v2` |
| **Project ID** | `prj_g96nhEB48peTkhdUzeTLi9rpubhA` |
| **Default URL** | `thepostpal-readable-v2.vercel.app` |
| **Env settings** | [thepostpal-readable-v2 → Environment Variables](https://vercel.com/bradly413s-projects/thepostpal-readable-v2/settings/environment-variables) |

Use for preview deploys and CLI experiments. **Do not** alias `posterboysocial.com` to this project unless you are intentionally migrating production.

```bash
npx vercel link --yes --project thepostpal-readable-v2 --scope bradly413s-projects
npx vercel deploy --prod -y   # deploys to *.vercel.app only unless you add a domain
```

## Smoke test (live domain)

```bash
curl -sS -c /tmp/pb-cookies.txt -X POST "https://www.posterboysocial.com/api/auth" \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","password":"demo123"}'

curl -sS -b /tmp/pb-cookies.txt -X POST "https://www.posterboysocial.com/api/ai" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Reply with exactly: pong"}]}'
```

Expect: auth **200**, AI **200** with `{"message":"pong"}` (or similar).  
`AI service not configured` → `ANTHROPIC_API_KEY` missing/empty on **`angie-social-portal`**, not the staging project.

## Migrating production to `thepostpal-readable-v2`

Only when you want a single project name:

1. Copy all production env vars from `angie-social-portal` → `thepostpal-readable-v2`.
2. `npx vercel deploy --prod -y` on `thepostpal-readable-v2`.
3. Move domain aliases: `posterboysocial.com`, `www.posterboysocial.com` → new deployment URL.
4. Run smoke test above.
5. Retire or archive `angie-social-portal`.
