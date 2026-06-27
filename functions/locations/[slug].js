// GET /locations/<slug>  → an indexable, on-brand local landing page for SEO.
//   <slug> = a metro ("los-angeles-ca") or a state ("california").
// Each page has a tailored H1/title/meta, local copy, services, internal links, and a lead form
// that drops straight into the pipeline (same public anon insert as the homepage).

const SITE = 'https://rankrebels.ai';

const METROS = [
  ['New York', 'NY'], ['Los Angeles', 'CA'], ['Chicago', 'IL'], ['Houston', 'TX'], ['Phoenix', 'AZ'],
  ['Philadelphia', 'PA'], ['San Antonio', 'TX'], ['San Diego', 'CA'], ['Dallas', 'TX'], ['Austin', 'TX'],
  ['San Jose', 'CA'], ['Jacksonville', 'FL'], ['Columbus', 'OH'], ['Charlotte', 'NC'], ['Indianapolis', 'IN'],
  ['San Francisco', 'CA'], ['Seattle', 'WA'], ['Denver', 'CO'], ['Nashville', 'TN'], ['Oklahoma City', 'OK'],
  ['Las Vegas', 'NV'], ['Portland', 'OR'], ['Miami', 'FL'], ['Atlanta', 'GA'], ['Boston', 'MA'],
  ['Sacramento', 'CA'], ['Kansas City', 'MO'], ['Tampa', 'FL'], ['Salt Lake City', 'UT'], ['Honolulu', 'HI']
];
const STATES = [
  ['Alabama', 'AL'], ['Alaska', 'AK'], ['Arizona', 'AZ'], ['Arkansas', 'AR'], ['California', 'CA'], ['Colorado', 'CO'],
  ['Connecticut', 'CT'], ['Delaware', 'DE'], ['Florida', 'FL'], ['Georgia', 'GA'], ['Hawaii', 'HI'], ['Idaho', 'ID'],
  ['Illinois', 'IL'], ['Indiana', 'IN'], ['Iowa', 'IA'], ['Kansas', 'KS'], ['Kentucky', 'KY'], ['Louisiana', 'LA'],
  ['Maine', 'ME'], ['Maryland', 'MD'], ['Massachusetts', 'MA'], ['Michigan', 'MI'], ['Minnesota', 'MN'], ['Mississippi', 'MS'],
  ['Missouri', 'MO'], ['Montana', 'MT'], ['Nebraska', 'NE'], ['Nevada', 'NV'], ['New Hampshire', 'NH'], ['New Jersey', 'NJ'],
  ['New Mexico', 'NM'], ['New York', 'NY'], ['North Carolina', 'NC'], ['North Dakota', 'ND'], ['Ohio', 'OH'], ['Oklahoma', 'OK'],
  ['Oregon', 'OR'], ['Pennsylvania', 'PA'], ['Rhode Island', 'RI'], ['South Carolina', 'SC'], ['South Dakota', 'SD'], ['Tennessee', 'TN'],
  ['Texas', 'TX'], ['Utah', 'UT'], ['Vermont', 'VT'], ['Virginia', 'VA'], ['Washington', 'WA'], ['West Virginia', 'WV'],
  ['Wisconsin', 'WI'], ['Wyoming', 'WY']
];

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function citySlug(city, abbr) { return city.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + abbr.toLowerCase(); }
function stateSlug(name) { return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
const stateName = abbr => (STATES.find(s => s[1] === abbr) || [abbr])[0];

export function listLocationUrls() {
  return [].concat(
    METROS.map(([c, a]) => SITE + '/locations/' + citySlug(c, a)),
    STATES.map(([n]) => SITE + '/locations/' + stateSlug(n))
  );
}

export async function onRequestGet({ params }) {
  const slug = (params.slug || '').toLowerCase();
  const metro = METROS.find(([c, a]) => citySlug(c, a) === slug);
  const state = STATES.find(([n]) => stateSlug(n) === slug);
  if (!metro && !state) return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain' } });

  const isMetro = !!metro;
  const city = isMetro ? metro[0] : '';
  const abbr = isMetro ? metro[1] : state[1];
  const stName = isMetro ? stateName(abbr) : state[0];
  const place = isMetro ? `${city}, ${abbr}` : stName;
  const title = `Web Design, SEO & Google Business in ${place} | Rank Rebels`;
  const desc = `Custom websites, SEO, and Google Business Profile management for ${isMetro ? city + ', ' + abbr : stName} local businesses. Get found on Google, the Map pack, and AI search. Free audit.`;
  const url = SITE + '/locations/' + slug;

  // internal links
  const sameStateMetros = METROS.filter(([c, a]) => a === abbr && c !== city);
  const otherLinks = (isMetro ? sameStateMetros.length ? sameStateMetros : METROS.slice(0, 8).filter(m => m[0] !== city)
    : METROS.filter(([c, a]) => a === abbr)).map(([c, a]) => `<a href="/locations/${citySlug(c, a)}">${esc(c)}, ${esc(a)}</a>`).join('');
  const stateLinks = STATES.map(([n]) => `<a href="/locations/${stateSlug(n)}">${esc(n)}</a>`).join('');
  const stateLink = isMetro ? `<a href="/locations/${stateSlug(stName)}">all of ${esc(stName)}</a>` : '';

  const body = `<!doctype html><html lang=en><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
<link rel="icon" href="/brand/icon-32.png">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(url)}">
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'ProfessionalService', name: 'Rank Rebels', description: desc, areaServed: place, url, telephone: '+1-808-265-5339', priceRange: '$$', serviceType: ['Web Design', 'SEO', 'Google Business Profile Management'] })}</script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{--brand:#15803d;--gold:#c79a1e;--ink:#11201a;--muted:#5f6f66;--line:#e6ece8;--soft:#f5f8f6}
body{font-family:'Plus Jakarta Sans',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:var(--ink);line-height:1.6;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
.wrap{max-width:1080px;margin:0 auto;padding:0 24px}
.nav{position:sticky;top:0;z-index:50;display:flex;align-items:center;justify-content:space-between;padding:13px 24px;background:rgba(255,255,255,.9);backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}
.nav .brand{display:flex;align-items:center;gap:9px;font-weight:800;font-size:18px}
.nav .brand img{width:30px;height:30px;border-radius:7px}
.nav .brand b{color:var(--brand)}
.nav .ncta{background:var(--brand);color:#fff;font-weight:700;font-size:14px;padding:9px 18px;border-radius:10px}
.hero{background:linear-gradient(160deg,#0d1512,#15201a);color:#fff;padding:70px 0 60px}
.hero .eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;letter-spacing:.16em;text-transform:uppercase;font-weight:700;color:#7CFFB0;margin-bottom:16px}
.hero h1{font-size:clamp(30px,5.2vw,52px);font-weight:800;letter-spacing:-.025em;line-height:1.08;max-width:18ch}
.hero p{font-size:clamp(16px,2.2vw,20px);margin-top:18px;max-width:60ch;color:#c7d6cd}
.hero .btns{display:flex;gap:12px;flex-wrap:wrap;margin-top:30px}
.btn{display:inline-flex;align-items:center;gap:8px;background:var(--brand);color:#fff;font-weight:700;font-size:16px;padding:14px 28px;border-radius:12px;border:0;cursor:pointer}
.btn.o{background:transparent;border:1px solid rgba(255,255,255,.3);color:#fff}
section{padding:60px 0}
.kick{font-size:12.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--brand);font-weight:800;margin-bottom:10px}
h2{font-size:clamp(24px,3.4vw,36px);font-weight:800;letter-spacing:-.02em;line-height:1.15}
.lead{font-size:17px;color:var(--muted);max-width:64ch;margin-top:14px}
.svcs{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px;margin-top:30px}
.svc{border:1px solid var(--line);border-radius:16px;padding:24px;background:#fff}
.svc .i{font-size:24px}.svc h3{font-size:18px;margin:10px 0 6px}.svc p{font-size:14px;color:var(--muted)}
.soft{background:var(--soft)}
.links{display:flex;flex-wrap:wrap;gap:8px 10px;margin-top:18px}
.links a{font-size:13.5px;color:var(--brand);background:#fff;border:1px solid var(--line);padding:7px 12px;border-radius:999px}
.links a:hover{border-color:var(--brand)}
.form{background:#fff;border:1px solid var(--line);border-radius:18px;padding:26px;max-width:560px;margin:0 auto;box-shadow:0 24px 50px -30px rgba(20,50,30,.3)}
.form .row{display:flex;gap:12px;flex-wrap:wrap}
.form input,.form textarea{flex:1;min-width:160px;width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:10px;font:inherit;margin-bottom:12px}
.form button{width:100%;justify-content:center}
footer{background:#0a0f0c;color:#9fb3a8;text-align:center;padding:40px 24px;font-size:13px}
footer a{color:#7CFFB0}
@media(max-width:640px){.hero{padding:50px 0 44px}}
</style>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</head><body>
<div class="nav"><a class="brand" href="/"><img src="/brand/rr-mark.png" alt="Rank Rebels"> Rank<b>Rebels</b></a><a class="ncta" href="#audit">Free audit</a></div>
<header class="hero"><div class="wrap">
  <div class="eyebrow">● Serving ${esc(place)}</div>
  <h1>Web Design &amp; SEO in ${esc(place)}</h1>
  <p>Custom-built websites, SEO, and Google Business Profile management for ${esc(isMetro ? city : stName)} businesses that want to get found — on Google, in the Map pack, and when customers ask AI for a recommendation.</p>
  <div class="btns"><a class="btn" href="#audit">Get your free audit →</a><a class="btn o" href="tel:+18082655339">📞 (808) 265-5339</a></div>
</div></header>

<section><div class="wrap">
  <div class="kick">Why ${esc(isMetro ? city : stName)} businesses choose us</div>
  <h2>Show up first when locals search</h2>
  <p class="lead">Most ${esc(isMetro ? city : stName)} customers Google a business before they ever call. We make sure that when they do, you’re the professional, modern, trustworthy result they pick — not the competitor with the old site.</p>
  <div class="svcs">
    <div class="svc"><div class="i">🛠️</div><h3>Custom websites</h3><p>Fast, mobile-first sites built for your ${esc(isMetro ? city : stName)} business — designed to turn visitors into booked jobs.</p></div>
    <div class="svc"><div class="i">🔎</div><h3>SEO &amp; AI search</h3><p>Engineered to rank on Google and surface when people ask ChatGPT and AI for a local recommendation.</p></div>
    <div class="svc"><div class="i">📍</div><h3>Google Business Profile</h3><p>We set up and manage your listing to win the ${esc(place)} Map pack and drive calls, directions &amp; reviews.</p></div>
  </div>
</div></section>

<section class="soft" id="audit"><div class="wrap">
  <div style="text-align:center;margin-bottom:26px"><div class="kick">Free audit</div><h2>Ready to stand out in ${esc(place)}?</h2><p class="lead" style="margin:14px auto 0">Tell us about your business and we’ll send a free, no-pressure audit of your site and search presence within 24 hours.</p></div>
  <form class="form" onsubmit="return submitLead(event)">
    <div class="row"><input required name="name" placeholder="Your name"><input required name="business" placeholder="Business name"></div>
    <div class="row"><input required type="email" name="email" placeholder="Email"><input name="phone" placeholder="Phone (optional)"></div>
    <textarea name="message" rows="3" placeholder="What do you need? (new site, redesign, more leads…)"></textarea>
    <button class="btn" type="submit">Get my free audit →</button>
    <p id="fm" style="display:none;text-align:center;color:var(--brand);font-size:14px;margin-top:10px">✓ Got it. We’ll be in touch within 24 hours.</p>
  </form>
</div></section>

<section><div class="wrap">
  <div class="kick">${isMetro ? 'Nearby areas' : 'Cities in ' + esc(stName)}</div>
  <h2>We serve businesses across ${esc(isMetro ? stName : stName)}</h2>
  <div class="links">${otherLinks || stateLinks}</div>
  ${stateLink ? `<p style="margin-top:16px;font-size:14px;color:var(--muted)">See ${stateLink} →</p>` : ''}
  <div class="kick" style="margin-top:34px">All states</div>
  <div class="links">${stateLinks}</div>
</div></section>

<footer>© <span id="y"></span> RankRebels.AI LLC · <a href="/">Home</a> · <a href="/privacy">Privacy</a> · Serving ${esc(place)} and beyond.</footer>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
document.getElementById('y').textContent=new Date().getFullYear();
var sb=window.supabase.createClient('https://eejmocneacfleltspedl.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlam1vY25lYWNmbGVsdHNwZWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyNDQ3MTMsImV4cCI6MjA5NzgyMDcxM30.dXJTMFp_d9JRlXkesVPCUj6tBi3qphxxOu3v-Cuw7_Y');
async function submitLead(e){e.preventDefault();var f=e.target;var rec={business_name:f.business.value,contact_name:f.name.value,email:f.email.value,phone:f.phone.value||null,stage:'lead',acquired_by:'website',notes:'Inbound lead from ${esc(place)} landing page'+(f.message.value?(' — '+f.message.value):'')};try{var r=await sb.from('rr_clients').insert(rec);if(r.error)throw r.error;f.reset();document.getElementById('fm').style.display='block';}catch(err){alert('Sorry, something went wrong — please email hello@rankrebels.ai');}return false;}
</script>
</body></html>`;
  return new Response(body, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}
