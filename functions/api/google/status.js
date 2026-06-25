// POST /api/google/status → { connected: bool } for the signed-in team member.
import { json, bearer, verifyTeam, getTokens } from './_util.js';

export async function onRequestPost({ request, env }) {
  const email = await verifyTeam(bearer(request));
  if (!email) return json({ error: 'Not authorized.' }, 401);
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return json({ connected: false, configured: false });
  const row = await getTokens(env, email);
  return json({ connected: !!(row && row.refresh_token), configured: !!env.GOOGLE_CLIENT_SECRET });
}
