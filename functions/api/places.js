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

// Nationwide "roll the dice" pools — random industry × random city => random businesses anywhere in the USA.
const DICE_INDUSTRIES = [
  'auto repair', 'plumber', 'HVAC', 'roofing', 'electrician', 'landscaping', 'restaurant', 'dentist',
  'chiropractor', 'hair salon', 'barber shop', 'nail salon', 'med spa', 'auto detailing', 'towing',
  'pest control', 'pool service', 'general contractor', 'painter', 'flooring', 'locksmith', 'catering',
  'florist', 'bakery', 'coffee shop', 'gym', 'pet grooming', 'veterinarian', 'daycare', 'tattoo shop',
  'mechanic', 'tire shop', 'car wash', 'dry cleaner', 'tailor', 'upholstery', 'cabinet maker', 'welding',
  'fencing', 'concrete', 'tree service', 'junk removal', 'moving company', 'handyman', 'garage door repair',
  'window cleaning', 'pressure washing', 'appliance repair', 'butcher shop', 'taqueria', 'pizzeria',
  'BBQ restaurant', 'seafood restaurant', 'deli', 'ice cream shop', 'smoke shop', 'consignment shop'
];
const DICE_CITIES = [
  ['Birmingham','AL'],['Anchorage','AK'],['Phoenix','AZ'],['Tucson','AZ'],['Little Rock','AR'],
  ['Los Angeles','CA'],['Fresno','CA'],['Sacramento','CA'],['Bakersfield','CA'],['Riverside','CA'],
  ['Denver','CO'],['Colorado Springs','CO'],['Hartford','CT'],['Wilmington','DE'],['Miami','FL'],
  ['Tampa','FL'],['Orlando','FL'],['Jacksonville','FL'],['Atlanta','GA'],['Savannah','GA'],
  ['Honolulu','HI'],['Boise','ID'],['Chicago','IL'],['Indianapolis','IN'],['Des Moines','IA'],
  ['Wichita','KS'],['Louisville','KY'],['New Orleans','LA'],['Baton Rouge','LA'],['Portland','ME'],
  ['Baltimore','MD'],['Boston','MA'],['Worcester','MA'],['Detroit','MI'],['Grand Rapids','MI'],
  ['Minneapolis','MN'],['Jackson','MS'],['Kansas City','MO'],['St. Louis','MO'],['Billings','MT'],
  ['Omaha','NE'],['Las Vegas','NV'],['Reno','NV'],['Manchester','NH'],['Newark','NJ'],
  ['Albuquerque','NM'],['New York','NY'],['Buffalo','NY'],['Rochester','NY'],['Charlotte','NC'],
  ['Raleigh','NC'],['Greensboro','NC'],['Fargo','ND'],['Columbus','OH'],['Cleveland','OH'],
  ['Cincinnati','OH'],['Oklahoma City','OK'],['Tulsa','OK'],['Portland','OR'],['Eugene','OR'],
  ['Philadelphia','PA'],['Pittsburgh','PA'],['San Juan','PR'],['Providence','RI'],['Charleston','SC'],
  ['Columbia','SC'],['Sioux Falls','SD'],['Nashville','TN'],['Memphis','TN'],['Knoxville','TN'],
  ['Houston','TX'],['San Antonio','TX'],['Dallas','TX'],['Austin','TX'],['El Paso','TX'],
  ['Fort Worth','TX'],['Salt Lake City','UT'],['Provo','UT'],['Burlington','VT'],['Virginia Beach','VA'],
  ['Richmond','VA'],['Seattle','WA'],['Spokane','WA'],['Tacoma','WA'],['Charleston','WV'],
  ['Milwaukee','WI'],['Madison','WI'],['Cheyenne','WY']
];
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

// "Crystal ball" opportunity score (0-100): how good a web-design lead this is, and who to call first.
//  - No website is the single biggest signal (they need exactly what we sell).
//  - Reviews = proven local demand; rating = reputation worth putting online.
//  - A listed phone means we can actually reach them today.
function scoreLead(p) {
  let s = 0;
  s += p.website ? 6 : 40;                                  // no website = the whole opportunity
  s += p.phone ? 18 : 0;                                    // reachable today (you can actually call)
  s += Math.min(p.reviews || 0, 150) / 150 * 26;           // proven local demand (caps at 150 reviews)
  const r = Math.min(p.rating || 0, 5);
  s += r >= 3 ? ((r - 3) / 2) * 16 : 0;                    // reputation, scaled from a 3.0 floor
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

const FIELD_MASK = [
  'places.id', 'places.displayName', 'places.formattedAddress', 'places.rating',
  'places.userRatingCount', 'places.websiteUri', 'places.nationalPhoneNumber',
  'places.googleMapsUri', 'places.businessStatus', 'places.editorialSummary',
  'places.primaryTypeDisplayName', 'nextPageToken'
].join(',');

function mapPlace(p) {
  return {
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
  };
}

// One text search, optionally paginated. Returns an array of mapped places (may throw).
async function searchPlaces(env, textQuery, maxPages) {
  let raw = [], pageToken = null;
  for (let page = 0; page < maxPages; page++) {
    const body = { textQuery, pageSize: 20 };
    if (pageToken) body.pageToken = pageToken;
    const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': env.GOOGLE_PLACES_API_KEY, 'X-Goog-FieldMask': FIELD_MASK },
      body: JSON.stringify(body)
    });
    const txt = await r.text();
    if (!r.ok) { if (page === 0) throw new Error((txt || ('HTTP ' + r.status)).slice(0, 500)); break; }
    let data = {};
    try { data = JSON.parse(txt); } catch (e) { break; }
    raw = raw.concat(data.places || []);
    pageToken = data.nextPageToken || null;
    if (!pageToken) break;
  }
  return raw.map(mapPlace);
}

function dedupe(places) {
  const seen = {};
  return places.filter(p => { if (!p.id || seen[p.id]) return false; seen[p.id] = 1; return true; });
}

export async function onRequestPost({ request, env }) {
  try {
    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    const email = await verifyTeam(token);
    if (!email) return json({ error: 'Not authorized — sign in again.' }, 401);
    if (!env.GOOGLE_PLACES_API_KEY) return json({ error: 'Lead finder is not configured yet (missing GOOGLE_PLACES_API_KEY in Cloudflare).' }, 503);

    const b = await request.json().catch(() => ({}));

    // ---- ROLL THE DICE: random qualifying businesses anywhere in the USA ----
    if (b.dice) {
      const want = 20;
      const diceRating = Number(b.minRating) || 4.0;   // "good reviews"
      const diceReviews = Number(b.minReviews) || 10;
      // Fire several random industry × random city searches at once.
      const combos = [];
      const usedCity = {};
      for (let i = 0; i < 14; i++) {
        const c = pick(DICE_CITIES); const ind = pick(DICE_INDUSTRIES);
        combos.push(ind + ' in ' + c[0] + ' ' + c[1]);
        usedCity[c[0]] = 1;
      }
      const settled = await Promise.all(combos.map(q => searchPlaces(env, q, 1).catch(() => [])));
      let all = dedupe([].concat.apply([], settled));
      let pool = all
        .filter(p => p.status !== 'CLOSED_PERMANENTLY')
        .filter(p => !p.website && p.phone)                 // no website, reachable by phone
        .filter(p => p.rating >= diceRating && p.reviews >= diceReviews)
        .map(p => Object.assign(p, { score: scoreLead(p) }));
      pool = shuffle(pool).slice(0, want).sort((a, b2) => (b2.score - a.score) || (b2.reviews - a.reviews));
      return json({ count: pool.length, totalFound: all.length, dice: true, citiesRolled: Object.keys(usedCity).length, places: pool });
    }

    const textQuery = buildQuery(b);
    if (!textQuery) return json({ error: 'Enter at least an industry and a city (e.g. "auto repair" · "El Monte" · "CA").' }, 400);

    const minRating = Number(b.minRating) || 0;
    const minReviews = Number(b.minReviews) || 0;
    const onlyNoWebsite = b.onlyNoWebsite !== false;
    const requirePhone = b.requirePhone === true;
    const maxPages = Math.max(1, Math.min(3, Number(b.maxPages) || 3)); // up to 60 results

    let places;
    try { places = dedupe(await searchPlaces(env, textQuery, maxPages)); }
    catch (e) { return json({ error: 'Google Places: ' + String(e.message || e).slice(0, 500) }, 200); }

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

    return json({ count: filtered.length, totalFound: base.length, withSite, withPhone, query: textQuery, places: filtered });
  } catch (err) {
    return json({ error: 'Lead finder error: ' + String(err && err.message || err).slice(0, 300) }, 200);
  }
}
