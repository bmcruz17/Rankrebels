// GET /api/proposal-quote?slug=<page-slug>
// Public, read-only pricing for a customer's proposal/hook page. The dashboard already
// saves each customer's quote (onboarding_fee, monthly_charge, services, quote{}) next to
// their hook_url — this surfaces ONLY the whitelisted, customer-safe pricing so the proposal
// page can render live numbers the moment a quote is saved. Nothing sensitive (margins,
// costs, credentials, contacts, internal notes) ever leaves this endpoint.
//
// Matched by the customer's hook_url containing the slug (the page's own path segment).
// Returns { quoted:false } until a real quote exists, so half-built drafts never leak.
//
// Cloudflare secret: SUPABASE_SERVICE_ROLE_KEY  (read-only use here)

const SUPABASE_URL = 'https://eejmocneacfleltspedl.supabase.co';

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=60' },
  });
}
function sb(env) {
  return { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY };
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const slug = (url.searchParams.get('slug') || '').trim().toLowerCase();
  if (!/^[a-z0-9-]{3,60}$/.test(slug)) return json({ quoted: false, error: 'bad slug' }, 400);
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return json({ quoted: false });

  // find the customer whose hook_url contains this slug
  const q = SUPABASE_URL + '/rest/v1/rr_clients'
    + '?hook_url=ilike.' + encodeURIComponent('*' + slug + '*')
    + '&select=onboarding_fee,monthly_charge,quote,services,hook_url&limit=1';
  let row = null;
  try {
    const r = await fetch(q, { headers: sb(env) });
    if (r.ok) { const arr = await r.json(); row = Array.isArray(arr) && arr[0] ? arr[0] : null; }
  } catch (e) { /* fall through to not-quoted */ }
  if (!row) return json({ quoted: false });

  const qt = (row.quote && typeof row.quote === 'object') ? row.quote : {};
  const build = num(row.onboarding_fee != null ? row.onboarding_fee : qt.setup_total);
  const monthly = num(row.monthly_charge != null ? row.monthly_charge : qt.monthly_total);

  // a "real" quote = at least one non-zero price set
  if (!build && !monthly) return json({ quoted: false });

  const lines = Array.isArray(qt.lines) ? qt.lines : [];
  const includes = lines.filter((l) => l && l.kind === 'mo').map((l) => String(l.label || '').slice(0, 80)).filter(Boolean);
  const addons = lines.filter((l) => l && l.kind === 'once').map((l) => String(l.label || '').slice(0, 80)).filter(Boolean);

  return json({
    quoted: true,
    build: build || null,
    monthly: monthly || null,
    term_label: qt.term_label ? String(qt.term_label).slice(0, 40) : null,
    warranty: !!qt.warranty,
    includes,
    addons,
  });
}

function num(v) { const n = Number(v); return isFinite(n) && n > 0 ? n : 0; }
