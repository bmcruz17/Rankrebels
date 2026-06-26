// GET /api/partner/leads          (partner reseller → see their own submitted leads + status)
// Headers: X-Partner-Key: <your partner key>
// Returns: { leads: [ { id, business_name, contact_name, stage, email, phone, rep, created_at } ] }
//
// A partner can ONLY see the leads they referred — never the rest of the pipeline,
// and never any stored credentials/financials (we select a safe column list only).

import { SUPABASE_URL, json, preflight, partnerFromKey, sbHeaders } from './_util.js';

const SAFE = 'id,business_name,contact_name,stage,email,phone,partner_rep,created_at';

export async function onRequestOptions() { return preflight(); }

export async function onRequestGet({ request, env }) {
  try {
    const partner = await partnerFromKey(request, env);
    if (!partner) return json({ error: 'Invalid or missing partner key.' }, 401);
    if (!env.SUPABASE_SERVICE_ROLE_KEY) return json({ error: 'Server not configured.' }, 503);

    const base = SUPABASE_URL + '/rest/v1/rr_clients?partner=eq.' + encodeURIComponent(partner) + '&select=' + SAFE;
    let r = await fetch(base + '&order=created_at.desc&limit=200', { headers: sbHeaders(env) });
    if (!r.ok) r = await fetch(base + '&limit=200', { headers: sbHeaders(env) }); // retry without ordering if created_at missing
    if (!r.ok) return json({ leads: [], note: 'Could not load leads (' + r.status + ').' });

    const rows = await r.json().catch(() => []);
    const leads = (Array.isArray(rows) ? rows : []).map(x => ({
      id: x.id, business_name: x.business_name, contact_name: x.contact_name,
      stage: x.stage, email: x.email, phone: x.phone, rep: x.partner_rep, created_at: x.created_at,
    }));
    return json({ leads });
  } catch (err) {
    return json({ error: 'Partner leads error: ' + String(err && err.message || err).slice(0, 200) }, 500);
  }
}
