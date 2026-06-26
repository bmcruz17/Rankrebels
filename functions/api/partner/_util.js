// Shared helpers for the Partner / reseller API (Cloudflare Pages Functions).
// Underscore-prefixed → not a route, just an importable module.
//
// Cloudflare secret required:
//   PARTNER_KEYS                 JSON map of API key -> partner name, e.g.
//                                {"rrp_live_ryzen_8fk3...":"Ryzen Recruit"}
//   SUPABASE_SERVICE_ROLE_KEY    (insert/read leads, bypassing RLS — never exposed to the partner)

export const SUPABASE_URL = 'https://eejmocneacfleltspedl.supabase.co';

// The partner API is called from a partner's own website/app on a different origin,
// so every response needs CORS headers. Keys gate access, not the origin.
export const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'content-type,x-partner-key,authorization',
  'access-control-max-age': '86400',
};

export function json(obj, status) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: Object.assign({ 'content-type': 'application/json' }, CORS) });
}
export function preflight() {
  return new Response(null, { status: 204, headers: CORS });
}

// Return the partner name for a presented key, or null. Accepts the key via the
// X-Partner-Key header or a Bearer token. Checks two sources:
//   1) the optional PARTNER_KEYS env map (static)
//   2) keys issued from the dashboard, stored in the rr_partners table (active only)
export async function partnerFromKey(request, env) {
  const key = (request.headers.get('x-partner-key') || (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')).trim();
  if (!key) return null;
  // 1) static env map (optional)
  try { const map = JSON.parse(env.PARTNER_KEYS || '{}'); if (map[key]) return map[key]; } catch (e) { /* ignore */ }
  // 2) dashboard-issued keys (rr_partners)
  if (env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const r = await fetch(SUPABASE_URL + '/rest/v1/rr_partners?api_key=eq.' + encodeURIComponent(key) + '&active=eq.true&select=name&limit=1', { headers: sbHeaders(env) });
      if (r.ok) { const rows = await r.json().catch(() => []); if (rows[0] && rows[0].name) return rows[0].name; }
    } catch (e) { /* ignore */ }
  }
  return null;
}

export function sbHeaders(env, extra) {
  return Object.assign({ apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY, 'content-type': 'application/json' }, extra || {});
}
