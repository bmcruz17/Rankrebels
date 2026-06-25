// POST /api/places  { textQuery, minRating, minReviews, onlyNoWebsite }
// Finds businesses via Google Places API (New) and flags the ones with NO website — prime web-design leads.
//
// Cloudflare secret required: GOOGLE_PLACES_API_KEY
//   (Google Cloud → same project → enable "Places API (New)" → Credentials → create an API key.)
import { json, bearer, verifyTeam } from './google/_util.js';

export async function onRequestPost({ request, env }) {
  const email = await verifyTeam(bearer(request));
  if (!email) return json({ error: 'Not authorized.' }, 401);
  if (!env.GOOGLE_PLACES_API_KEY) return json({ error: 'Lead finder is not configured yet (missing GOOGLE_PLACES_API_KEY).' }, 503);

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
  if (!r.ok) { const d = await r.text(); return json({ error: 'Google Places error — ' + (d || ('HTTP ' + r.status)).slice(0, 400) }, 502); }
  const data = await r.json();

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
}
