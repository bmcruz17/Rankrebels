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
| `TURNSTILE_SECRET_KEY` | Bot/abuse protection on the chat endpoint | ⬜ optional — needs Turnstile widget |

> The public **Turnstile site key** also gets pasted into `index.html` + `dashboard.html` (`TURNSTILE_SITE_KEY`). Send it to Claude and it gets wired in.

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
drop policy if exists rr_clients_team_all on rr_clients;
create policy rr_clients_team_all on rr_clients for all to authenticated
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
```

---

## 3. Supabase — Auth settings
- **Authentication → URL Configuration → Redirect URLs:** add
  `https://rankrebels.ai/dashboard.html` and `https://rankrebels.ai/portal.html`
- Each teammate: open the dashboard → **"Set or reset password"** → set a password. Eric signs in as `eric@rankrebels.ai`.

---

## 4. Google Cloud (for Gmail/Calendar + Find Leads)
- OAuth client created (Internal) ✅ · redirect `https://rankrebels.ai/api/google/callback`
- **Enable APIs:** Gmail API, Google Calendar API, Places API (New)
- **OAuth consent → Data access → add scopes:** `gmail.compose`, `calendar.events`
- In the dashboard, each teammate clicks **🔗 Connect Google** (with their `@rankrebels.ai` account).

---

## 5. Smoke test (after redeploy)
- [ ] Homepage chat bubble answers a question (no "not configured")
- [ ] **Find Leads** → "auto repair in El Monte CA" → returns results
- [ ] **Connect Google** → shows "✓ Google"
- [ ] Open a lead → **✉️ → Draft with AI** → draft appears in Gmail
- [ ] Open a lead → **⏰** set a reminder → adds to Google Calendar
- [ ] Add a **charge** to a customer → **Generate invoice** prints
- [ ] Money tab → **Partner reimbursements** shows a balance
- [ ] Customer portal (`/portal.html`) → sign in as a test customer → submit a request → it appears in the **Requests** tab

---

## 6. Optional polish (not blocking)
- Turnstile widget → bot protection
- Email signatures (in `/signatures`) installed in Gmail
- Branded magic‑link email + point Supabase Auth SMTP at Resend (kills email rate limits)
- SPF / DKIM / DMARC for deliverability
