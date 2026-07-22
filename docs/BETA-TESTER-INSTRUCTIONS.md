# Posterboy Social — Beta Tester Guide

Closed beta for friendly testers. Things will be rough; this guide is what to try and how to flag issues.

**Live site:** [https://www.posterboysocial.com](https://www.posterboysocial.com)

**Invite link (create your own account):**  
[https://www.posterboysocial.com/signup](https://www.posterboysocial.com/signup)

(Same as `/sign-in?mode=signup&next=%2Fonboarding&plan=solo`.)

No card required. You’re on Solo for free during beta.

---

## What is Posterboy?

A calm workspace for social: create in Studio, caption in your voice, schedule, and publish to **Facebook & Instagram**.

---

## Path to walk (20–30 min)

### 1. Sign up + Voice Architect
1. Open the invite link above  
2. Create an account with a real email  
3. Walk onboarding — use **your** business (name, what you do, personality)  
4. You’ll land on **Dashboard home**

### 2. Connect Meta (required to publish)
1. **Settings → Account**  
2. **Connect with Facebook** (grants Page + Instagram)  
3. You must be added as a **Meta app Tester** first — if OAuth fails, tell Brad

### 3. Create + schedule
1. **Create** (Studio) — generate an image  
2. **Schedule** — caption, pick time, schedule  
3. Cron publishes to Meta within a few minutes of the scheduled time  
4. Check Calendar for status; failed posts show an error + Retry

### 4. Check the home dashboard
- **Posts scheduled / this week** — from your real queue  
- **Audience / Top Performing** — fill after Meta is connected and you’ve published (can take a day for insights)

---

## What works in this beta

| Works | Notes |
|-------|--------|
| Signup + Voice Architect | `/onboarding` |
| Studio image generation | Dupe / brief flows |
| Schedule + publish to FB/IG | Image posts |
| Library, Calendar, Drafts | DB-backed per account |
| Reports (Settings) | Meta insights when connected |
| Feedback widget | Bottom-right on dashboard |

## Known limits (don’t file as bugs)

- **Video publish** — not in closed beta (you’ll get a clear error)  
- **LinkedIn / TikTok / X / YouTube** — shown as Soon; not publishable yet  
- **Audience / Top Performing** empty until Meta + real posts  
- Brand voice may still lean realtor-flavored for some niches — flag it  
- Billing screen may show paid options — **beta is free**; ignore checkout unless you want to pay  

---

## How to report

1. In-app **feedback** widget (bottom-right)  
2. Or email **hello@posterboysocial.com** with screenshot + what you tried  

Include: browser/OS, what you expected vs what happened.

---

## Invite email (copy/paste)

```
Subject: You're invited to the Posterboy closed beta

Hi —

You're invited to try Posterboy Social (create, caption, schedule, publish to Facebook & Instagram).

Create your account here (free, no card):
https://www.posterboysocial.com/signup

Quick path:
1) Sign up + short onboarding with your real business
2) Settings → Account → Connect Facebook
3) Create an image in Studio, then Schedule a post

Reply to this email (or use the in-app feedback button) with anything broken or confusing.

— Brad
```
