// GET /p/<slug>            → password-gated, watermarked preview website for a lead
// GET /p/<slug>?k=<code>   → unlocked (the link we email includes the code so it "just works")
// GET /p/<slug>?photo=<i>  → proxies the i-th Google Business photo (hides the API key)
//
// Cloudflare secrets: SUPABASE_SERVICE_ROLE_KEY (read the preview), GOOGLE_PLACES_API_KEY (photos)

const SUPABASE_URL = 'https://eejmocneacfleltspedl.supabase.co';
const sbHeaders = env => ({ apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY });

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function html(body, status) { return new Response(body, { status: status || 200, headers: { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex' } }); }

async function loadPreview(env, slug) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/rr_previews?slug=eq.' + encodeURIComponent(slug) + '&select=*&limit=1', { headers: sbHeaders(env) });
  if (!r.ok) return null;
  const rows = await r.json().catch(() => []); return rows[0] || null;
}

export async function onRequestGet({ params, request, env }) {
  const slug = params.slug;
  const url = new URL(request.url);
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return html('<h1>Preview unavailable</h1>', 503);
  const row = await loadPreview(env, slug);
  if (!row) return html('<!doctype html><meta name=robots content=noindex><body style="font-family:system-ui;text-align:center;padding:60px;color:#444">This preview link is no longer available.</body>', 404);

  // ---- photo proxy ----
  const ph = url.searchParams.get('photo');
  if (ph !== null) {
    const photos = (row.data && row.data.photos) || [];
    const nameRef = photos[parseInt(ph, 10)];
    if (!nameRef || !env.GOOGLE_PLACES_API_KEY) return new Response('', { status: 404 });
    const media = await fetch('https://places.googleapis.com/v1/' + nameRef + '/media?maxHeightPx=1100&key=' + env.GOOGLE_PLACES_API_KEY);
    if (!media.ok) return new Response('', { status: 404 });
    return new Response(media.body, { headers: { 'content-type': media.headers.get('content-type') || 'image/jpeg', 'cache-control': 'public, max-age=86400' } });
  }

  // ---- password gate ----
  const k = url.searchParams.get('k') || '';
  if (k !== row.password) {
    return html(passwordPage(slug, k.length > 0));
  }

  // best-effort view counter
  try { fetch(SUPABASE_URL + '/rest/v1/rr_previews?slug=eq.' + encodeURIComponent(slug), { method: 'PATCH', headers: Object.assign(sbHeaders(env), { 'content-type': 'application/json', prefer: 'return=minimal' }), body: JSON.stringify({ views: (row.views || 0) + 1, last_viewed_at: new Date().toISOString() }) }); } catch (e) {}

  return html(renderSite(row));
}

function passwordPage(slug, wrong) {
  return `<!doctype html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><meta name=robots content=noindex><title>Private preview</title>
<style>body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0f1512;color:#e8efe9;display:grid;place-items:center;min-height:100vh}
.box{background:#16201b;border:1px solid #243029;border-radius:16px;padding:30px;max-width:360px;text-align:center}
h1{font-size:19px;margin:0 0 6px} p{color:#8aa394;font-size:13.5px;margin:0 0 18px}
input{width:100%;box-sizing:border-box;padding:12px;border-radius:10px;border:1px solid #2c3a31;background:#0f1512;color:#fff;font-size:18px;text-align:center;letter-spacing:6px}
button{margin-top:12px;width:100%;padding:12px;border:0;border-radius:10px;background:#15803d;color:#fff;font-weight:700;font-size:15px;cursor:pointer}
.err{color:#e0795f;font-size:12.5px;margin-top:10px}</style></head>
<body><form class=box onsubmit="location.href='/p/${esc(slug)}?k='+encodeURIComponent(document.getElementById('k').value);return false">
<h1>🔒 Private preview</h1><p>Enter the access code you were given.</p>
<input id=k inputmode=numeric autocomplete=off autofocus placeholder="••••">
<button type=submit>View preview</button>
${wrong ? '<div class=err>That code didn’t match. Try again.</div>' : ''}
</form></body></html>`;
}

function renderSite(row) {
  const d = row.data || {}; const c = d.copy || {};
  const accent = /^#[0-9a-f]{6}$/i.test(c.accent || '') ? c.accent : '#15803d';
  const photos = d.photos || [];
  const heroBg = photos.length ? `linear-gradient(180deg,rgba(8,12,10,.30),rgba(8,12,10,.72)), url('?photo=0')` : `linear-gradient(140deg, ${accent} 0%, #0c1510 100%)`;
  const tel = (d.phone || '').replace(/[^0-9+]/g, '');
  const ratingBadge = d.rating ? `<a class="pill" href="#contact">★ ${d.rating} on Google${d.reviews ? ` · ${d.reviews} reviews` : ''}</a>` : '';
  const services = (c.services || []).map((s, i) => `<div class="svc"><div class="svc-n">${String(i + 1).padStart(2, '0')}</div><h3>${esc(s.title)}</h3><p>${esc(s.desc)}</p></div>`).join('');
  const highlights = (c.highlights || []).map(h => `<div class="hl"><span class="hl-c">✓</span>${esc(h)}</div>`).join('');
  const hasAbout = !!c.about;
  const aboutPhoto = photos.length > 1 ? `<div class="about-img" style="background-image:url('?photo=1')"></div>` : '';
  const gallery = photos.slice(2, 8).map((_, i) => `<div class="gphoto" style="background-image:url('?photo=${i + 2}')"></div>`).join('');
  const hours = (d.hours || []).map(h => { const p = String(h).split(/:\s(.+)/); return `<div class="hrow"><span>${esc(p[0])}</span><span>${esc(p[1] || '')}</span></div>`; }).join('');
  return `<!doctype html><html lang=en><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><meta name=robots content=noindex>
<title>${esc(d.business_name)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{--a:${accent}}
html{scroll-behavior:smooth}
body{font-family:'Plus Jakarta Sans',system-ui,-apple-system,'Segoe UI',sans-serif;color:#16201b;line-height:1.6;background:#fff;-webkit-font-smoothing:antialiased;-webkit-user-select:none;user-select:none}
a{color:inherit;text-decoration:none}
.btn{display:inline-flex;align-items:center;gap:8px;background:var(--a);color:#fff;font-weight:700;font-size:16px;padding:15px 30px;border-radius:12px;box-shadow:0 14px 34px -12px rgba(0,0,0,.5);transition:transform .15s}
.btn:hover{transform:translateY(-2px)}
.btn-o{background:rgba(255,255,255,.12);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.35);box-shadow:none}
/* top nav */
.nav{position:sticky;top:0;z-index:9000;display:flex;align-items:center;justify-content:space-between;padding:13px 26px;background:rgba(255,255,255,.85);backdrop-filter:blur(12px);border-bottom:1px solid #eef2ef}
.nav .brand{font-weight:800;font-size:18px;letter-spacing:-.01em}
.nav .brand b{color:var(--a)}
.nav .ncta{background:var(--a);color:#fff;font-weight:700;font-size:14px;padding:9px 18px;border-radius:10px}
/* hero */
.hero{position:relative;min-height:86vh;background:${heroBg};background-size:cover;background-position:center;display:flex;flex-direction:column;justify-content:center;padding:60px 26px;color:#fff}
.hero-in{max-width:1080px;margin:0 auto;width:100%}
.hero .eyebrow{font-size:13px;letter-spacing:.22em;text-transform:uppercase;font-weight:700;opacity:.92;margin-bottom:16px}
.hero h1{font-size:clamp(34px,6.2vw,68px);font-weight:800;letter-spacing:-.025em;line-height:1.05;max-width:14ch;text-shadow:0 2px 30px rgba(0,0,0,.35)}
.hero .sub{font-size:clamp(16px,2.3vw,21px);margin-top:18px;max-width:52ch;opacity:.96;text-shadow:0 1px 16px rgba(0,0,0,.4)}
.hero-btns{display:flex;gap:12px;flex-wrap:wrap;margin-top:34px}
.pillrow{display:flex;gap:10px;flex-wrap:wrap;margin-top:30px}
.pill{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.28);color:#fff;font-size:13.5px;font-weight:600;padding:8px 14px;border-radius:999px;backdrop-filter:blur(6px)}
/* trust strip */
.trust{background:#f5f8f6;border-bottom:1px solid #eef2ef}
.trust-in{max-width:1080px;margin:0 auto;display:flex;flex-wrap:wrap;gap:14px 30px;justify-content:center;padding:18px 26px}
.hl{display:flex;align-items:center;gap:9px;font-size:14.5px;font-weight:600;color:#2a352e}
.hl-c{width:20px;height:20px;border-radius:50%;background:var(--a);color:#fff;display:grid;place-items:center;font-size:12px;flex:0 0 auto}
/* sections */
section{max-width:1080px;margin:0 auto;padding:74px 26px}
.kick{font-size:12.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--a);font-weight:800;margin-bottom:12px}
.about-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:48px;align-items:center}
.about-grid h2{font-size:clamp(26px,3.6vw,40px);font-weight:800;letter-spacing:-.02em;line-height:1.12;margin-bottom:16px}
.about-grid p{font-size:17px;color:#42514a}
.about-img{border-radius:20px;min-height:340px;background-size:cover;background-position:center;box-shadow:0 30px 60px -24px rgba(0,0,0,.3)}
.svc-head{text-align:center;max-width:640px;margin:0 auto 44px}
.svc-head h2{font-size:clamp(26px,3.6vw,40px);font-weight:800;letter-spacing:-.02em}
.svcs{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:18px}
.svc{border:1px solid #e8ede9;border-radius:18px;padding:28px 24px;background:#fff;transition:transform .15s,box-shadow .15s}
.svc:hover{transform:translateY(-4px);box-shadow:0 24px 50px -28px rgba(0,0,0,.35);border-color:transparent}
.svc-n{font-size:13px;font-weight:800;color:var(--a);opacity:.5;margin-bottom:12px;letter-spacing:.05em}
.svc h3{font-size:19px;font-weight:700;margin-bottom:8px}
.svc p{font-size:14.5px;color:#5f6f66}
.gal{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
.gphoto{padding-top:74%;background-size:cover;background-position:center;border-radius:16px;box-shadow:0 16px 36px -22px rgba(0,0,0,.4)}
/* contact */
.contact{background:#0d1512;color:#fff}
.contact-in{max-width:1080px;margin:0 auto;padding:74px 26px;display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:start}
.contact h2{font-size:clamp(26px,3.6vw,40px);font-weight:800;letter-spacing:-.02em;margin-bottom:8px}
.contact .lead{color:#9fb3a8;font-size:16px;margin-bottom:24px;max-width:40ch}
.cline{display:flex;gap:13px;align-items:flex-start;padding:13px 0;border-bottom:1px solid #1c2a23;font-size:15px}
.cline .ic{font-size:18px}
.cline b{display:block;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--a);margin-bottom:3px;font-weight:700}
.hours{background:#101c16;border:1px solid #1c2a23;border-radius:18px;padding:22px 24px}
.hours h4{font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:var(--a);margin-bottom:12px}
.hrow{display:flex;justify-content:space-between;gap:16px;font-size:14px;padding:6px 0;color:#cdd9d2;border-bottom:1px solid #18241d}
.hrow:last-child{border:0}
/* RR footer */
.rr{background:#0a0f0c;color:#fff;text-align:center;padding:56px 26px}
.rr h2{font-size:clamp(22px,3.4vw,32px);font-weight:800;max-width:18ch;margin:0 auto 14px;line-height:1.18}
.rr p{color:#92a69b;max-width:54ch;margin:0 auto 24px;font-size:15.5px}
.rr .fine{margin-top:26px;font-size:11px;color:#5d6f64}
/* preview chrome */
.wm{position:fixed;inset:0;pointer-events:none;z-index:9998;background:repeating-linear-gradient(-30deg,transparent 0 200px,rgba(0,0,0,.022) 200px 202px)}
.wm:after{content:"PREVIEW · RANK REBELS · ";position:absolute;inset:-30%;color:rgba(0,0,0,.05);font-size:34px;font-weight:800;line-height:3.4;word-spacing:14px;transform:rotate(-30deg);white-space:pre-wrap;text-align:center}
.ribbon{position:sticky;top:0;z-index:9999;background:#0d1512;color:#fff;text-align:center;font-size:12px;font-weight:600;padding:6px 14px;letter-spacing:.01em}
.ribbon b{color:#7CFFB0}
@media(max-width:760px){.about-grid{grid-template-columns:1fr;gap:26px}.about-img{min-height:240px}.contact-in{grid-template-columns:1fr;gap:28px}.nav .brand{font-size:16px}}
@media print{.wm,.ribbon{display:none}}
</style></head>
<body oncontextmenu="return false">
<div class="ribbon">🔒 Private preview for <b>${esc(d.business_name)}</b> — a concept mock-up by Rank Rebels, not the live site.</div>
<div class="wm"></div>
<div class="nav"><div class="brand">${esc(d.business_name)}</div><a class="ncta" href="#contact">${esc(c.cta_label || 'Contact')}</a></div>
<header class="hero"><div class="hero-in">
  <div class="eyebrow">${esc(d.type || d.business_name)}</div>
  <h1>${esc(c.headline || d.business_name)}</h1>
  ${c.subhead ? `<p class="sub">${esc(c.subhead)}</p>` : ''}
  <div class="hero-btns">
    <a class="btn" href="#contact">${esc(c.cta_label || 'Get Started')}</a>
    ${tel ? `<a class="btn btn-o" href="tel:${tel}">📞 ${esc(d.phone)}</a>` : ''}
  </div>
  ${ratingBadge || highlights ? `<div class="pillrow">${ratingBadge}</div>` : ''}
</div></header>
${highlights ? `<div class="trust"><div class="trust-in">${highlights}</div></div>` : ''}
${hasAbout ? `<section><div class="about-grid"><div><div class="kick">About us</div><h2>${esc(c.headline ? d.business_name : 'Who we are')}</h2><p>${esc(c.about)}</p></div>${aboutPhoto || `<div class="about-img" style="background:linear-gradient(135deg,${accent},#0c1510)"></div>`}</div></section>` : ''}
${services ? `<section><div class="svc-head"><div class="kick">What we offer</div><h2>Services built around you</h2></div><div class="svcs">${services}</div></section>` : ''}
${gallery ? `<section><div class="svc-head"><div class="kick">Gallery</div><h2>A look at our work</h2></div><div class="gal">${gallery}</div></section>` : ''}
<div class="contact" id="contact"><div class="contact-in">
  <div>
    <div class="kick">Get in touch</div>
    <h2>${esc(c.cta_label || 'Stop by or reach out')}</h2>
    <p class="lead">We’d love to hear from you. Reach out and we’ll take care of the rest.</p>
    ${d.phone ? `<a class="cline" href="tel:${tel}"><span class="ic">📞</span><span><b>Call</b>${esc(d.phone)}</span></a>` : ''}
    ${d.address ? `<div class="cline"><span class="ic">📍</span><span><b>Visit</b>${esc(d.address)}</span></div>` : ''}
    ${d.email ? `<a class="cline" href="mailto:${esc(d.email)}"><span class="ic">✉️</span><span><b>Email</b>${esc(d.email)}</span></a>` : ''}
  </div>
  ${hours ? `<div class="hours"><h4>Hours</h4>${hours}</div>` : ''}
</div></div>
<div class="rr">
  <h2>Love it? This is just the start.</h2>
  <p>This 5-minute mock-up is built from public info. Your real site is fully customized to how you work — online booking, ordering, quotes — plus custom apps, hosting, and SEO so you get found on Google.</p>
  <a class="btn" href="https://rankrebels.ai" style="background:#15803d">Build the real thing →</a>
  <div class="fine">© Rank Rebels · rankrebels.ai · Private concept mock-up — not for distribution or publication.</div>
</div>
</body></html>`;
}
