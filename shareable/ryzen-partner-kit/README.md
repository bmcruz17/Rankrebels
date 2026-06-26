# Rank Rebels × Ryzen Recruit — Partner Launch Kit

This kit lets **Ryzen Recruit reps sell Rank Rebels**. Reps learn the pitch, call/email prospects, and refer leads that land **directly in Rank Rebels' pipeline** — tagged as referred by Ryzen, with each lead's status visible back to the rep.

> **To Ryzen's Claude Code:** read all four files, then help the team (1) host the rep portal, (2) plug their `PARTNER_KEY` in, and (3) optionally wire the same API calls into Ryzen's own CRM. See `INTEGRATION.md` for the API.

---

## What's in this kit
| File | What it's for |
|---|---|
| `rank-rebels-rep-guide.md` | Sales enablement — what Rank Rebels is, who to target, call script, email templates, objection handling, FAQ. Give this to every rep. |
| `partner-portal.html` | A ready-to-use rep tool — submit a lead + watch its status. Just add your key and host it. |
| `INTEGRATION.md` | The Partner API spec — for wiring lead submission into Ryzen's own app/CRM. |
| `README.md` | This file. |

---

## Setup (10 minutes)
1. **Get your Partner Key from Rank Rebels.** It looks like `rrp_live_ryzen_xxxxx`. (Rank Rebels adds it to their `PARTNER_KEYS` secret.)
2. **Open `partner-portal.html`** and set, in the CONFIG block near the bottom:
   ```js
   var CONFIG = {
     API_BASE: 'https://rankrebels.ai',
     PARTNER_KEY: 'rrp_live_ryzen_xxxxx'   // <- your key
   };
   ```
3. **Host the portal** — internal page behind your team login is best (the key can only create/read *your* referred leads, but don't broadcast it publicly). Hosting options: your own site, Cloudflare Pages, Netlify, or just open it locally for testing.
4. **Hand reps `rank-rebels-rep-guide.md`** and have them enter their name in the portal.
5. **Refer a test lead** → confirm it shows up (Rank Rebels will see it in their pipeline tagged "Ryzen Recruit").

---

## How the money works (confirm the details)
- Reps **don't close** — they spark interest and refer. Rank Rebels quotes, contracts, and builds.
- **Commission / revenue-share between Ryzen Recruit and Rank Rebels is a business agreement to finalize** (e.g. a % of monthly revenue for N months, or a flat per-closed-deal bounty). Rank Rebels tags every Ryzen-referred deal so payouts can be calculated cleanly. **Confirm your rate with Rank Rebels and put it in writing before launch.**

---

## Privacy & trust
- The portal/API can **only create leads and read the leads Ryzen referred** — it can never see the rest of Rank Rebels' pipeline, customers, or any credentials.
- Tell prospects the truth: a Rank Rebels specialist will follow up with a free audit. No spam, no pressure.

---

*Questions about the integration? Rank Rebels can extend the API (e.g. webhooks when a lead closes) — just ask.*
