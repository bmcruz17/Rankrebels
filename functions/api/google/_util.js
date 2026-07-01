// Shared helpers for the Google integration (Cloudflare Pages Functions).
// Underscore-prefixed → not a route, just an importable module.
//
// Cloudflare secrets required:
//   GOOGLE_CLIENT_SECRET         (from the Google OAuth client)
//   SUPABASE_SERVICE_ROLE_KEY    (Supabase → Settings → API → service_role key)

export const GOOGLE_CLIENT_ID = '80870826640-nr849c98cvnjie2s6fupi4levtdi3v4m.apps.googleusercontent.com';
export const REDIRECT_URI = 'https://rankrebels.ai/api/google/callback';
export const SCOPES = 'https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly';

const SUPABASE_URL = 'https://eejmocneacfleltspedl.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlam1vY25lYWNmbGVsdHNwZWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyNDQ3MTMsImV4cCI6MjA5NzgyMDcxM30.dXJTMFp_d9JRlXkesVPCUj6tBi3qphxxOu3v-Cuw7_Y';
const TEAM = ['brandon@rankrebels.ai', 'brandonmcruz@mac.com'];

export function json(obj, status) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: { 'content-type': 'application/json' } });
}
export function bearer(request) {
  return (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
}

// Verify a Supabase access token; return the team member's lowercase email, or null.
export async function verifyTeam(token) {
  if (!token) return null;
  const r = await fetch(SUPABASE_URL + '/auth/v1/user', { headers: { apikey: SUPABASE_ANON, authorization: 'Bearer ' + token } });
  if (!r.ok) return null;
  const u = await r.json().catch(() => null);
  const email = (u && u.email || '').toLowerCase();
  if (!email) return null;
  return (TEAM.indexOf(email) >= 0) ? email : null;
}

// --- token storage (service role, bypasses RLS) ---
function sbHeaders(env) {
  return { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY, 'content-type': 'application/json' };
}
export async function getTokens(env, email) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/rr_google_tokens?email=eq.' + encodeURIComponent(email) + '&select=*', { headers: sbHeaders(env) });
  if (!r.ok) return null;
  const rows = await r.json().catch(() => []);
  return rows[0] || null;
}
export async function saveTokens(env, email, t) {
  const body = Object.assign({ email, updated_at: new Date().toISOString() }, t);
  await fetch(SUPABASE_URL + '/rest/v1/rr_google_tokens', {
    method: 'POST',
    headers: Object.assign(sbHeaders(env), { prefer: 'resolution=merge-duplicates' }),
    body: JSON.stringify(body)
  });
}

// Return a valid Google access token for the email, refreshing if needed. null if not connected.
export async function validAccessToken(env, email) {
  const row = await getTokens(env, email);
  if (!row) return null;
  if (row.access_token && row.expiry && new Date(row.expiry).getTime() > Date.now() + 60000) return row.access_token;
  if (!row.refresh_token) return row.access_token || null;
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET,
    refresh_token: row.refresh_token, grant_type: 'refresh_token'
  });
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: params });
  if (!r.ok) return null;
  const d = await r.json();
  const expiry = new Date(Date.now() + (d.expires_in || 3600) * 1000).toISOString();
  await saveTokens(env, email, { access_token: d.access_token, expiry, refresh_token: d.refresh_token || row.refresh_token, scope: d.scope || row.scope });
  return d.access_token;
}

// --- signed OAuth state (HMAC, so the callback can trust which user started it) ---
function b64url(bytes) {
  let s = ''; const a = new Uint8Array(bytes);
  for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function hmac(key, data) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(data));
  return b64url(sig);
}
export async function signState(env, email) {
  const payload = email + '|' + (Date.now() + 600000);
  const p = b64url(new TextEncoder().encode(payload));
  return p + '.' + await hmac(env.GOOGLE_CLIENT_SECRET, payload);
}
export async function verifyState(env, state) {
  try {
    const [p, sig] = String(state).split('.');
    const payload = new TextDecoder().decode(Uint8Array.from(atob(p.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)));
    if (sig !== await hmac(env.GOOGLE_CLIENT_SECRET, payload)) return null;
    const [email, exp] = payload.split('|');
    if (Date.now() > Number(exp)) return null;
    return email;
  } catch (e) { return null; }
}
