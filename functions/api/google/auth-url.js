// POST /api/google/auth-url  → returns the Google consent URL for the signed-in team member.
import { GOOGLE_CLIENT_ID, REDIRECT_URI, SCOPES, json, bearer, verifyTeam, signState } from './_util.js';

export async function onRequestPost({ request, env }) {
  if (!env.GOOGLE_CLIENT_SECRET) return json({ error: 'Google is not configured yet (missing GOOGLE_CLIENT_SECRET).' }, 503);
  const email = await verifyTeam(bearer(request));
  if (!email) return json({ error: 'Not authorized.' }, 401);
  const state = await signState(env, email);
  const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    scope: SCOPES,
    state
  }).toString();
  return json({ url });
}
