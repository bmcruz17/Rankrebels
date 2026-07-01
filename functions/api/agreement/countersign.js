// POST /api/agreement/countersign  { token, name }   (Authorization: Bearer <supabase jwt>)
// Only an authorized Rank Rebels countersigner (Brandon) may call this. Flips the
// record to "executed" and emails BOTH parties a link to the signed copy.
import { getByToken, verifyCountersigner, sendEmail, emailShell, esc, json, sbHeaders, SUPABASE_URL, SITE } from './_util.js';

export async function onRequestPost({ request, env }) {
  let b = {};
  try { b = await request.json(); } catch (e) { return json({ error: 'Bad request' }, 400); }

  const jwt = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const who = await verifyCountersigner(jwt);
  if (!who) return json({ error: 'Not authorized — sign in as a Rank Rebels team member to countersign.' }, 401);

  const token = String(b.token || '').trim();
  const name = String(b.name || '').trim().slice(0, 120);
  if (!name) return json({ error: 'Please type your name to countersign.' }, 422);

  const a = await getByToken(env, token);
  if (!a) return json({ error: 'Agreement not found.' }, 404);
  if (a.status === 'executed') return json({ ok: true, already: true });

  const up = await fetch(SUPABASE_URL + '/rest/v1/rr_agreements?token=eq.' + encodeURIComponent(token), {
    method: 'PATCH',
    headers: Object.assign(sbHeaders(env), { prefer: 'return=representation' }),
    body: JSON.stringify({ status: 'executed', countersigned_by: name + ' (' + who + ')', countersigned_at: new Date().toISOString() }),
  });
  if (!up.ok) return json({ error: 'Could not record the countersignature.' }, 502);

  const link = SITE + '/agreement.html?token=' + encodeURIComponent(token) + '&mode=view';
  const inner = `<tr><td style="padding:26px 28px 6px">
    <div style="font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#15803d">Fully executed ✔</div>
    <div style="font-size:22px;font-weight:800;color:#15201a;margin:6px 0 12px">Your agreement is signed by both parties</div>
    <p style="margin:0 0 16px;color:#39463d;font-size:14.5px">${esc(a.business_name || 'Your business')} and Rank Rebels have both signed the Master Service Agreement. Open your copy any time — use your browser's Print / Save-as-PDF to keep it.</p>
    <a href="${esc(link)}" style="display:inline-block;background:#15803d;color:#fff;font-weight:800;font-size:15px;text-decoration:none;padding:13px 26px;border-radius:12px">View / download the signed agreement →</a>
  </td></tr>`;

  const to = [a.client_email, String(env.AGREEMENT_NOTIFY || 'brandon@rankrebels.ai')].filter(Boolean);
  await sendEmail(env, { to, bcc: 'sales@rankrebels.ai', subject: `✔ Executed — ${a.business_name || 'Rank Rebels'} Master Service Agreement`, html: emailShell(inner) });
  return json({ ok: true });
}
