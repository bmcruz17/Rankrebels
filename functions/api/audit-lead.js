// POST /api/audit-lead   { email, url, business?, name?, phone?, score?, grade?, industry? }
// Captures an AccessGrade audit visitor who wants their site fixed, and drops them into
// the Rank Rebels pipeline tagged as a partner referral from the AccessGrade audit brand.
// Server-side (service role) so no key is exposed in the public audit page.

const SUPABASE_URL = 'https://eejmocneacfleltspedl.supabase.co';
const PARTNER_NAME = 'AccessGrade (ADA Audit)';
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST,OPTIONS',
  'access-control-allow-headers': 'content-type',
};
function json(obj, status) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: Object.assign({ 'content-type': 'application/json' }, CORS) });
}
export function onRequestOptions() { return new Response(null, { status: 204, headers: CORS }); }

function sbHeaders(env, extra) {
  return Object.assign({ apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY, 'content-type': 'application/json' }, extra || {});
}
function hostFromUrl(u) { try { return new URL(/^https?:/i.test(u) ? u : 'https://' + u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } }

export async function onRequestPost({ request, env }) {
  try {
    if (!env.SUPABASE_SERVICE_ROLE_KEY) return json({ error: 'Not configured.' }, 503);
    const b = await request.json().catch(() => ({}));
    const email = (b.email || '').trim().toLowerCase();
    const phone = (b.phone || '').trim();
    if (!email && !phone) return json({ error: 'Email or phone required.' }, 400);

    const host = hostFromUrl(b.url || '');
    const business = (b.business || '').trim() || host || 'Audit lead';

    // dedupe by email/phone
    try {
      const ors = [];
      if (email) ors.push('email.eq.' + encodeURIComponent(email));
      if (phone) ors.push('phone.eq.' + encodeURIComponent(phone));
      if (ors.length) {
        const dr = await fetch(SUPABASE_URL + '/rest/v1/rr_clients?select=id&or=(' + ors.join(',') + ')&limit=1', { headers: sbHeaders(env) });
        if (dr.ok) { const rows = await dr.json().catch(() => []); if (rows[0]) return json({ ok: true, id: rows[0].id, duplicate: true }); }
      }
    } catch (e) { /* non-fatal */ }

    const noteBits = ['ADA audit referral'];
    if (b.score != null && b.grade) noteBits.push('scored ' + b.score + '/100 (grade ' + b.grade + ')');
    if (b.url) noteBits.push('site: ' + b.url);
    if (b.industry) noteBits.push('industry: ' + b.industry);
    noteBits.push('wants their website made accessible/compliant');

    const rec = {
      business_name: business,
      contact_name: (b.name || '').trim() || null,
      email: email || null,
      phone: phone || null,
      stage: 'lead',
      acquired_by: 'partner',
      partner: PARTNER_NAME,
      notes: noteBits.join(' — '),
    };

    let r = await insert(env, rec);
    if (r.status >= 400) {
      const msg = (await r.clone().text()).toLowerCase();
      if (/partner|acquired_by|column|constraint|check/.test(msg)) {
        const fb = Object.assign({}, rec); delete fb.partner; fb.acquired_by = 'website';
        r = await insert(env, fb);
      }
    }
    if (r.status >= 400) return json({ error: 'Could not save: ' + (await r.text()).slice(0, 200) }, 502);
    const saved = await r.json().catch(() => []);
    return json({ ok: true, id: (Array.isArray(saved) ? saved[0] && saved[0].id : null) });
  } catch (err) {
    return json({ error: 'Audit lead error: ' + String(err && err.message || err).slice(0, 200) }, 500);
  }
}

function insert(env, rec) {
  return fetch(SUPABASE_URL + '/rest/v1/rr_clients', {
    method: 'POST', headers: sbHeaders(env, { prefer: 'return=representation' }), body: JSON.stringify(rec),
  });
}
