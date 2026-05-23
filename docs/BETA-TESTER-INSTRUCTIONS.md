# Posterboy Social — Beta Tester Guide

Thanks for helping us shake this out. This is a closed beta, friendly testers only. Things will be rough; this guide tells you what to try, what to ignore, and how to flag what's broken.

**Live site:** [https://www.posterboysocial.com](https://www.posterboysocial.com)

---

## What is Posterboy?

A calm workspace for social media posts. You tell us about your business, we build a brand book (voice, colors, typography, content pillars), and the AI drafts posts that sound like you — not like generic marketing.

Originally built for a real estate agent. Now opening up to any professional business — restaurants, salons, coaches, retail, services, the whole long tail. The wizard has been generalized but the brand book engine still leans realtor-flavored under the hood. **More on that in "Known rough edges" below.**

---

## What we want you to test

Walk these three paths, in order, and tell us where it breaks down for *your* business. Each takes 5–15 minutes.

### 1. The marketing site
- Land on `/`
- Scroll the whole homepage
- Click any nav link (Why / How / Features / Founder / Pricing)
- Click one of the industry pages: `/for/realtors`, `/for/restaurants`, `/for/salons`, etc. (14 of them)

**Looking for:** does anything feel off-brand, slow, broken on your screen, awkward on mobile?

### 2. Signup → onboarding → brand book
- From `/`, click **Sign in** → **Create account**
- Sign up with a real email and a throwaway password
- Walk the 7-step wizard (it takes ~3 minutes)
  - Use **your actual business** (your real industry, your real ideal customers, your real personality)
  - Don't worry about getting it perfect — you can re-run it later
- Watch the "Building your brand book…" animation
- Review the generated brand book on the next screen
- Click "Looks great — let's go"

**Looking for:**
- Does the wizard feel realtor-locked? It shouldn't anymore — but if you see "brokerage" or "listings" framed as the default for non-realtors, flag it.
- Does the generated brand book feel like *you*? Honestly?
- Are the color palette and font pairing reasonable for your industry?

### 3. Dashboard + creative tools
After approving the brand book you'll land on `/dashboard`.

- Try the **Studio** (`/dashboard/studio` or "Open Studio" from the hero card) — generate an AI image from a prompt
- Try the **AI Assistant** (`/dashboard/ai-assistant`) — ask it to draft a post
- Open the **Editor** for a template — change the photo, copy, see the preview update
- Poke around the side rail: Schedule, Library, Brand, Settings

**Looking for:** what feels useful? What feels broken? What would you want next?

---

## Login options

| Path | Credentials | What you'll see |
|---|---|---|
| `Sign in` button (top right) | Use the email you created | Your account, your brand book |
| Demo (skip signup) | username `demo` · password `demo123` | Pre-seeded "Riverside Bakery" demo data. Useful for poking around without sign-up. |

The demo user **shares localStorage** with anyone else hitting the demo creds on your browser. If you want isolated testing, create a real account.

---

## Known rough edges (please don't file these as bugs)

We know about these and they'll get fixed after beta — flagging so you don't waste your time on them.

### Onboarding still leans realtor
The brand book generator was originally written for real estate. The wizard is generalized (industry field, generic pills, neutral copy), but **the generated brand book may still say `"Realtor"` in your title or include real-estate-flavored example posts**. We're doing the deeper refactor after the beta dust settles.

### Your data is per-browser
Drafts, brand book, calendar entries, photos — everything lives in **your browser's localStorage**. If you clear your browser data, you lose your stuff. If you switch from Chrome to Safari, you start over. This is **intentional for beta** — real multi-device persistence requires a database wire-up that we're shipping post-beta.

### Studio: HD upscale and "remove background" may 500
If a `LEONARDO_API_KEY` isn't set on the live deployment (the dev team will fix this before beta opens), the Upscale-HD and Remove-Background buttons in Studio will return a 500 error. Image generation itself (the part that actually creates the image) works fine.

### No actual Facebook/Instagram posting
You can connect Meta from Settings, but **"Publish" on a draft currently only marks it published in our system** — it doesn't actually push to Facebook or Instagram yet. That wire-up is in flight.

### Some dashboard pages are scaffolds
`Issues`, `Dispatch`, `Drafts`, `Organization`, `Analytics`, `Brand intake`, `Calendar` — these pages render but may have placeholder data or limited interactivity. You're seeing the structure, not the finished surface.

### Demo user can't use Prisma APIs
The demo login is a JWT-only account with no `accountId`, so the new `/api/posts`, `/api/locations/*` etc. routes return 401 for the demo user. They work for real signups (where you got an `accountId`). Mostly invisible to you — flagging in case you see a 401 in the network tab and wonder.

---

## How to report bugs / feedback

**Best path:** there's a feedback widget bottom-right of every dashboard page (`Send feedback` button). It submits straight to us with the page you were on.

**Backup path:** email brad with a screenshot + what you were doing. (Replace this line with the actual email/Slack channel you want testers using.)

**What's useful to include:**
- What you were trying to do
- What you expected vs what happened
- Browser + OS (Chrome on Mac, Safari on iPhone, etc.)
- Console error text if you can grab it (Cmd-Opt-J on Chrome, then screenshot the red lines)
- Whether you were logged in as demo or your own account

---

## Things specifically worth telling us

Beyond bugs, we care about:

1. **Did the brand book feel like you?** If not, what was off? (This is the most important question of the beta.)
2. **What would you actually post this week if Posterboy did it for you?** (Tells us if the content pillars are right for your industry.)
3. **What's missing?** What did you expect that wasn't there?
4. **What's there that you don't care about?** What feels like product noise?

---

## What's NOT in this beta (don't expect)

- Real Meta publishing
- Multi-user accounts / team collaboration
- Persistent data across devices
- Stripe billing
- Mobile apps
- Email/SMS scheduling
- A second AI image generator (we use Gemini; Leonardo is for post-processing)
- Slack/Discord integrations

---

Thanks for poking at this. Honest reactions > polite ones.

— Posterboy team
