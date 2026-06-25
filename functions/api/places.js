// POST /api/places  { textQuery, minRating, minReviews, onlyNoWebsite }
// Finds businesses via Google Places API (New) and flags the ones with NO website — prime web-design leads.
//
// Cloudflare secret required: GOOGLE_PLACES_API_KEY
//   (Google Cloud → same project → enable "Places API (New)" → Credentials → create an API key.
//    The key's Application restriction must be "None" or IP — NOT HTTP referrers — or server calls are blocked.)

const SUPABASE_URL = 'https://eejmocneacfleltspedl.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlam1vY25lYWNmbGVsdHNwZWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyNDQ3MTMsImV4cCI6MjA5NzgyMDcxM30.dXJTMFp_d9JRlXkesVPCUj6tBi3qphxxOu3v-Cuw7_Y';
const TEAM = ['brandonmcruz@mac.com', 'eric.paul.ellsworth@gmail.com', 'brandon@rankrebels.ai', 'eric@rankrebels.ai'];

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
    return (TEAM.indexOf(email) >= 0 || email.endsWith('@rankrebels.ai')) ? email : null;
  } catch (e) { return null; }
}

export async function onRequestPost({ request, env }) {
  try {
    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    const email = await verifyTeam(token);
    if (!email) return json({ error: 'Not authorized — sign in again.' }, 401);
    if (!env.GOOGLE_PLACES_API_KEY) return json({ error: 'Lead finder is not configured yet (missing GOOGLE_PLACES_API_KEY in Cloudflare).' }, 503);

    const b = await request.json().catch(() => ({}));
    const textQuery = (b.textQuery || '').trim();
    if (!textQuery) return json({ error: 'Enter a search like "restaurants in El Monte CA".' }, 400);
    const minRating = Number(b.minRating) || 0;
    const minReviews = Number(b.minReviews) || 0;
    const onlyNoWebsite = b.onlyNoWebsite !== false;

    const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': env.GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.websiteUri,places.nationalPhoneNumber,places.googleMapsUri,places.businessStatus'
      },
      body: JSON.stringify({ textQuery: textQuery, pageSize: 20 })
    });
    const txt = await r.text();
    if (!r.ok) return json({ error: 'Google Places: ' + (txt || ('HTTP ' + r.status)).slice(0, 500) }, 200);
    let data = {};
    try { data = JSON.parse(txt); } catch (e) { return json({ error: 'Places returned an unreadable response.' }, 200); }

    let places = (data.places || []).map(p => ({
      id: p.id,
      name: (p.displayName && p.displayName.text) || '',
      address: p.formattedAddress || '',
      rating: p.rating || 0,
      reviews: p.userRatingCount || 0,
      phone: p.nationalPhoneNumber || '',
      website: p.websiteUri || '',
      mapsUri: p.googleMapsUri || '',
      status: p.businessStatus || ''
    }));
    places = places
      .filter(p => p.status !== 'CLOSED_PERMANENTLY')
      .filter(p => p.rating >= minRating && p.reviews >= minReviews && (!onlyNoWebsite || !p.website))
      .sort((a, b) => b.reviews - a.reviews);

    return json({ count: places.length, places });
  } catch (err) {
    return json({ error: 'Lead finder error: ' + String(err && err.message || err).slice(0, 300) }, 200);
  }
}
