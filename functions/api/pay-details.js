// GET /api/pay-details?client=<slug>&code=<access code>
// Returns bank-transfer details for a client ONLY when the access code matches.
// The details live in the Cloudflare secret PAY_DETAILS (JSON) — never in the page HTML
// and never in the repo — so web crawlers and anyone without the code can't scrape them.
//
// Cloudflare secret (set in the dashboard — never in this repo):
//   PAY_DETAILS = {"<client-slug>":{"code":"<access code>","account":"<acct#>","routing":"<routing#>",
//                                   "name":"Rank Rebels · Navy Federal","memo":"<memo>"}}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const client = (url.searchParams.get('client') || '').trim().toLowerCase();
  const code = (url.searchParams.get('code') || '').trim();

  let map = {};
  try { map = JSON.parse(env.PAY_DETAILS || '{}'); } catch (e) { map = {}; }
  const rec = map[client];

  if (!rec) return json({ error: 'not_configured' }, 404);
  if (!code || code.toLowerCase() !== String(rec.code || '').toLowerCase()) {
    return json({ error: 'invalid_code' }, 401);
  }
  return json({
    ok: true,
    account: rec.account || null,
    routing: rec.routing || null,
    name: rec.name || null,
    memo: rec.memo || null,
  });
}
