// POST /api/stripe/invoice  { email, name, items:[{description, amount}] }
// Creates a Stripe invoice and emails the customer a hosted invoice with a "Pay" button.
//
// Cloudflare secret required: STRIPE_SECRET_KEY  (Stripe dashboard → Developers → API keys → Secret key)
import { json, bearer, verifyTeam } from '../google/_util.js';

function form(obj) {
  const p = new URLSearchParams();
  for (const k in obj) { if (obj[k] != null) p.append(k, String(obj[k])); }
  return p;
}
function sPost(env, path, obj) {
  return fetch('https://api.stripe.com/v1/' + path, {
    method: 'POST',
    headers: { authorization: 'Bearer ' + env.STRIPE_SECRET_KEY, 'content-type': 'application/x-www-form-urlencoded' },
    body: form(obj || {})
  });
}
function sGet(env, path) {
  return fetch('https://api.stripe.com/v1/' + path, { headers: { authorization: 'Bearer ' + env.STRIPE_SECRET_KEY } });
}

export async function onRequestPost({ request, env }) {
  const teamEmail = await verifyTeam(bearer(request));
  if (!teamEmail) return json({ error: 'Not authorized.' }, 401);
  if (!env.STRIPE_SECRET_KEY) return json({ error: 'Stripe is not configured yet (missing STRIPE_SECRET_KEY).' }, 503);

  const b = await request.json().catch(() => ({}));
  const email = (b.email || '').trim();
  const name = (b.name || '').trim();
  const items = Array.isArray(b.items) ? b.items : [];
  if (!email) return json({ error: "Customer email is required — Stripe emails the invoice there." }, 400);
  if (!items.length) return json({ error: 'No charges to invoice.' }, 400);

  // 1) find or create the Stripe customer
  let custId = null;
  const cs = await sGet(env, 'customers?email=' + encodeURIComponent(email) + '&limit=1');
  if (cs.ok) { const cd = await cs.json(); if (cd.data && cd.data[0]) custId = cd.data[0].id; }
  if (!custId) {
    const cr = await sPost(env, 'customers', { email: email, name: name || email });
    if (!cr.ok) return json({ error: 'Stripe customer error.', detail: (await cr.text()).slice(0, 300) }, 502);
    custId = (await cr.json()).id;
  }

  // 2) add each charge as a pending invoice item
  for (const it of items) {
    const cents = Math.round(Number(it.amount || 0) * 100);
    if (cents <= 0) continue;
    const ir = await sPost(env, 'invoiceitems', { customer: custId, amount: cents, currency: 'usd', description: String(it.description || 'Charge').slice(0, 300) });
    if (!ir.ok) return json({ error: 'Stripe line-item error.', detail: (await ir.text()).slice(0, 300) }, 502);
  }

  // 3) create the invoice (collects the pending items)
  //    Offer financing / "pay over time" where eligible: card, bank, Klarna, Affirm,
  //    Afterpay, Cash App, Link. If a method isn't activated on the account yet, Stripe
  //    rejects the whole list — so we retry without it and fall back to the account default.
  const invBase = { customer: custId, collection_method: 'send_invoice', days_until_due: 14, auto_advance: 'true' };
  const PM = ['card', 'us_bank_account', 'klarna', 'affirm', 'afterpay_clearpay', 'cashapp', 'link'];
  const withPM = Object.assign({}, invBase);
  PM.forEach((t, i) => { withPM['payment_settings[payment_method_types][' + i + ']'] = t; });
  let inv = await sPost(env, 'invoices', withPM);
  if (!inv.ok) inv = await sPost(env, 'invoices', invBase); // a BNPL method may not be enabled yet
  if (!inv.ok) return json({ error: 'Stripe invoice error.', detail: (await inv.text()).slice(0, 300) }, 502);
  const invId = (await inv.json()).id;

  // 4) finalize + send (Stripe emails the hosted invoice with a Pay button)
  const fin = await sPost(env, 'invoices/' + invId + '/finalize_invoice', {});
  if (!fin.ok) return json({ error: 'Stripe finalize error.', detail: (await fin.text()).slice(0, 300) }, 502);
  const finData = await fin.json();
  await sPost(env, 'invoices/' + invId + '/send_invoice', {});

  return json({ ok: true, invoiceId: invId, url: finData.hosted_invoice_url || null, total: (finData.total || 0) / 100 });
}
