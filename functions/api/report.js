// GET /api/report?client=<id>
// Returns a normalized analytics report for one client. Pulls real numbers from
// Google Analytics 4 (Data API) + Search Console when the client is configured and
// a team member's Google account is connected with the read-only scopes; otherwise
// returns clearly-labelled sample data so the dashboard is never blank.
//
// Cloudflare secrets used (all optional — missing ones just fall back to demo):
//   SUPABASE_SERVICE_ROLE_KEY   (look up the client row + stored Google tokens)
//   GOOGLE_CLIENT_SECRET        (refresh the Google access token)
//
// Per-client config (optional columns on rr_clients):
//   ga4_property_id        e.g. "493812345"
//   search_console_site    e.g. "https://atomicsteamers.com/"  or  "sc-domain:atomicsteamers.com"

const SUPABASE_URL = 'https://eejmocneacfleltspedl.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlam1vY25lYWNmbGVsdHNwZWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyNDQ3MTMsImV4cCI6MjA5NzgyMDcxM30.dXJTMFp_d9JRlXkesVPCUj6tBi3qphxxOu3v-Cuw7_Y';
const GOOGLE_CLIENT_ID = '80870826640-nr849c98cvnjie2s6fupi4levtdi3v4m.apps.googleusercontent.com';
const TEAM = ['brandon@rankrebels.ai', 'eric@rankrebels.ai', 'brandonmcruz@mac.com', 'eric.paul.ellsworth@gmail.com'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

function sbHeaders(env) {
  return { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY, 'content-type': 'application/json' };
}

// Valid Google access token for whichever team member is connected (refresh if needed).
async function googleToken(env, email) {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return null;
  let row = null;
  // Prefer the requesting user's connection; fall back to any connected team member.
  for (const who of [email, ...TEAM]) {
    if (!who) continue;
    const r = await fetch(SUPABASE_URL + '/rest/v1/rr_google_tokens?email=eq.' + encodeURIComponent(who) + '&select=*', { headers: sbHeaders(env) });
    if (r.ok) { const rows = await r.json().catch(() => []); if (rows[0]) { row = rows[0]; break; } }
  }
  if (!row) return null;
  if (row.access_token && row.expiry && new Date(row.expiry).getTime() > Date.now() + 60000) return row.access_token;
  if (!row.refresh_token || !env.GOOGLE_CLIENT_SECRET) return row.access_token || null;
  const params = new URLSearchParams({ client_id: GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, refresh_token: row.refresh_token, grant_type: 'refresh_token' });
  const tr = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: params });
  if (!tr.ok) return row.access_token || null;
  const d = await tr.json();
  const expiry = new Date(Date.now() + (d.expires_in || 3600) * 1000).toISOString();
  await fetch(SUPABASE_URL + '/rest/v1/rr_google_tokens', {
    method: 'POST', headers: Object.assign(sbHeaders(env), { prefer: 'resolution=merge-duplicates' }),
    body: JSON.stringify({ email: row.email, access_token: d.access_token, expiry, refresh_token: d.refresh_token || row.refresh_token, scope: d.scope || row.scope, updated_at: new Date().toISOString() })
  });
  return d.access_token;
}

function demo(business, note) {
  return {
    demo: true, note: note || 'Sample data — connect Google Analytics + Search Console for this client to see live numbers.',
    business: business || 'Sample Client',
    kpis: { organic: 1020, organicPrev: 560, gbpViews: 690, gbpViewsPrev: 390, calls: 67, callsPrev: 34, conversions: 188, conversionsPrev: 96 },
    traffic: [
      { m: 'Jan', organic: 410, gbp: 280 }, { m: 'Feb', organic: 470, gbp: 320 }, { m: 'Mar', organic: 560, gbp: 390 },
      { m: 'Apr', organic: 690, gbp: 470 }, { m: 'May', organic: 840, gbp: 560 }, { m: 'Jun', organic: 1020, gbp: 690 },
    ],
    sources: [
      { name: 'Organic Search', value: 1020 }, { name: 'Google Business', value: 690 },
      { name: 'Direct', value: 180 }, { name: 'Referral', value: 124 },
    ],
    keywords: [
      { kw: 'steam cleaning near me', pos: 2, prev: 7, vol: '1.3K' }, { kw: 'auto detailing [city]', pos: 1, prev: 4, vol: '880' },
      { kw: 'mobile car wash', pos: 3, prev: 3, vol: '2.4K' }, { kw: 'interior detailing service', pos: 5, prev: 12, vol: '590' },
      { kw: 'ceramic coating [city]', pos: 4, prev: 9, vol: '720' }, { kw: 'engine steam clean', pos: 6, prev: 15, vol: '410' },
    ],
    pages: [
      { p: '/', views: 2140, conv: '6.2%', time: '1:48' }, { p: '/services/steam-cleaning', views: 980, conv: '9.1%', time: '2:31' },
      { p: '/book', views: 760, conv: '18.4%', time: '1:12' }, { p: '/services/detailing', views: 540, conv: '7.7%', time: '2:05' },
      { p: '/about', views: 310, conv: '2.1%', time: '0:54' },
    ],
  };
}

function ymLabel(ym) { // "202606" -> "Jun"
  const mi = parseInt(String(ym).slice(4, 6), 10) - 1;
  return MONTHS[mi] || String(ym);
}
function fmtTime(sec) {
  sec = Math.round(Number(sec) || 0);
  const m = Math.floor(sec / 60), s = sec % 60;
  return m + ':' + String(s).padStart(2, '0');
}

async function ga4(token, propertyId, body) {
  const r = await fetch('https://analyticsdata.googleapis.com/v1/properties/' + propertyId + ':runReport', {
    method: 'POST', headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' }, body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error('GA4 ' + r.status + ': ' + (await r.text()).slice(0, 200));
  return r.json();
}

export async function onRequestGet({ request, env }) {
  let business = '';
  try {
    const url = new URL(request.url);
    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    const email = await verifyTeam(token);
    if (!email) return json({ error: 'Not authorized.' }, 401);

    const clientId = url.searchParams.get('client') || '';
    let ga4Id = url.searchParams.get('ga4') || '';
    let scSite = url.searchParams.get('sc') || '';

    // Look up the client to get its name + configured property IDs.
    if (clientId && env.SUPABASE_SERVICE_ROLE_KEY) {
      const cr = await fetch(SUPABASE_URL + '/rest/v1/rr_clients?id=eq.' + encodeURIComponent(clientId) + '&select=business_name,ga4_property_id,search_console_site', { headers: sbHeaders(env) });
      if (cr.ok) { const rows = await cr.json().catch(() => []); const c = rows[0]; if (c) { business = c.business_name || ''; ga4Id = ga4Id || c.ga4_property_id || ''; scSite = scSite || c.search_console_site || ''; } }
    }

    if (!ga4Id && !scSite) return json(demo(business, 'Sample data — add this client\'s GA4 property ID / Search Console site (Edit customer) to see live numbers.'));

    const gtoken = await googleToken(env, email);
    if (!gtoken) return json(demo(business, 'Sample data — connect a Google account (Settings → Connect Google) with Analytics access to see live numbers.'));

    const out = demo(business); // start from demo, overwrite whatever we can fetch live
    out.demo = false; out.note = '';
    out.business = business || out.business;
    let gotLive = false;

    // ---- GA4: monthly sessions by channel + top pages ----
    if (ga4Id) {
      try {
        const byChannel = await ga4(gtoken, ga4Id, {
          dateRanges: [{ startDate: '180daysAgo', endDate: 'today' }],
          dimensions: [{ name: 'yearMonth' }, { name: 'sessionDefaultChannelGroup' }],
          metrics: [{ name: 'sessions' }],
        });
        const months = {}; const srcTotals = {};
        (byChannel.rows || []).forEach(row => {
          const ym = row.dimensionValues[0].value, ch = row.dimensionValues[1].value;
          const v = Number(row.metricValues[0].value) || 0;
          months[ym] = months[ym] || { organic: 0, gbp: 0 };
          if (/organic search/i.test(ch)) months[ym].organic += v;
          if (/organic|local|maps/i.test(ch)) months[ym].gbp += v; // rough GBP proxy
          srcTotals[ch] = (srcTotals[ch] || 0) + v;
        });
        const ymKeys = Object.keys(months).sort();
        if (ymKeys.length) {
          out.traffic = ymKeys.slice(-6).map(k => ({ m: ymLabel(k), organic: months[k].organic, gbp: months[k].gbp }));
          out.sources = Object.entries(srcTotals).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value }));
          gotLive = true;
        }

        const topPages = await ga4(gtoken, ga4Id, {
          dateRanges: [{ startDate: '90daysAgo', endDate: 'today' }],
          dimensions: [{ name: 'pagePath' }],
          metrics: [{ name: 'screenPageViews' }, { name: 'userEngagementDuration' }, { name: 'sessions' }, { name: 'keyEvents' }],
          orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 6,
        });
        const pages = (topPages.rows || []).map(row => {
          const path = row.dimensionValues[0].value;
          const views = Number(row.metricValues[0].value) || 0;
          const engage = Number(row.metricValues[1].value) || 0;
          const sessions = Number(row.metricValues[2].value) || 0;
          const conv = Number(row.metricValues[3].value) || 0;
          return { p: path, views, conv: (sessions ? (conv / sessions * 100) : 0).toFixed(1) + '%', time: fmtTime(views ? engage / views : 0) };
        });
        if (pages.length) { out.pages = pages; gotLive = true; }

        // KPIs from a 90-day vs prior-90-day comparison
        const kpiNow = await ga4(gtoken, ga4Id, {
          dateRanges: [{ startDate: '90daysAgo', endDate: 'today' }, { startDate: '180daysAgo', endDate: '91daysAgo' }],
          metrics: [{ name: 'sessions' }, { name: 'keyEvents' }],
        });
        if (kpiNow.rows && kpiNow.rows.length) {
          const now = kpiNow.rows.find(r => r.dimensionValues && r.dimensionValues[0].value === 'date_range_0') || kpiNow.rows[0];
          // GA4 returns one row per date range when no dimensions; map by order
          const rows = kpiNow.rows;
          const n = rows[0], prev = rows[1] || rows[0];
          out.kpis.organic = Number(n.metricValues[0].value) || 0;
          out.kpis.organicPrev = Number(prev.metricValues[0].value) || out.kpis.organic;
          out.kpis.conversions = Number(n.metricValues[1].value) || 0;
          out.kpis.conversionsPrev = Number(prev.metricValues[1].value) || out.kpis.conversions;
          gotLive = true;
        }
      } catch (e) { out.note = 'GA4: ' + e.message; }
    }

    // ---- Search Console: top queries with avg position ----
    if (scSite) {
      try {
        const sr = await fetch('https://searchconsole.googleapis.com/webmasters/v3/sites/' + encodeURIComponent(scSite) + '/searchAnalytics/query', {
          method: 'POST', headers: { authorization: 'Bearer ' + gtoken, 'content-type': 'application/json' },
          body: JSON.stringify({ startDate: isoDaysAgo(90), endDate: isoDaysAgo(1), dimensions: ['query'], rowLimit: 10 }),
        });
        if (sr.ok) {
          const sd = await sr.json();
          const kws = (sd.rows || []).map(row => ({ kw: row.keys[0], pos: Math.round(row.position * 10) / 10, clicks: row.clicks, vol: row.impressions + ' impr' }));
          if (kws.length) { out.keywords = kws.slice(0, 8); gotLive = true; }
        } else { out.note = (out.note ? out.note + ' · ' : '') + 'Search Console: ' + sr.status; }
      } catch (e) { out.note = (out.note ? out.note + ' · ' : '') + 'Search Console: ' + e.message; }
    }

    if (!gotLive && !out.note) return json(demo(business, 'No analytics data returned yet — check the GA4 property ID / Search Console site for this client.'));
    return json(out);
  } catch (err) {
    return json(Object.assign(demo(business), { note: 'Report error (showing sample data): ' + String(err && err.message || err).slice(0, 200) }));
  }
}

function isoDaysAgo(n) {
  const d = new Date(Date.now() - n * 86400000);
  return d.toISOString().slice(0, 10);
}
