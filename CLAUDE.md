# CLAUDE.md — Rank Rebels

Operational guide for working in this repo. Read this first, then the deeper docs
when you need detail. Keep replies concrete; match the existing code.

## What this is
Rank Rebels (rankrebels.ai) — a web/SEO/software agency run by **Brandon Cruz**
(brandon@rankrebels.ai) and **Eric Ellsworth** (eric@rankrebels.ai). This repo is
both the public site **and** the internal system that runs the business.

Two halves:
- **Internal app** — `dashboard.html` (pipeline, customers, money, budget, goals,
  requests, find-leads, scoreboard, per-customer quote builder), `portal.html`
  (customer portal), `menu.html` (service menu + job quote calculator, internal),
  `report.html` (performance reports).
- **Public + customer pages** — `index.html` (homepage), `audit.html`, `blog.html`,
  and per-customer proposal "hook" pages: `micasasucasahawaii.html`,
  `islandclawmachineco.html`, `tarocommunications.html`.

Deeper context: **`RANKREBELS-PROJECT-BRIEF.md`** (business, pricing, brand, voice),
**`GO-LIVE.md`** (secrets, SQL migrations, how each feature turns on), **`STATUS.md`**.

## Tech stack
- **Static HTML/CSS/vanilla JS** — no frameworks, no build step. Each page is
  self-contained.
- **Cloudflare Pages** auto-deploys from the **`main`** branch. Clean URLs (no `.html`).
- **Backend** = Cloudflare Pages Functions in `functions/` (e.g. `functions/api/*.js`).
- **Database** = Supabase (Postgres), project `eejmocneacfleltspedl`. Tables prefixed
  `rr_` (rr_clients, rr_blog_posts, rr_scheduled_emails, …). RLS-gated; the anon key is
  public, the **service role key lives only in Cloudflare secrets**.
- **Email** = Resend, from `sales@rankrebels.ai` (owners brandon@/eric@).
- **Payments** = Stripe; one-time charges offer Klarna/Affirm/Afterpay.
- **Reports** = GA4 Data API + Search Console API via Google OAuth.
- Rendering/screenshots for assets: Playwright + Chromium via
  `createRequire('/opt/node22/lib/node_modules/')`. No ImageMagick/sharp.

## Deploy workflow (IMPORTANT)
Develop on the feature branch, then promote to `main` to deploy:
1. Commit to the feature branch `claude/doodles-rankrebels-org-a4agtt`, push with
   `git push -u origin <branch>`.
2. Promote: `git checkout main && git pull origin main --rebase --no-edit &&
   git cherry-pick -x <commit> && git push origin main && git checkout <branch>`.
3. Cloudflare Pages picks up `main` and redeploys.
- **Never** commit secrets. Env/secret changes require a Cloudflare "Retry Deployment".

Commit message footer:
```
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NwwCRgZhNAYVXpmHPCTe6s
```

## Conventions / taste
- Clean, modern, **no AI-slop, no stock emojis** sprinkled into UI. Match the page's
  existing palette and structure.
- Brand colors: green `#15803d` / `#1aa251`, gold `#c79a1e`, white.
- Rank Rebels phone: **808-265-5339**. Don't invent numbers.
- Customer proposal pages are bespoke per client and tailored to that business —
  don't replicate their real-site flaws; keep tone respectful (never disparage a
  client's current site).
- Printable to-do / checklist pages use the **two-column "ATMX" format**: colored
  section header bars, checkbox squares, **bold lead-in** + gray sub-note, small
  colored tags, brand badge top-right, footer = `email · 808-265-5339 · generated <date>`.
  Render to a Letter PDF with Playwright (`page.pdf`).

## Gotchas
- Supabase MCP here has been permission-restricted (execute_sql/list_tables may be
  denied) — diagnose via code + `GO-LIVE.md` rather than live queries.
- OG/social images are cached hard — bust by using a NEW filename, not by overwriting.
- `dashboard.html` is large; `saveClient` graceful-degrades around missing columns.
