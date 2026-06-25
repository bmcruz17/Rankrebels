// GET /api/google/callback  → Google redirects here after consent; exchange code, store tokens.
import { GOOGLE_CLIENT_ID, REDIRECT_URI, SCOPES, verifyState, saveTokens } from './_util.js';

function back(status) { return Response.redirect('https://rankrebels.ai/dashboard.html?google=' + status, 302); }

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url);
  const code = u.searchParams.get('code');
  const state = u.searchParams.get('state');
  if (u.searchParams.get('error')) return back('denied');
  const email = await verifyState(env, state || '');
  if (!email || !code) return back('error');

  const params = new URLSearchParams({
    code,
    client_id: GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code'
  });
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: params });
  if (!r.ok) return back('error');
  const d = await r.json();
  const expiry = new Date(Date.now() + (d.expires_in || 3600) * 1000).toISOString();
  await saveTokens(env, email, { access_token: d.access_token, refresh_token: d.refresh_token || null, expiry, scope: d.scope || SCOPES });
  return back('connected');
}
