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
  const hero = photos.length ? `linear-gradient(rgba(8,12,10,.45),rgba(8,12,10,.65)), url('?photo=0')` : `linear-gradient(135deg, ${accent}, #0f1512)`;
  const services = (c.services || []).map(s => `<div class="svc"><h3>${esc(s.title)}</h3><p>${esc(s.desc)}</p></div>`).join('');
  const highlights = (c.highlights || []).map(h => `<span class="hl">✓ ${esc(h)}</span>`).join('');
  const gallery = photos.slice(1, 6).map((_, i) => `<div class="gphoto" style="background-image:url('?photo=${i + 1}')"></div>`).join('');
  const hours = (d.hours || []).map(h => `<div>${esc(h)}</div>`).join('');
  return `<!doctype html><html lang=en><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><meta name=robots content=noindex>
<title>${esc(d.business_name)} — Preview</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#1a241e;line-height:1.55;background:#fff;-webkit-user-select:none;user-select:none}
:root{--a:${accent}}
a{color:inherit}
.hero{min-height:78vh;background:${hero};background-size:cover;background-position:center;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;color:#fff;padding:40px 22px}
.hero h1{font-size:clamp(30px,6vw,56px);font-weight:850;letter-spacing:-.02em;text-shadow:0 2px 20px rgba(0,0,0,.4);max-width:900px}
.hero .biz{font-size:13px;letter-spacing:.25em;text-transform:uppercase;opacity:.9;margin-bottom:14px;font-weight:700}
.hero p{font-size:clamp(15px,2.4vw,20px);margin-top:14px;max-width:640px;text-shadow:0 1px 12px rgba(0,0,0,.4)}
.cta{display:inline-block;margin-top:26px;background:var(--a);color:#fff;font-weight:800;font-size:17px;padding:15px 34px;border-radius:999px;text-decoration:none;box-shadow:0 10px 30px rgba(0,0,0,.25)}
.hls{display:flex;flex-wrap:wrap;gap:10px 18px;justify-content:center;background:#f4f7f5;padding:16px 22px;font-size:13.5px;color:#3a4a40;font-weight:600}
.hl{white-space:nowrap}
section{max-width:1000px;margin:0 auto;padding:48px 22px}
.sec-t{font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:var(--a);font-weight:800;text-align:center;margin-bottom:10px}
.about{font-size:clamp(17px,2.6vw,22px);text-align:center;color:#2a352e;max-width:760px;margin:0 auto;line-height:1.6}
.svcs{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px;margin-top:26px}
.svc{border:1px solid #e6ece8;border-radius:14px;padding:20px 18px;background:#fbfdfc}
.svc h3{font-size:17px;margin-bottom:6px;color:#15201a}
.svc p{font-size:13.5px;color:#5f6f66}
.gal{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}
.gphoto{padding-top:72%;background-size:cover;background-position:center;border-radius:12px}
.info{display:flex;flex-wrap:wrap;gap:30px;justify-content:center;text-align:center;font-size:14px;color:#3a4a40}
.info b{display:block;color:var(--a);font-size:12px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:6px}
.foot-cta{background:#0f1512;color:#fff;text-align:center;padding:50px 22px}
.foot-cta h2{font-size:clamp(22px,4vw,32px);max-width:700px;margin:0 auto 12px}
.foot-cta p{color:#9fb3a8;max-width:600px;margin:0 auto 22px;font-size:15px}
/* watermark */
.wm{position:fixed;inset:0;pointer-events:none;z-index:9998;background-image:repeating-linear-gradient(-30deg,transparent 0 140px,rgba(21,128,61,.08) 140px 142px);}
.wm:after{content:"PREVIEW · RANK REBELS · PREVIEW · RANK REBELS · ";position:absolute;inset:-20% -20%;color:rgba(20,40,30,.06);font-size:42px;font-weight:900;line-height:2.6;word-spacing:18px;transform:rotate(-30deg);white-space:pre-wrap}
.bar{position:sticky;top:0;z-index:9999;background:var(--a);color:#fff;text-align:center;font-size:12.5px;font-weight:700;padding:7px 14px}
@media print{.wm,.bar{display:none}}
</style></head>
<body oncontextmenu="return false">
<div class="bar">🔒 PRIVATE PREVIEW for ${esc(d.business_name)} — built by Rank Rebels. This is a mock-up, not your live site.</div>
<div class="wm"></div>
<div class="hero">
  <div class="biz">${esc(d.business_name)}</div>
  <h1>${esc(c.headline || d.business_name)}</h1>
  ${c.subhead ? `<p>${esc(c.subhead)}</p>` : ''}
  <a class="cta" href="#contact">${esc(c.cta_label || 'Get Started')}</a>
</div>
${highlights ? `<div class="hls">${highlights}</div>` : ''}
${c.about ? `<section><div class="sec-t">About</div><p class="about">${esc(c.about)}</p></section>` : ''}
${services ? `<section><div class="sec-t">What we offer</div><div class="svcs">${services}</div></section>` : ''}
${gallery ? `<section><div class="sec-t">A look inside</div><div class="gal">${gallery}</div></section>` : ''}
<section id="contact"><div class="sec-t">Find us</div><div class="info">
  ${d.phone ? `<div><b>Call</b>${esc(d.phone)}</div>` : ''}
  ${d.address ? `<div><b>Visit</b>${esc(d.address)}</div>` : ''}
  ${hours ? `<div><b>Hours</b>${hours}</div>` : ''}
</div></section>
<div class="foot-cta">
  <h2>This is just a 5-minute preview. Imagine it built for <em>your</em> business.</h2>
  <p>Online booking, ordering, quotes — fully customized to how you work. We also build custom apps and handle your hosting &amp; SEO so you get found on Google. Let’s build the real thing.</p>
  <a class="cta" href="https://rankrebels.ai">Talk to Rank Rebels →</a>
  <div style="margin-top:22px;font-size:11px;color:#6b7d72">© Rank Rebels · rankrebels.ai · Preview mock-up — not for distribution.</div>
</div>
</body></html>`;
}
