// POST /api/partner/lead         (partner reseller → Rank Rebels pipeline)
// Headers: X-Partner-Key: <your partner key>   Content-Type: application/json
// Body: { business_name, contact_name?, email?, phone?, address?, rep?, notes?, monthly_charge?, plan? }
// Returns: { ok:true, id, stage:"lead", duplicate?:true }
//
// Leads created here land in the Rank Rebels pipeline as `acquired_by:"partner"`,
// tagged with the partner name + the rep who submitted them.

import { SUPABASE_URL, CORS, json, preflight, partnerFromKey, sbHeaders } from './_util.js';

export async function onRequestOptions() { return preflight(); }

export async function onRequestPost({ request, env }) {
  try {
    const partner = partnerFromKey(request, env);
    if (!partner) return json({ error: 'Invalid or missing partner key.' }, 401);
    if (!env.SUPABASE_SERVICE_ROLE_KEY) return json({ error: 'Server not configured.' }, 503);

    const b = await request.json().catch(() => ({}));
    const business_name = (b.business_name || b.business || '').trim();
    const email = (b.email || '').trim().toLowerCase();
    const phone = (b.phone || '').trim();
    if (!business_name) return json({ error: 'business_name is required.' }, 400);
    if (!email && !phone) return json({ error: 'Provide an email or a phone number.' }, 400);

    // Light dedupe: if we already have this email or phone, return that record instead of duplicating.
    try {
      const ors = [];
      if (email) ors.push('email.eq.' + encodeURIComponent(email));
      if (phone) ors.push('phone.eq.' + encodeURIComponent(phone));
      if (ors.length) {
        const q = SUPABASE_URL + '/rest/v1/rr_clients?select=id,stage&or=(' + ors.join(',') + ')&limit=1';
        const dr = await fetch(q, { headers: sbHeaders(env) });
        if (dr.ok) { const rows = await dr.json().catch(() => []); if (rows[0]) return json({ ok: true, id: rows[0].id, stage: rows[0].stage, duplicate: true }); }
      }
    } catch (e) { /* non-fatal */ }

    const rep = (b.rep || b.rep_name || '').trim();
    const noteParts = [];
    if (b.notes) noteParts.push(String(b.notes).trim());
    if (b.plan) noteParts.push('Interested in: ' + String(b.plan).trim());
    noteParts.push('Referred by ' + partner + (rep ? ' (' + rep + ')' : ''));

    const rec = {
      business_name,
      contact_name: (b.contact_name || b.contact || '').trim() || null,
      email: email || null,
      phone: phone || null,
      address: (b.address || '').trim() || null,
      monthly_charge: Number(b.monthly_charge) || null,
      stage: 'lead',
      acquired_by: 'partner',
      partner: partner,
      partner_rep: rep || null,
      notes: noteParts.join(' — '),
    };

    let r = await insert(env, rec);
    // Degrade gracefully if the partner columns / constraint haven't been migrated yet.
    if (r.status >= 400) {
      const msg = (await r.clone().text()).toLowerCase();
      if (/partner|acquired_by|column|constraint|check/.test(msg)) {
        const fallback = Object.assign({}, rec);
        delete fallback.partner; delete fallback.partner_rep;
        fallback.acquired_by = 'website';
        fallback.notes = rec.notes;
        r = await insert(env, fallback);
      }
    }
    if (r.status >= 400) return json({ error: 'Could not save lead: ' + (await r.text()).slice(0, 300) }, 502);
    const saved = await r.json().catch(() => []);
    const id = Array.isArray(saved) ? (saved[0] && saved[0].id) : (saved && saved.id);
    return json({ ok: true, id: id || null, stage: 'lead' });
  } catch (err) {
    return json({ error: 'Partner lead error: ' + String(err && err.message || err).slice(0, 200) }, 500);
  }
}

function insert(env, rec) {
  return fetch(SUPABASE_URL + '/rest/v1/rr_clients', {
    method: 'POST',
    headers: sbHeaders(env, { prefer: 'return=representation' }),
    body: JSON.stringify(rec),
  });
}
