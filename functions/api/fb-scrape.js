// POST /api/fb-scrape   { url }   (a public Facebook page URL)
// Deep-scrapes a Facebook business page via Apify's "Facebook Pages Scraper" actor and returns
// structured business data: about, category, followers, rating, phone, email, website, address,
// hours, services, price range. On-demand only (it's slower + costs a few cents per run).
//
// Cloudflare secret required: APIFY_TOKEN   (apify.com → Settings → Integrations → API token)
// Optional: APIFY_FB_ACTOR  (default "apify~facebook-pages-scraper")

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
    return (email && (TEAM.indexOf(email) >= 0)) ? email : null;
  } catch (e) { return null; }
}

// Pull the first present value across a list of possible field names (actor versions vary).
function pick(obj, keys) {
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length)) return v;
  }
  return '';
}
function asText(v) {
  if (!v) return '';
  if (Array.isArray(v)) return v.map(asText).filter(Boolean).join(' · ');
  if (typeof v === 'object') return Object.values(v).map(asText).filter(Boolean).join(' · ');
  return String(v);
}

// GET /api/fb-scrape?check=1  → reports whether keys are present (no Apify call, no cost).
export async function onRequestGet({ request, env }) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!await verifyTeam(token)) return json({ error: 'Not authorized.' }, 401);
  return json({
    ok: true,
    apify: !!env.APIFY_TOKEN,
    serper: !!env.SERPER_API_KEY,
    actor: env.APIFY_FB_ACTOR || 'apify~facebook-pages-scraper'
  });
}

export async function onRequestPost({ request, env }) {
  try {
    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!await verifyTeam(token)) return json({ error: 'Not authorized.' }, 401);
    if (!env.APIFY_TOKEN) return json({ error: 'Facebook deep-scrape not configured (add APIFY_TOKEN in Cloudflare — get one at apify.com).' }, 503);

    const b = await request.json().catch(() => ({}));
    const url = (b.url || '').trim();
    if (!/facebook\.com/i.test(url)) return json({ error: 'A Facebook page URL is required (run enrich first to find it).' }, 400);

    const actor = env.APIFY_FB_ACTOR || 'apify~facebook-pages-scraper';
    const endpoint = 'https://api.apify.com/v2/acts/' + actor + '/run-sync-get-dataset-items?token=' + encodeURIComponent(env.APIFY_TOKEN) + '&timeout=120';
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ startUrls: [{ url }], resultsLimit: 1 })
    });
    if (!r.ok) {
      const t = await r.text();
      return json({ error: 'Apify error (' + r.status + ').', detail: t.slice(0, 300) }, 200);
    }
    const items = await r.json().catch(() => []);
    const it = Array.isArray(items) ? items[0] : (items && items.items && items.items[0]);
    if (!it) return json({ error: 'No data returned for that Facebook page.' }, 200);

    const profile = {
      name: asText(pick(it, ['title', 'name', 'pageName', 'pageTitle'])),
      about: asText(pick(it, ['intro', 'about', 'about_me', 'info', 'pageIntro', 'description'])),
      category: asText(pick(it, ['categories', 'pageCategory', 'category'])),
      followers: pick(it, ['followers', 'followersCount', 'followersAmount']),
      likes: pick(it, ['likes', 'likesCount', 'pageLikes']),
      rating: pick(it, ['rating', 'overallStarRating', 'overall_star_rating', 'pageRating']),
      ratingCount: pick(it, ['ratingCount', 'ratingOverall', 'reviewsCount']),
      phone: asText(pick(it, ['phone', 'phoneNumber', 'tel'])),
      email: asText(pick(it, ['email', 'emails'])),
      website: asText(pick(it, ['website', 'websites', 'externalLink'])),
      address: asText(pick(it, ['address', 'fullAddress', 'streetAddress'])),
      priceRange: asText(pick(it, ['priceRange', 'price_range'])),
      services: asText(pick(it, ['services', 'productsServices'])),
      hours: asText(pick(it, ['openingHours', 'hours', 'businessHours'])),
      facebookUrl: asText(pick(it, ['facebookUrl', 'pageUrl', 'url'])) || url
    };
    return json({ ok: true, profile });
  } catch (err) {
    return json({ error: 'FB scrape error: ' + String(err && err.message || err).slice(0, 300) }, 200);
  }
}
