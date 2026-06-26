# Partner API — Integration Spec
For wiring Rank Rebels lead submission into Ryzen Recruit's own app/CRM (instead of, or alongside, the included portal).

**Base URL:** `https://rankrebels.ai`
**Auth:** every request sends your key in the `X-Partner-Key` header (or `Authorization: Bearer <key>`).
**CORS:** enabled — you can call these from a browser app on your own domain.

---

## 1. Create a lead
`POST /api/partner/lead`

**Headers**
```
Content-Type: application/json
X-Partner-Key: rrp_live_ryzen_xxxxx
```

**Body** (only `business_name` + one of email/phone are required)
```json
{
  "business_name": "Acme Plumbing",
  "contact_name": "Jane Doe",
  "email": "jane@acme.com",
  "phone": "(555) 123-4567",
  "rep": "Sam",
  "plan": "Growth (~$599/mo)",
  "notes": "Industry: Plumbing. Old site, not on Google maps."
}
```

**Response**
```json
{ "ok": true, "id": "uuid-of-the-lead", "stage": "lead" }
```
- If the lead already exists (matched by email or phone), you get `"duplicate": true` and the existing record's id — no double entry.
- Errors return `{ "error": "..." }` with an HTTP 4xx/5xx.

**curl**
```bash
curl -X POST https://rankrebels.ai/api/partner/lead \
  -H "Content-Type: application/json" \
  -H "X-Partner-Key: rrp_live_ryzen_xxxxx" \
  -d '{"business_name":"Acme Plumbing","email":"jane@acme.com","rep":"Sam"}'
```

---

## 2. List your referred leads (+ status)
`GET /api/partner/leads`

**Headers**
```
X-Partner-Key: rrp_live_ryzen_xxxxx
```

**Response**
```json
{
  "leads": [
    {
      "id": "uuid",
      "business_name": "Acme Plumbing",
      "contact_name": "Jane Doe",
      "stage": "contacted",
      "email": "jane@acme.com",
      "phone": "(555) 123-4567",
      "rep": "Sam",
      "created_at": "2026-06-26T18:20:00Z"
    }
  ]
}
```
You only ever see the leads **you** referred — never the rest of the pipeline, and never any stored credentials or financials.

**Stages** a lead moves through: `lead → contacted → accepted → in_build → finalized → published` (or `lost`). Use `stage` to show reps where their referral stands.

---

## 3. Integration ideas for Ryzen's Claude Code
- **Embed lead submission** in your existing CRM: on "create lead," also `POST /api/partner/lead` and store the returned `id`.
- **Status sync:** poll `GET /api/partner/leads` (e.g. hourly) and update your CRM's view so reps see RR's progress without leaving your app.
- **Rep leaderboard:** count leads per `rep` and how many reached `published`.
- **Keep the key server-side:** for a public-facing app, proxy these calls through your own backend so the `PARTNER_KEY` isn't exposed in browser code.

---

## Notes
- **Rate/abuse:** the key only permits creating and reading *your* referred leads. Keep it reasonably private.
- **Need more?** Rank Rebels can add webhooks (e.g. POST to your URL when a referred lead is won/lost) — request it and they'll wire it up.
