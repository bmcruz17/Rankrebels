# Rank Rebels — Daily Status Tracker

**The single place to see where the project stands.** A daily routine refreshes this; whenever a new session starts, read this file first to pick up where we left off.

**Last updated:** 2026-06-25

---

## 🎯 Your open action items (do these to stay on track)
Ordered roughly by priority.

- [ ] **Verify Google Business Profile** — Eric, in Utah, under the Rank Rebels Google account (remove the Heliode draft first so there's no duplicate).
- [ ] **Send Claude your Google review link** (Business Profile → Ask for reviews) → it gets wired into the homepage + the ⭐ pipeline review button.
- [ ] **Add `SERPER_API_KEY`** in Cloudflare (free at serper.dev) → turns on lead enrichment (find email/socials for no-website leads).
- [ ] **Install email signatures in Gmail** (open `signatures/*.html` → copy rendered → Gmail signature settings).
- [ ] **SPF / DKIM / DMARC** DNS records at Squarespace (see GO-LIVE.md §6) — keeps email out of spam.
- [ ] **Swap testimonial quotes** to Atomic Steamers / Ryzen Recruit / Heliode's real words (+ add a contact name).
- [ ] **(Optional) Stripe** — add `STRIPE_SECRET_KEY` to enable card-payable invoices.
- [ ] **Redeploy Cloudflare** after any secret change, then run the smoke test in GO-LIVE.md.

## 🔨 In progress / building
- _(nothing actively mid-build — add items here as you start them)_

## ✅ Recently shipped (last few days)
- Lead enrichment (find contact for no-website leads)
- Shareable Google Lead Finder module (for the Atomic Steamers project)
- Homepage redesign (bold layout, AI-search angle, industry portfolio, real-client testimonials)
- Google review request (homepage link + ⭐ pipeline button)
- Turnstile bot protection (site + secret keys in) + privacy policy disclosure
- Stripe invoicing, e-sign agreements, customer portal, partner reimbursements, Find Leads, Gmail/Calendar, AI bots & drafting

## ⛔ Blockers / waiting on
- GBP can't be verified until Eric is in Utah (no storefront access from Hawaii).
- Lead enrichment needs the SERPER_API_KEY before it returns results.

## 💡 Backlog / ideas (not started)
- Stripe webhook → auto-mark charges Paid + recurring monthly subscription billing
- Email automation (auto review requests, cold-lead follow-ups, payment reminders)
- Client reporting (pull GA4 + Search Console into the dashboard → auto quarterly reviews)
- Real demo sites for the industry portfolio
- Point Supabase Auth SMTP at Resend (kills magic-link rate limits)

## 📓 Daily log
- **2026-06-25** — Built lead enrichment + shareable lead-finder module; redesigned homepage with portfolio + real testimonials; added Google review features; wired Turnstile (site+secret) and disclosed it in privacy policy; resolved the GBP/Heliode ownership issue (recreate under Rank Rebels). Open: GBP verification (Eric), review link, SERPER key, email signatures, SPF/DKIM/DMARC.
