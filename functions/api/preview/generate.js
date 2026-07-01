// POST /api/preview/generate   { client_id?, business_name, description?, phone?, email?, address?, notes?, facebook? }
// Builds a watermarked, password-gated PREVIEW website for a lead using everything we know about them
// (Facebook profile + Google Business photos/hours/rating). Claude writes the copy; we store structured
// data and render the page at /p/<slug>. The hook you send mid-call.
//
// Cloudflare secrets required: ANTHROPIC_API_KEY, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_PLACES_API_KEY (photos)

const SUPABASE_URL = 'https://eejmocneacfleltspedl.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlam1vY25lYWNmbGVsdHNwZWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyNDQ3MTMsImV4cCI6MjA5NzgyMDcxM30.dXJTMFp_d9JRlXkesVPCUj6tBi3qphxxOu3v-Cuw7_Y';
const TEAM = ['brandon@rankrebels.ai', 'brandonmcruz@mac.com'];

function json(obj, status) { return new Response(JSON.stringify(obj), { status: status || 200, headers: { 'content-type': 'application/json' } }); }
async function verifyTeam(token) {
  if (!token) return null;
  try {
    const r = await fetch(SUPABASE_URL + '/auth/v1/user', { headers: { apikey: SUPABASE_ANON, authorization: 'Bearer ' + token } });
    if (!r.ok) return null;
    const u = await r.json(); const email = (u && u.email || '').toLowerCase();
    return (email && (TEAM.indexOf(email) >= 0)) ? email : null;
  } catch (e) { return null; }
}
function rand(n, chars) { const a = new Uint8Array(n); crypto.getRandomValues(a); let s = ''; for (let i = 0; i < n; i++) s += chars[a[i] % chars.length]; return s; }
const sbHeaders = env => ({ apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY, 'content-type': 'application/json' });

// Pull real Google Business photos + hours + rating for the business (best-effort).
async function placesData(env, name, address) {
  if (!env.GOOGLE_PLACES_API_KEY) return {};
  try {
    const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': env.GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.photos,places.rating,places.userRatingCount,places.regularOpeningHours,places.primaryTypeDisplayName,places.editorialSummary,places.websiteUri' },
      body: JSON.stringify({ textQuery: (name + ' ' + (address || '')).trim(), pageSize: 1 })
    });
    if (!r.ok) return {};
    const d = await r.json(); const p = (d.places || [])[0]; if (!p) return {};
    return {
      photos: (p.photos || []).slice(0, 6).map(ph => ph.name),
      rating: p.rating || 0, reviews: p.userRatingCount || 0,
      hours: (p.regularOpeningHours && p.regularOpeningHours.weekdayDescriptions) || [],
      type: (p.primaryTypeDisplayName && p.primaryTypeDisplayName.text) || '',
      editorial: (p.editorialSummary && p.editorialSummary.text) || '',
      website: p.websiteUri || ''
    };
  } catch (e) { return {}; }
}

export async function onRequestPost({ request, env }) {
  try {
    const email = await verifyTeam((request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim());
    if (!email) return json({ error: 'Not authorized.' }, 401);
    if (!env.ANTHROPIC_API_KEY) return json({ error: 'AI is not configured (missing ANTHROPIC_API_KEY).' }, 503);
    if (!env.SUPABASE_SERVICE_ROLE_KEY) return json({ error: 'Not configured (missing SUPABASE_SERVICE_ROLE_KEY).' }, 503);

    const b = await request.json().catch(() => ({}));
    const name = (b.business_name || '').trim();
    if (!name) return json({ error: 'Business name is required.' }, 400);

    const places = await placesData(env, name, b.address);

    // Ask Claude for tailored copy (structured JSON), using everything we know.
    const ctx = {
      business_name: name, description: b.description || '', address: b.address || '', phone: b.phone || '',
      category: places.type || (b.facebook && b.facebook.category) || '', rating: places.rating || (b.facebook && b.facebook.rating) || '',
      reviews: places.reviews || '', hours: places.hours || [], facebook: b.facebook || null, notes: b.notes || '', has_photos: (places.photos || []).length
    };
    const sys = [
      "You write punchy, conversion-focused copy for a ONE-PAGE preview website that a digital agency (Rank Rebels) builds to WOW a local business into signing up. The business hasn't seen it yet — this is the hook.",
      "Use ONLY real facts from the data provided (their name, category, rating/reviews, hours, Facebook about/services). Never invent fake testimonials or stats. Infer sensible SERVICES for their business type (e.g. a donut shop → Fresh Daily Donuts, Custom Orders, Catering; an HVAC company → AC Repair, Heating, Maintenance Plans; a salon → Cuts, Color, Styling).",
      "Pick a CTA that fits: restaurants/bakeries/cafes → 'Order Online'; salons/spas/clinics/home-services → 'Book Now' or 'Get a Free Quote'; retail → 'Shop Now'.",
      'Return ONLY valid JSON, no markdown: {"headline": "...", "subhead": "...", "about": "...", "services": [{"title":"...","desc":"..."}, ... (3-6)], "highlights": ["...", "..."], "cta_label": "...", "accent": "#hex (a tasteful brand-ish color that suits the business)"}',
      "headline: short, benefit-driven, can include their name. subhead: one warm line. about: 2-3 sentences in their voice. highlights: 3 short trust badges (e.g. '4.8★ on Google', 'Family owned', 'Open 7 days') drawn from real data."
    ].join('\n');
    const ar = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-opus-4-8', max_tokens: 1400, system: sys, messages: [{ role: 'user', content: 'Business data:\n' + JSON.stringify(ctx, null, 2) }] })
    });
    if (!ar.ok) return json({ error: 'AI service error.', detail: (await ar.text()).slice(0, 300) }, 502);
    const ad = await ar.json();
    let txt = (ad.content || []).filter(x => x.type === 'text').map(x => x.text).join('').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    let copy; try { copy = JSON.parse(txt); } catch (e) { return json({ error: 'AI returned malformed copy. Try again.' }, 502); }

    const slug = rand(10, 'abcdefghjkmnpqrstuvwxyz23456789');
    const passcode = rand(4, '0123456789');
    const data = {
      business_name: name, phone: b.phone || '', address: b.address || '', email: b.email || '',
      rating: places.rating || 0, reviews: places.reviews || 0, hours: places.hours || [],
      type: places.type || '', photos: places.photos || [], copy
    };
    const ins = await fetch(SUPABASE_URL + '/rest/v1/rr_previews', {
      method: 'POST', headers: Object.assign(sbHeaders(env), { prefer: 'return=representation' }),
      body: JSON.stringify({ client_id: b.client_id || null, slug, password: passcode, business_name: name, data, created_by: email })
    });
    if (!ins.ok) { const t = await ins.text(); return json({ error: /rr_previews|relation|does not exist/i.test(t) ? 'Run the rr_previews SQL first.' : ('Save failed: ' + t.slice(0, 200)) }, 200); }

    const origin = new URL(request.url).origin;
    return json({ ok: true, slug, passcode, url: origin + '/p/' + slug, link_with_code: origin + '/p/' + slug + '?k=' + passcode, photos: data.photos.length });
  } catch (err) {
    return json({ error: 'Preview generator error: ' + String(err && err.message || err).slice(0, 300) }, 200);
  }
}
