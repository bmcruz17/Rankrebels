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
// X-Partner-Key header or a Bearer token.
export function partnerFromKey(request, env) {
  let map = {};
  try { map = JSON.parse(env.PARTNER_KEYS || '{}'); } catch (e) { map = {}; }
  const key = (request.headers.get('x-partner-key') || (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')).trim();
  if (!key) return null;
  return map[key] || null;
}

export function sbHeaders(env, extra) {
  return Object.assign({ apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY, 'content-type': 'application/json' }, extra || {});
}
