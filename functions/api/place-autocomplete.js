// GET /api/place-autocomplete?q=123+main   → US address predictions for the dashboard's Address field.
// Proxies Google Places Autocomplete (New) with the server-side key so nothing is exposed client-side.
// Cloudflare secret required: GOOGLE_PLACES_API_KEY (same key as /api/places).

const SUPABASE_URL = 'https://eejmocneacfleltspedl.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlam1vY25lYWNmbGVsdHNwZWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyNDQ3MTMsImV4cCI6MjA5NzgyMDcxM30.dXJTMFp_d9JRlXkesVPCUj6tBi3qphxxOu3v-Cuw7_Y';
const TEAM = ['brandon@rankrebels.ai', 'brandonmcruz@mac.com'];

function json(obj, status) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: { 'content-type': 'application/json' } });
}
async function verifyTeam(token) {
  if (!token) return null;
  try {
    const r = await fetch(SUPABASE_URL + '/auth/v1/user', { headers: { apikey: SUPABASE_ANON, authorization: 'Bearer ' + token } });
    if (!r.ok) return null;
    const u = await r.json();
    const email = (u && u.email || '').toLowerCase();
    if (!email) return null;
    return (TEAM.indexOf(email) >= 0) ? email : null;
  } catch (e) { return null; }
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim();
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!(await verifyTeam(token))) return json({ error: 'Unauthorized' }, 401);
  if (q.length < 3) return json({ suggestions: [] });
  if (!env.GOOGLE_PLACES_API_KEY) return json({ error: 'not configured', suggestions: [] }, 200);

  try {
    const r = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': env.GOOGLE_PLACES_API_KEY },
      body: JSON.stringify({ input: q, includedRegionCodes: ['us'] }),
    });
    if (!r.ok) return json({ error: 'google ' + r.status, suggestions: [] }, 200);
    const data = await r.json();
    const out = (data.suggestions || [])
      .map((s) => s.placePrediction)
      .filter(Boolean)
      .map((p) => ({ description: (p.text && p.text.text) || '', placeId: p.placeId || '' }))
      .filter((p) => p.description);
    return json({ suggestions: out.slice(0, 6) });
  } catch (e) {
    return json({ error: 'fetch_error', suggestions: [] }, 200);
  }
}
