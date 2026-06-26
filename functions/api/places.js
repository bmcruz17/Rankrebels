// POST /api/places
//   Structured:  { industry, city, state, keyword, minRating, minReviews, onlyNoWebsite, requirePhone, maxPages }
//   Legacy:      { textQuery, ... }   (still supported)
// Finds local businesses via Google Places API (New), flags the ones with NO website (prime web-design
// leads), pulls multiple pages, and scores each lead 0-100 ("crystal ball" — who to call first).
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

// "Crystal ball" opportunity score (0-100): how good a web-design lead this is, and who to call first.
//  - No website is the single biggest signal (they need exactly what we sell).
//  - Reviews = proven local demand; rating = reputation worth putting online.
//  - A listed phone means we can actually reach them today.
function scoreLead(p) {
  let s = 0;
  s += p.website ? 8 : 45;                                   // no website → prime target
  s += Math.min(p.reviews || 0, 200) / 200 * 25;            // demand (caps at 200 reviews)
  s += (Math.min(p.rating || 0, 5) / 5) * 15;               // reputation
  s += p.phone ? 15 : 0;                                    // reachable now
  return Math.round(Math.max(0, Math.min(100, s)));
}

function buildQuery(b) {
  if ((b.textQuery || '').trim()) return b.textQuery.trim();
  const industry = (b.industry || '').trim();
  const city = (b.city || '').trim();
  const state = (b.state || '').trim();
  const keyword = (b.keyword || '').trim();
  let q = industry;
  if (keyword) q = (q ? q + ' ' : '') + keyword;
  const loc = [city, state].filter(Boolean).join(' ');
  if (loc) q = (q ? q + ' in ' : '') + loc;
  return q.trim();
}

export async function onRequestPost({ request, env }) {
  try {
    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    const email = await verifyTeam(token);
    if (!email) return json({ error: 'Not authorized — sign in again.' }, 401);
    if (!env.GOOGLE_PLACES_API_KEY) return json({ error: 'Lead finder is not configured yet (missing GOOGLE_PLACES_API_KEY in Cloudflare).' }, 503);

    const b = await request.json().catch(() => ({}));
    const textQuery = buildQuery(b);
    if (!textQuery) return json({ error: 'Enter at least an industry and a city (e.g. "auto repair" · "El Monte" · "CA").' }, 400);

    const minRating = Number(b.minRating) || 0;
    const minReviews = Number(b.minReviews) || 0;
    const onlyNoWebsite = b.onlyNoWebsite !== false;
    const requirePhone = b.requirePhone === true;
    const maxPages = Math.max(1, Math.min(3, Number(b.maxPages) || 3)); // up to 60 results

    const fieldMask = [
      'places.id', 'places.displayName', 'places.formattedAddress', 'places.rating',
      'places.userRatingCount', 'places.websiteUri', 'places.nationalPhoneNumber',
      'places.googleMapsUri', 'places.businessStatus', 'places.editorialSummary',
      'places.primaryTypeDisplayName', 'nextPageToken'
    ].join(',');

    let raw = [];
    let pageToken = null;
    for (let page = 0; page < maxPages; page++) {
      const body = { textQuery, pageSize: 20 };
      if (pageToken) body.pageToken = pageToken;
      const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': env.GOOGLE_PLACES_API_KEY,
          'X-Goog-FieldMask': fieldMask
        },
        body: JSON.stringify(body)
      });
      const txt = await r.text();
      if (!r.ok) {
        if (page === 0) return json({ error: 'Google Places: ' + (txt || ('HTTP ' + r.status)).slice(0, 500) }, 200);
        break; // got some pages already; stop on a later-page error
      }
      let data = {};
      try { data = JSON.parse(txt); } catch (e) { break; }
      raw = raw.concat(data.places || []);
      pageToken = data.nextPageToken || null;
      if (!pageToken) break;
    }

    // de-dupe by place id
    const seen = {};
    let places = raw.filter(p => { if (!p.id || seen[p.id]) return false; seen[p.id] = 1; return true; }).map(p => ({
      id: p.id,
      name: (p.displayName && p.displayName.text) || '',
      address: p.formattedAddress || '',
      rating: p.rating || 0,
      reviews: p.userRatingCount || 0,
      phone: p.nationalPhoneNumber || '',
      website: p.websiteUri || '',
      mapsUri: p.googleMapsUri || '',
      status: p.businessStatus || '',
      summary: (p.editorialSummary && p.editorialSummary.text) || (p.primaryTypeDisplayName && p.primaryTypeDisplayName.text) || ''
    }));

    const base = places
      .filter(p => p.status !== 'CLOSED_PERMANENTLY')
      .filter(p => p.rating >= minRating && p.reviews >= minReviews);

    const withSite = base.filter(p => p.website).length;
    const withPhone = base.filter(p => p.phone).length;

    let filtered = onlyNoWebsite ? base.filter(p => !p.website) : base;
    if (requirePhone) filtered = filtered.filter(p => p.phone);

    filtered = filtered
      .map(p => Object.assign(p, { score: scoreLead(p) }))
      .sort((a, b2) => (b2.score - a.score) || (b2.reviews - a.reviews));

    return json({
      count: filtered.length,
      totalFound: base.length,
      withSite, withPhone,
      query: textQuery,
      places: filtered
    });
  } catch (err) {
    return json({ error: 'Lead finder error: ' + String(err && err.message || err).slice(0, 300) }, 200);
  }
}
