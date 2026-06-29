# Rank Rebels — Go‑Live Checklist

Everything needed to turn the whole system on. Most is already done — this is the single source of truth.

---

## 1. Cloudflare Pages secrets
**Settings → Variables and secrets → add as Secret (Production) → then REDEPLOY.**
Env vars only load on a *new* build, so always Retry Deployment after changing them.

| Secret | Powers | Status |
|---|---|---|
| `ANTHROPIC_API_KEY` | Homepage + dashboard AI bots, Draft with AI | ✅ added |
| `SUPABASE_SERVICE_ROLE_KEY` | Stores Google tokens for Gmail/Calendar | ✅ added |
| `GOOGLE_PLACES_API_KEY` | Find Leads tool | ✅ added |
| `GOOGLE_CLIENT_SECRET` | Google OAuth (Gmail drafts + Calendar) | ✅ added |
| `TURNSTILE_SECRET_KEY` | Bot/abuse protection on the chat endpoint | ✅ added |
| `STRIPE_SECRET_KEY` | Stripe invoices (customers pay by card/ACH) | ⬜ optional — needs a Stripe account |
| `SERPER_API_KEY` | Lead enrichment (email/socials for no-website leads) | ⬜ optional — free at serper.dev |
| `PARTNER_KEYS` | Partner/reseller lead API (e.g. Ryzen) | ⬜ add to launch the channel program |
| `SCHED_SECRET` | Auth for the scheduled-email send processor | ⬜ any long random string — also add as a GitHub repo secret |

> The public **Turnstile site key** is wired into `index.html` + `dashboard.html` (`TURNSTILE_SITE_KEY`). ✅ done.
> **Supabase SQL:** ✅ all run successfully.

---

## 2. Supabase — run this ONCE (SQL Editor)
Safe to run as a single block; it's fully idempotent (re‑runnable).

```sql
-- 1) Team allowlist
create or replace function public.rr_is_team() returns boolean
language sql stable security definer set search_path = public, auth as $$
  select coalesce(
    lower(auth.jwt() ->> 'email') in (
      'brandonmcruz@mac.com','eric.paul.ellsworth@gmail.com',
      'brandon@rankrebels.ai','eric@rankrebels.ai'
    ) or lower(auth.jwt() ->> 'email') like '%@rankrebels.ai', false);
$$;

-- 2) Clients: extra columns + full team access
alter table rr_clients  add column if not exists activities jsonb default '[]'::jsonb;
alter table rr_clients  add column if not exists follow_up  date;
alter table rr_clients  add column if not exists services   jsonb;
alter table rr_clients  add column if not exists ga4_property_id     text; -- live reports (report.html)
alter table rr_clients  add column if not exists search_console_site text; -- live reports (report.html)
alter table rr_clients  add column if not exists hook_url            text; -- proposal/checkout "hook" page; "View hook" button on the tile
alter table rr_clients  add column if not exists partner     text; -- reseller name (e.g. Ryzen Recruit)
alter table rr_clients  add column if not exists partner_rep text; -- the rep who referred the lead
alter table rr_clients  add column if not exists quote       jsonb; -- à la carte package builder (line items, term, discounts)
alter table rr_clients  add column if not exists description text;  -- business description shown on the tile
-- allow partner-sourced leads through the acquired_by check constraint
alter table rr_clients  drop constraint if exists rr_clients_acquired_by_check;
alter table rr_clients  add  constraint rr_clients_acquired_by_check
  check (acquired_by is null or acquired_by in ('brandon','eric','website','partner'));
create index if not exists rr_clients_partner_idx on rr_clients(partner);
drop policy if exists rr_clients_team_all on rr_clients;
create policy rr_clients_team_all on rr_clients for all to authenticated
  using (public.rr_is_team()) with check (public.rr_is_team());

-- 2b) Blog (auto-posted daily; public can read published posts)
create table if not exists rr_blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  excerpt text,
  body_html text,
  tags text[],
  author text default 'Rank Rebels',
  published boolean default true,
  published_at timestamptz default now(),
  created_at timestamptz default now()
);
alter table rr_blog_posts enable row level security;
drop policy if exists rr_blog_public_read on rr_blog_posts;
create policy rr_blog_public_read on rr_blog_posts for select to anon using (published = true);
-- (the daily bot inserts via the service-role key, which bypasses RLS)

-- 2c2) Scheduled emails (AI draft now, auto-send at a set time)
create table if not exists rr_scheduled_emails (
  id uuid primary key default gen_random_uuid(),
  client_id uuid,
  sender_email text not null,
  to_email text not null,
  subject text,
  draft_id text,
  send_at timestamptz not null,
  status text default 'scheduled',
  error text,
  sent_at timestamptz,
  created_at timestamptz default now()
);
alter table rr_scheduled_emails enable row level security;
drop policy if exists rr_sched_team on rr_scheduled_emails;
create policy rr_sched_team on rr_scheduled_emails for all to authenticated
  using (public.rr_is_team()) with check (public.rr_is_team());

-- 2d) Time clock (scoreboard hours)
create table if not exists rr_time (
  id uuid primary key default gen_random_uuid(),
  person text not null,
  email text,
  clock_in timestamptz not null default now(),
  clock_out timestamptz,
  created_at timestamptz default now()
);
alter table rr_time enable row level security;
drop policy if exists rr_time_team on rr_time;
create policy rr_time_team on rr_time for all to authenticated
  using (public.rr_is_team()) with check (public.rr_is_team());

-- 3) Expenses: extra columns
alter table rr_expenses add column if not exists frequency text;
alter table rr_expenses add column if not exists bill_date date;
alter table rr_expenses add column if not exists paid_by   text;

-- 4) Settings: expense-split share
alter table rr_settings add column if not exists exp_eric_share numeric;

-- 5) Partner reimbursements (Brandon <-> Eric)
create table if not exists rr_reimbursements (
  id uuid primary key default gen_random_uuid(),
  from_partner text not null, to_partner text not null,
  amount numeric not null, paid_on date, method text, note text,
  created_at timestamptz default now());
alter table rr_reimbursements enable row level security;
drop policy if exists rr_reimb_team on rr_reimbursements;
create policy rr_reimb_team on rr_reimbursements for all to authenticated
  using (public.rr_is_team()) with check (public.rr_is_team());

-- 6) Customer change requests (portal)
create table if not exists rr_requests (
  id uuid primary key default gen_random_uuid(),
  client_email text not null, subject text, message text not null,
  status text not null default 'open', created_at timestamptz default now());
alter table rr_requests enable row level security;
drop policy if exists rr_requests_team on rr_requests;
create policy rr_requests_team on rr_requests for all to authenticated
  using (public.rr_is_team()) with check (public.rr_is_team());
drop policy if exists rr_requests_cust_ins on rr_requests;
create policy rr_requests_cust_ins on rr_requests for insert to authenticated
  with check (lower(client_email)=lower(auth.jwt()->>'email'));
drop policy if exists rr_requests_cust_sel on rr_requests;
create policy rr_requests_cust_sel on rr_requests for select to authenticated
  using (lower(client_email)=lower(auth.jwt()->>'email') or public.rr_is_team());

-- 7) Quarterly reviews (portal)
create table if not exists rr_reviews (
  id uuid primary key default gen_random_uuid(),
  client_email text not null, period text, summary text, metrics jsonb,
  created_at timestamptz default now());
alter table rr_reviews enable row level security;
drop policy if exists rr_reviews_team on rr_reviews;
create policy rr_reviews_team on rr_reviews for all to authenticated
  using (public.rr_is_team()) with check (public.rr_is_team());
drop policy if exists rr_reviews_cust_sel on rr_reviews;
create policy rr_reviews_cust_sel on rr_reviews for select to authenticated
  using (lower(client_email)=lower(auth.jwt()->>'email'));

-- 8) Customer charges + invoicing
create table if not exists rr_charges (
  id uuid primary key default gen_random_uuid(),
  client_id uuid, client_email text, description text, amount numeric not null,
  charge_date date, status text not null default 'unbilled', created_at timestamptz default now());
alter table rr_charges enable row level security;
drop policy if exists rr_charges_team on rr_charges;
create policy rr_charges_team on rr_charges for all to authenticated
  using (public.rr_is_team()) with check (public.rr_is_team());
drop policy if exists rr_charges_cust_sel on rr_charges;
create policy rr_charges_cust_sel on rr_charges for select to authenticated
  using (lower(client_email)=lower(auth.jwt()->>'email') or public.rr_is_team());

-- 9) Google OAuth tokens (server-side only; no policies = locked to service role)
create table if not exists rr_google_tokens (
  email text primary key, access_token text, refresh_token text,
  expiry timestamptz, scope text, updated_at timestamptz default now());
alter table rr_google_tokens enable row level security;

-- 10) Portal greeting helper (returns only the business name for the signed-in customer)
create or replace function public.rr_my_business() returns text
language sql stable security definer set search_path=public as $$
  select business_name from rr_clients
  where lower(email)=lower(auth.jwt()->>'email') order by created_at limit 1; $$;
grant execute on function public.rr_my_business() to authenticated;

-- 11) Customer charges + invoicing
create table if not exists rr_charges (
  id uuid primary key default gen_random_uuid(),
  client_id uuid, client_email text, description text, amount numeric not null,
  charge_date date, status text not null default 'unbilled', created_at timestamptz default now());
alter table rr_charges enable row level security;
drop policy if exists rr_charges_team on rr_charges;
create policy rr_charges_team on rr_charges for all to authenticated
  using (public.rr_is_team()) with check (public.rr_is_team());
drop policy if exists rr_charges_cust_sel on rr_charges;
create policy rr_charges_cust_sel on rr_charges for select to authenticated
  using (lower(client_email)=lower(auth.jwt()->>'email') or public.rr_is_team());

-- 12) Signed service agreements (customer e-signs the MSA at /agreement.html)
create table if not exists rr_agreements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid, client_email text, business_name text, signer_name text,
  signed_at timestamptz default now(), setup_fee numeric, monthly_fee numeric,
  terms_version text, user_agent text);
alter table rr_agreements enable row level security;
drop policy if exists rr_agree_team on rr_agreements;
create policy rr_agree_team on rr_agreements for all to authenticated
  using (public.rr_is_team()) with check (public.rr_is_team());
drop policy if exists rr_agree_sign on rr_agreements;
create policy rr_agree_sign on rr_agreements for insert to anon
  with check (signer_name is not null);
```

---

## 3. Supabase — Auth settings
- **Authentication → URL Configuration → Redirect URLs:** add
  `https://rankrebels.ai/dashboard.html` and `https://rankrebels.ai/portal.html`
- Each teammate: open the dashboard → **"Set or reset password"** → set a password. Eric signs in as `eric@rankrebels.ai`.

---

## 4. Google Cloud (for Gmail/Calendar + Find Leads + Client Reports)
- OAuth client created (Internal) ✅ · redirect `https://rankrebels.ai/api/google/callback`
- **Enable APIs:** Gmail API, Google Calendar API, Places API (New), **Google Analytics Data API**, **Search Console API**
- **OAuth consent → Data access → add scopes:** `gmail.compose`, `calendar.events`, `analytics.readonly`, `webmasters.readonly`
- In the dashboard, each teammate clicks **🔗 Connect Google** (with their `@rankrebels.ai` account).
  - ⚠️ After adding the new scopes, **disconnect & reconnect Google** so the new read-only Analytics/Search-Console permissions are granted.

### Client performance reports (`report.html`)
- Per client: open **Edit customer** → fill **GA4 property ID** (Analytics → Admin → Property → Property ID, a number like `493812345`) and **Search Console site** (e.g. `https://theirsite.com/` or `sc-domain:theirsite.com`).
- The connected Google account must have **access to that client's GA4 property & Search Console** (have the client grant Viewer access, or use a Rank Rebels account they've added).
- Open a report from the **📊 Report** button on a customer tile, or **📊 Open performance report** in the customer modal.
- Until a client is configured, the report shows clearly-labelled **sample data** (never blank).

---

## 5. Smoke test (after redeploy)
- [ ] Homepage chat bubble answers a question (no "not configured")
- [ ] **Find Leads** → "auto repair in El Monte CA" → returns results
- [ ] **Connect Google** → shows "✓ Google"
- [ ] Open a lead → **✉️ → Draft with AI** → draft appears in Gmail
- [ ] Open a lead → **⏰** set a reminder → adds to Google Calendar
- [ ] Add a **charge** to a customer → **Print invoice** opens; **Send Stripe invoice** emails a payable invoice (if Stripe key set)
- [ ] Move a customer to **Accepted** → **Send agreement to sign** → open the link → sign → shows "✅ Signed" in the dashboard
- [ ] Money tab → **Partner reimbursements** shows a balance
- [ ] Customer portal (`/portal.html`) → sign in as a test customer → submit a request → it appears in the **Requests** tab
- [ ] **AccessGrade** (`/audit.html`) → scan a real site → score + issues appear → submit "Get my fix plan" → a 🤝 partner lead shows in the pipeline
- [ ] **Partner API** (after `PARTNER_KEYS` set) → `curl` a test lead (see `shareable/ryzen-partner-kit/INTEGRATION.md`) → it appears tagged "Ryzen Recruit"

---

## 6. Optional polish (not blocking)
- ✅ Turnstile widget → bot protection (site key wired, secret key added)
- ✅ Lead & intake email (Resend) — `RESEND_API_KEY` set in Cloudflare; verified sending — see notes below
- ⬜ Email signatures (in `/signatures`) installed in Gmail
- ⬜ Branded magic‑link email + point Supabase Auth SMTP at Resend (kills email rate limits)
- ⬜ SPF / DKIM / DMARC for email deliverability (DNS records at Squarespace) — see notes below

### Lead & intake email (Resend) — `/api/demo-lead`
Powers the "try the form" hook on customer preview sites (Island Claw, Mi Casa) and the TARO discovery questionnaire.
- **Sends from** `sales@rankrebels.ai` (set via the optional `RESEND_FROM` env var; this is the default). We do **not** use `hello@` — only `sales@`, `brandon@`, and `eric@`.
- **Replies** go to `sales@rankrebels.ai` on booking/quote alerts; on intake submissions reply-to is the prospect, so hitting reply reaches them directly.
- **Who gets notified:** both owners — `brandon@rankrebels.ai` and `eric@rankrebels.ai`. Booking/quote demos BCC them; intake answers email them directly. Controlled by the comma-separated `LEAD_NOTIFY` env var (default `brandon@rankrebels.ai,eric@rankrebels.ai`) — change it in Cloudflare to add/swap recipients without touching code.
- **Required secret:** `RESEND_API_KEY` in Cloudflare → Pages → Settings → Variables and Secrets (then redeploy). When unset the form still shows success but no email sends. Verified working ✅.
- `rankrebels.ai` must be a verified domain in Resend (covers `sales@`, `brandon@`, `eric@`).

### Email signatures (Gmail)
For each person (brandon.html, eric.html, sales.html):
1. Open the signature file in a browser (or have Claude render it).
2. Select all (Cmd+A) and copy the **rendered** signature (not the raw HTML).
3. Gmail → ⚙️ → See all settings → General → Signature → Create new → paste → Save.

### SPF / DKIM / DMARC (plain English)
Three DNS records that prove your email really comes from rankrebels.ai — they keep you out of spam and stop anyone from spoofing your domain. Add them where your DNS lives (Squarespace).
- **SPF** — lists who's allowed to send for your domain. TXT record on `rankrebels.ai`:
  `v=spf1 include:_spf.google.com include:amazonses.com ~all`  (Google Workspace + Resend)
- **DKIM** — a signature proving the email wasn't tampered with. Generate in **Google Admin → Apps → Gmail → Authenticate email**, add the TXT record it gives you, then turn it on. (Resend's DKIM was added when you verified the domain in Resend.)
- **DMARC** — tells inboxes what to do if SPF/DKIM fail. TXT record on `_dmarc.rankrebels.ai`:
  `v=DMARC1; p=none; rua=mailto:dmarc@rankrebels.ai`  (start with p=none to monitor, tighten later)

---

## 7. Partner / reseller program (channel sales — e.g. Ryzen Recruit)
Lets a partner's reps refer leads that land straight in your pipeline (`acquired_by: partner`), tagged with the partner + rep, visible with a 🤝 chip.

**To onboard a partner (easy way — issue the key from the dashboard):**
1. **Run the partner SQL once** (creates `rr_partners`):
   ```sql
   create table if not exists rr_partners (
     id uuid primary key default gen_random_uuid(),
     name text not null,
     api_key text not null unique,
     active boolean default true,
     created_at timestamptz default now()
   );
   alter table rr_partners enable row level security;
   drop policy if exists rr_partners_team on rr_partners;
   create policy rr_partners_team on rr_partners for all to authenticated
     using (public.rr_is_team()) with check (public.rr_is_team());
   ```
2. In the dashboard → **Money tab → Partners & API keys → "+ Issue partner key."** Type the partner's name (e.g. *Ryzen Recruit*). It generates a key, copies it, and stores it. **Send that key to the partner.** Revoke or reactivate anytime — no redeploy needed.
3. **Hand the partner their kit** — everything in `/shareable/ryzen-partner-kit/` (rep guide + portal + API docs). They paste the key into the portal's `PARTNER_KEY` (or their app). API base is `https://rankrebels.ai`.

> Optional fallback: you can also hard-code keys via a Cloudflare `PARTNER_KEYS` secret (JSON map `{"rrp_live_...":"Ryzen Recruit"}`), but the dashboard issuer is easier and revocable. The API accepts keys from either source.

**API surface (key sent as `X-Partner-Key`):**
- `POST /api/partner/lead` → create a lead. Body: `{business_name, contact_name?, email?, phone?, rep?, plan?, notes?}`. Dedupes by email/phone.
- `GET  /api/partner/leads` → the partner's own referred leads + current stage (so reps see status). Never exposes the rest of your pipeline or any credentials.

**Commission (set — Ryzen Recruit):** Rank Rebels pays Ryzen **50% of onboarding** + **15% of monthly revenue**. Ryzen pays its rep **$500/deal + a 5% monthly override** out of that, and the rep owns the customer relationship (monthly check-ins). The Money tab now shows a **"Partner payouts"** panel with the commission owed per partner — pay it, then log it as an expense. To change terms or add another partner with different rates, edit `PARTNER_TERMS` in `dashboard.html`.

**⚠️ Still to do (business terms, not code):**
- **Reseller agreement** — a short partner contract (the commission above, term, who owns the client, non-circumvention). Have your attorney review; I can draft a starting template.
- **Key security** — if reps use the included `partner-portal.html` as a public page, the key is visible in its source. Either host it behind Ryzen's own login, or have their Claude Code put the key in a tiny server-side proxy. (For internal rep use this is usually fine; the key can only *create* leads.)

---

## 9. Blog + daily auto-poster
A blog at **`/blog.html`** (linked in the nav) that reads posts from `rr_blog_posts`. A GitHub Action writes one new post per day with Claude.

**To turn it on:**
1. **Run the blog SQL** (§2 — `rr_blog_posts` + public-read policy).
2. **Add two GitHub repo secrets** (GitHub → repo → Settings → Secrets and variables → Actions):
   - `ANTHROPIC_API_KEY` (your Claude key)
   - `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Settings → API → service_role)
3. The **Daily blog post** Action runs ~14:23 UTC daily (edit the cron in `.github/workflows/daily-blog.yml`). Run it once now from the **Actions** tab to publish the first post.
- Model defaults to `claude-opus-4-8` (~a few cents/post). Set a `BLOG_MODEL` repo variable to use a cheaper model (e.g. `claude-haiku-4-5`) if you'd rather.
- Posts never claim guaranteed rankings (the prompt forbids it).

---

## 8. AccessGrade — ADA accessibility audit (lead-gen brand → feeds the pipeline)
A free accessibility scanner at **`/audit.html`** that scores any site (0–100 + A–F grade), lists the fixes, and refers low scorers to Rank Rebels. Works **out of the box** — it reuses `SUPABASE_SERVICE_ROLE_KEY` (already set) and the partner columns (§2 SQL). No new secret required.

- **How it feeds you:** the "Get my fix plan" form posts to `/api/audit-lead`, which drops a pipeline lead tagged `partner: "AccessGrade (ADA Audit)"` with the score in the notes.
- **The scan** (`/api/audit`) is heuristic (HTMLRewriter + regex) — alt text, form labels, page language, headings, link text, buttons, title, viewport, accessibility statement, plus an optional industry license-number check. It catches ~30–40% of WCAG and **says so** — it's a starting score, not a certification.
- **Use it for outreach:** scan a prospect → screenshot/share the report → "your site scored a D — here's what's exposing you and how we'd fix it."

**Decisions (yours to make — placeholders shipped):**
- **Brand name** — currently "AccessGrade." Rename in `audit.html` (title/logo) if you prefer another.
- **Pricing/model** — recommended: free scan → ~$25/mo monitoring → RR remediation referral. Monitoring dashboard not built yet; say the word.
- **Domain** — lives at `rankrebels.ai/audit.html` now; can move to its own domain/subdomain later for the "neutral third party" feel.
- **Don't over-claim** — never market it as "lawsuit-proof / fully compliant." Keep the "automated starting point" framing (already in the page). FTC referral disclosure ("AccessGrade and Rank Rebels are partner companies") is already shown.
