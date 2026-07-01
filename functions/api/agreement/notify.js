// POST /api/agreement/notify  { token }
// Called right after a client signs. Emails Rank Rebels a "review & countersign" link.
// No-ops gracefully if RESEND_API_KEY / service role are not configured.
import { getByToken, sendEmail, emailShell, esc, money, json, SITE } from './_util.js';

export async function onRequestPost({ request, env }) {
  let b = {};
  try { b = await request.json(); } catch (e) { return json({ error: 'Bad request' }, 400); }
  const token = String(b.token || '').trim();
  const a = await getByToken(env, token);
  if (!a) return json({ ok: true, skipped: true }); // never leak whether a token exists

  const link = SITE + '/agreement.html?token=' + encodeURIComponent(a.token) + '&mode=countersign';
  const inner = `<tr><td style="padding:26px 28px 6px">
    <div style="font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#a87f14">Awaiting your countersignature</div>
    <div style="font-size:22px;font-weight:800;color:#15201a;margin:6px 0 12px">${esc(a.signer_name || 'The client')} signed the agreement</div>
    <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #e4ede7;border-bottom:1px solid #e4ede7;margin:6px 0 16px">
      <tr><td style="padding:7px 0;color:#5b6b61;font-size:13px">Client</td><td style="padding:7px 0;text-align:right;font-weight:700;color:#15201a">${esc(a.business_name || '—')}</td></tr>
      <tr><td style="padding:7px 0;color:#5b6b61;font-size:13px">Signed by</td><td style="padding:7px 0;text-align:right;font-weight:700;color:#15201a">${esc(a.signer_name || '—')}</td></tr>
      <tr><td style="padding:7px 0;color:#5b6b61;font-size:13px">One-time</td><td style="padding:7px 0;text-align:right;font-weight:700;color:#15201a">${money(a.setup_fee)}</td></tr>
      <tr><td style="padding:7px 0;color:#5b6b61;font-size:13px">Monthly</td><td style="padding:7px 0;text-align:right;font-weight:700;color:#15201a">${a.monthly_fee ? money(a.monthly_fee) + '/mo' : '—'}</td></tr>
    </table>
    <a href="${esc(link)}" style="display:inline-block;background:#15803d;color:#fff;font-weight:800;font-size:15px;text-decoration:none;padding:13px 26px;border-radius:12px">Review &amp; countersign →</a>
    <div style="color:#8a978f;font-size:12px;margin-top:10px">You'll need to be signed in to your Rank Rebels dashboard to countersign.</div>
  </td></tr>`;

  const notify = String(env.AGREEMENT_NOTIFY || 'brandon@rankrebels.ai');
  await sendEmail(env, {
    to: notify, bcc: 'sales@rankrebels.ai',
    subject: `✍️ ${a.business_name || 'A client'} signed — countersign to execute`,
    html: emailShell(inner),
    reply_to: a.client_email || undefined,
  });
  return json({ ok: true });
}
