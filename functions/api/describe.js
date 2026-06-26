// POST /api/describe  { url }
// Scrapes a short business description from a public web page (meta description /
// og:description / first paragraph). Team-only. SSRF-guarded. No browser needed.

const SUPABASE_URL = 'https://eejmocneacfleltspedl.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlam1vY25lYWNmbGVsdHNwZWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyNDQ3MTMsImV4cCI6MjA5NzgyMDcxM30.dXJTMFp_d9JRlXkesVPCUj6tBi3qphxxOu3v-Cuw7_Y';
const TEAM = ['brandon@rankrebels.ai', 'eric@rankrebels.ai', 'brandonmcruz@mac.com', 'eric.paul.ellsworth@gmail.com'];

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
function normalizeUrl(raw) {
  let s = String(raw || '').trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  let u; try { u = new URL(s); } catch (e) { return null; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  const h = u.hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.internal') || h.endsWith('.local')) return null;
  if (/^(127\.|10\.|192\.168\.|169\.254\.|::1|0\.0\.0\.0)/.test(h)) return null;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return null;
  return u;
}
function decodeEntities(s) {
  return String(s || '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n)).trim();
}
function metaContent(html, re) {
  const m = html.match(re);
  return m ? decodeEntities(m[1]) : '';
}

export async function onRequestPost({ request }) {
  try {
    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!await verifyTeam(token)) return json({ error: 'Not authorized.' }, 401);
    const b = await request.json().catch(() => ({}));
    const url = normalizeUrl(b.url);
    if (!url) return json({ error: 'Enter a valid website URL.' }, 400);

    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 9000);
    let res;
    try {
      res = await fetch(url.href, { redirect: 'follow', signal: ctrl.signal, headers: { 'user-agent': 'Mozilla/5.0 (compatible; RankRebelsBot/1.0)' } });
    } finally { clearTimeout(to); }
    if (!res.ok) return json({ error: 'Site returned HTTP ' + res.status }, 200);
    const html = (await res.text()).slice(0, 500000);

    let desc =
      metaContent(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
      metaContent(html, /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i) ||
      metaContent(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
      metaContent(html, /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i);

    if (!desc) {
      // fallback: first meaningful paragraph
      const m = html.match(/<p[^>]*>([\s\S]{40,400}?)<\/p>/i);
      if (m) desc = decodeEntities(m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
    }
    desc = (desc || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    if (!desc) return json({ error: 'No description found on that page.' }, 200);
    return json({ description: desc });
  } catch (err) {
    const msg = String(err && err.message || err);
    return json({ error: /abort/i.test(msg) ? 'The site took too long to respond.' : msg.slice(0, 150) }, 200);
  }
}
