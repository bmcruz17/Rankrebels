// POST /api/enrich  { name, city, phone, website }
// Best-effort contact lookup for a business (great for no-website leads):
// searches the web, returns any email found + Facebook/Instagram/Yelp links.
//
// Cloudflare secret required: SERPER_API_KEY  (free tier at serper.dev — Google search results as JSON)

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
    return (email && (TEAM.indexOf(email) >= 0 || email.endsWith('@rankrebels.ai'))) ? email : null;
  } catch (e) { return null; }
}
function emailsFrom(text) {
  const found = (text || '').match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) || [];
  // drop junk/example/image-looking matches
  return Array.from(new Set(found.map(e => e.toLowerCase())))
    .filter(e => !/\.(png|jpg|jpeg|gif|webp|svg)$/.test(e) && !/example\.|sentry\.|wixpress\.|\.png/.test(e));
}

export async function onRequestPost({ request, env }) {
  try {
    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!await verifyTeam(token)) return json({ error: 'Not authorized.' }, 401);
    if (!env.SERPER_API_KEY) return json({ error: 'Enrichment not configured (add SERPER_API_KEY in Cloudflare — free key at serper.dev).' }, 503);

    const b = await request.json().catch(() => ({}));
    const name = (b.name || '').trim();
    const city = (b.city || b.address || '').trim();
    if (!name) return json({ error: 'Business name required.' }, 400);

    const q = '"' + name + '" ' + city + ' email contact facebook';
    const sr = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': env.SERPER_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q, num: 10 })
    });
    if (!sr.ok) return json({ error: 'Search error: ' + (await sr.text()).slice(0, 300) }, 200);
    const d = await sr.json();
    const organic = d.organic || [];

    const blob = JSON.stringify(d);
    let emails = emailsFrom(blob);
    const linkOf = re => { const o = organic.find(x => re.test(x.link || '')); return o ? o.link : ''; };
    const facebook = linkOf(/facebook\.com/i);
    const instagram = linkOf(/instagram\.com/i);
    const yelp = linkOf(/yelp\.com/i);

    // Best-effort: fetch the top 1-2 non-social result pages and scrape any email/mailto.
    const pages = organic.filter(o => o.link && !/facebook|instagram|google\.com\/maps/i.test(o.link)).slice(0, 2);
    for (const p of pages) {
      try {
        const r = await fetch(p.link, { headers: { 'user-agent': 'Mozilla/5.0' } });
        if (r.ok) { const html = await r.text(); emails = Array.from(new Set(emails.concat(emailsFrom(html)))); }
      } catch (e) { /* ignore */ }
    }

    return json({
      emails: emails.slice(0, 5),
      facebook, instagram, yelp,
      links: organic.slice(0, 5).map(o => ({ title: o.title, link: o.link }))
    });
  } catch (err) {
    return json({ error: 'Enrich error: ' + String(err && err.message || err).slice(0, 300) }, 200);
  }
}
