# Google Lead Finder — drop-in module

Paste this whole file to Claude and say: **"Build this lead finder into my project."**
It finds high-rated local businesses that have **no website** (prime web-design leads) using the Google Places API (New), and one-clicks them into your pipeline/CRM.

---

## 1. One-time setup (Google Cloud)
1. **console.cloud.google.com** → create/select a project.
2. **APIs & Services → Library → enable "Places API (New)."** (Not the legacy "Places API.")
3. Make sure **Billing** is enabled on the project (Places has a free tier but requires billing on).
4. **Credentials → Create credentials → API key.** Restrict it to **Places API (New)**.
   - ⚠️ Set **Application restriction = None or IP** — *not* HTTP referrers, or server-side calls are blocked.
5. Store the key as a server secret named `GOOGLE_PLACES_API_KEY` (Cloudflare Pages env var, or `.env` for Node).

---

## 2. Backend — serverless function (Cloudflare Pages Functions)
Save as `functions/api/leads.js`. (For Express/Node, the inner logic is identical — just read `req.body` and `process.env`.)

```js
// POST /api/leads  { textQuery, minRating, minReviews, onlyNoWebsite }
// Returns high-rated businesses, flagging which have no website.
function json(obj, status) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: { 'content-type': 'application/json' } });
}

export async function onRequestPost({ request, env }) {
  try {
    // OPTIONAL: add your own auth check here (verify a session/JWT) before spending API quota.
    if (!env.GOOGLE_PLACES_API_KEY) return json({ error: 'Missing GOOGLE_PLACES_API_KEY.' }, 503);

    const b = await request.json().catch(() => ({}));
    const textQuery = (b.textQuery || '').trim();
    if (!textQuery) return json({ error: 'Enter a search like "auto repair in El Monte CA".' }, 400);
    const minRating = Number(b.minRating) || 0;
    const minReviews = Number(b.minReviews) || 0;
    const onlyNoWebsite = b.onlyNoWebsite !== false;

    const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': env.GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.websiteUri,places.nationalPhoneNumber,places.googleMapsUri,places.businessStatus'
      },
      body: JSON.stringify({ textQuery, pageSize: 20 })
    });
    const txt = await r.text();
    if (!r.ok) return json({ error: 'Google Places: ' + txt.slice(0, 500) }, 200);
    const data = JSON.parse(txt);

    const all = (data.places || []).map(p => ({
      id: p.id,
      name: (p.displayName && p.displayName.text) || '',
      address: p.formattedAddress || '',
      rating: p.rating || 0,
      reviews: p.userRatingCount || 0,
      phone: p.nationalPhoneNumber || '',
      website: p.websiteUri || '',
      mapsUri: p.googleMapsUri || ''
    }));
    const base = all
      .filter(p => p.businessStatus !== 'CLOSED_PERMANENTLY' || true) // status not in mask; keep all
      .filter(p => p.rating >= minRating && p.reviews >= minReviews);
    const withSite = base.filter(p => p.website).length;
    const places = (onlyNoWebsite ? base.filter(p => !p.website) : base).sort((a, b) => b.reviews - a.reviews);

    return json({ count: places.length, totalFound: base.length, withSite, places });
  } catch (err) {
    return json({ error: 'Lead finder error: ' + String(err && err.message || err) }, 200);
  }
}
```

---

## 3. Frontend — search form + results
Drop this anywhere in your app. Adjust the `addLead()` function to insert into your own database/CRM.

```html
<div style="max-width:900px;margin:24px auto;font-family:system-ui">
  <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">
    <input id="lf-q" placeholder="auto repair in El Monte CA" style="flex:1;min-width:200px;height:42px;padding:0 12px">
    <input id="lf-rating" type="number" step="0.1" value="4.0" title="Min rating" style="width:90px;height:42px;padding:0 10px">
    <input id="lf-reviews" type="number" value="20" title="Min reviews" style="width:90px;height:42px;padding:0 10px">
    <label style="display:flex;gap:6px;align-items:center;height:42px"><input type="checkbox" id="lf-nosite" checked> No website only</label>
    <button onclick="findLeads()" style="height:42px;padding:0 18px">Search</button>
  </div>
  <div id="lf-out" style="margin-top:16px"></div>
</div>
<script>
async function findLeads(){
  var out=document.getElementById('lf-out'); out.textContent='Searching…';
  var r=await fetch('/api/leads',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({textQuery:document.getElementById('lf-q').value,
      minRating:+document.getElementById('lf-rating').value, minReviews:+document.getElementById('lf-reviews').value,
      onlyNoWebsite:document.getElementById('lf-nosite').checked})});
  var d=await r.json();
  if(d.error){ out.textContent=d.error; return; }
  if(!d.places.length){ out.textContent = d.withSite ? ('Found '+d.totalFound+' businesses but all have websites — uncheck "No website only" or lower min reviews.') : 'No matches.'; return; }
  out.innerHTML='<table style="width:100%;border-collapse:collapse">'+d.places.map(function(p){
    return '<tr style="border-bottom:1px solid #ddd"><td style="padding:8px"><b>'+p.name+'</b><br><small>'+p.address+'</small></td>'+
      '<td style="padding:8px">⭐ '+p.rating+' ('+p.reviews+')</td>'+
      '<td style="padding:8px">'+(p.phone||'')+'</td>'+
      '<td style="padding:8px">'+(p.website?'has site':'<b>no website</b>')+'</td>'+
      '<td style="padding:8px"><a href="'+p.mapsUri+'" target="_blank">map</a> · <a href="#" onclick='+"'"+'addLead('+JSON.stringify(p).replace(/'/g,"&#39;")+');return false'+"'"+'>+ add</a></td></tr>';
  }).join('')+'</table>';
}
async function addLead(p){
  // TODO: insert into YOUR database/CRM. Example with Supabase:
  // await sb.from('leads').insert({ business_name:p.name, phone:p.phone, address:p.address, source:'lead-finder' });
  alert('Add to your CRM: '+p.name);
}
</script>
```

---

## 4. Notes
- **Email isn't in Places** (Google doesn't expose it) — you get name, rating, reviews, phone, website status, and a Maps link. "No website + phone + good reviews" is the strongest web-design lead signal; grab email from their listing/Facebook or by calling.
- Each search returns up to 20 results. Use `pageToken` from the response for more pages if needed.
- Costs are per-request against Google's Places pricing (free tier is generous). Add your own auth so only logged-in users can run searches.
