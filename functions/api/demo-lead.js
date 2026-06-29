// POST /api/demo-lead
// Powers the "try the form" hook on customer preview sites (e.g. Island Claw).
// When a visitor submits a booking/quote form, we email THEM an instant "lead alert"
// that doubles as a Rank Rebels pitch — showing what their live site would do, and
// inviting them to have us build it.
//
// Cloudflare secret (optional): RESEND_API_KEY  — when unset, this no-ops gracefully
//   (returns {ok:true, demo:true}) so the form still shows success and never errors.
// Optional env: RESEND_FROM (default 'Rank Rebels <sales@rankrebels.ai>'),
//               LEAD_NOTIFY (comma-separated owner addresses that always get a copy /
//                            the intake answers; default 'brandon@rankrebels.ai,eric@rankrebels.ai'),
//               DEMO_BCC (an extra address to copy on every submission).
//
// Two paths:
//   • source==='intake'  → a discovery questionnaire (e.g. the TARO page). The full
//        answers are emailed straight to the OWNER (LEAD_NOTIFY); reply-to is the prospect.
//   • booking / quote     → the visitor gets the instant "lead alert" pitch, and the
//        OWNER is BCC'd so every demo submission also lands in our inbox.

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export async function onRequestPost({ request, env }) {
  let b = {};
  try { b = await request.json(); } catch (e) { return json({ error: 'Bad request' }, 400); }

  // Honeypot + light validation (block obvious bots / abuse).
  if (b.company_url) return json({ ok: true, demo: true }); // honeypot filled = bot
  const email = String(b.email || '').trim().slice(0, 160);
  const name = String(b.name || '').trim().slice(0, 120);
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'Valid email required' }, 422);

  const biz = String(b.business || 'your business').trim().slice(0, 140);
  const kind = b.source === 'booking' ? 'booking request' : 'quote request';
  const cta = /^https:\/\//.test(b.cta || '') ? b.cta : 'https://rankrebels.ai';
  const brand = String(b.brand || 'your site').trim().slice(0, 120);
  const owners = String(env.LEAD_NOTIFY || 'brandon@rankrebels.ai,eric@rankrebels.ai')
    .split(',').map((s) => s.trim()).filter(Boolean);
  const from = env.RESEND_FROM || 'Rank Rebels <sales@rankrebels.ai>';

  // ── Discovery intake (e.g. TARO questionnaire) → email the answers to the OWNER ──
  if (b.source === 'intake') {
    if (!env.RESEND_API_KEY) return json({ ok: true, demo: true });
    const notes = String(b.notes || '').slice(0, 4000);
    const contact = [];
    const c = (l, v) => { if (v != null && String(v).trim()) contact.push([l, String(v).trim().slice(0, 200)]); };
    c('Name', name); c('Email', email); c('Phone', b.phone); c('Best time', b.besttime);
    const crows = contact.map(([k, v]) =>
      `<tr><td style="padding:6px 0;color:#5b6b86;font-size:13px;white-space:nowrap;vertical-align:top">${esc(k)}</td>
           <td style="padding:6px 0 6px 16px;color:#0a1c38;font-size:14px;font-weight:600">${esc(v)}</td></tr>`).join('');
    const ihtml = `<!doctype html><html><body style="margin:0;background:#eef3fb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef3fb;padding:24px 0"><tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 18px 50px -24px rgba(10,28,56,.4)">
        <tr><td style="background:linear-gradient(120deg,#0a1c38,#2b7fe0);padding:26px 30px">
          <div style="color:#bfe2f7;font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase">⬡ New discovery intake</div>
          <div style="color:#fff;font-size:23px;font-weight:800;margin-top:6px">${esc(brand)} filled out the questionnaire</div>
        </td></tr>
        <tr><td style="padding:24px 30px 6px">
          <table cellpadding="0" cellspacing="0" style="width:100%;border-bottom:1px solid #e7eef8;margin-bottom:14px">${crows}</table>
          <div style="white-space:pre-wrap;color:#0a1c38;font-size:14px;line-height:1.7;background:#f4f8fd;border:1px solid #e2ecf8;border-radius:12px;padding:16px">${esc(notes)}</div>
        </td></tr>
        <tr><td style="padding:18px 30px 28px;text-align:center;color:#73839c;font-size:12px">
          Reply directly to reach ${esc(name || 'the prospect')} · Rank Rebels intake
        </td></tr>
      </table>
    </td></tr></table></body></html>`;
    const ipayload = {
      from, to: owners, subject: `⬡ New ${esc(brand)} intake${name ? ' — ' + name : ''}`,
      html: ihtml,
    };
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) ipayload.reply_to = email;
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: 'Bearer ' + env.RESEND_API_KEY, 'content-type': 'application/json' },
        body: JSON.stringify(ipayload),
      });
      if (!r.ok) return json({ ok: false, error: 'send_failed', status: r.status }, 200);
      return json({ ok: true, sent: true });
    } catch (e) {
      return json({ ok: false, error: 'send_error' }, 200);
    }
  }

  // Build a tidy details table from whatever the form sent.
  const fields = [];
  const add = (label, v) => { if (v != null && String(v).trim()) fields.push([label, String(v).trim().slice(0, 300)]); };
  add('Name', name);
  add('Email', email);
  add('Phone', b.phone);
  add('Event date', b.date);
  add('Event type', b.etype);
  add('Machines', b.machines);
  add('Interested in', b.interest);
  add('Add-ons requested', b.addons);
  add('Message', b.notes);

  // If no key configured, succeed silently (form still shows its success message).
  if (!env.RESEND_API_KEY) return json({ ok: true, demo: true });

  const rows = fields.map(([k, v]) =>
    `<tr><td style="padding:7px 0;color:#6b5f7e;font-size:13px;white-space:nowrap;vertical-align:top">${esc(k)}</td>
         <td style="padding:7px 0 7px 16px;color:#1c1230;font-size:14px;font-weight:600">${esc(v)}</td></tr>`).join('');

  const html = `<!doctype html><html><body style="margin:0;background:#f4eef7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4eef7;padding:24px 0"><tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 18px 50px -24px rgba(28,18,48,.4)">
      <tr><td style="background:linear-gradient(120deg,#ff2e74,#a01b8f);padding:26px 30px">
        <div style="color:#ffe9f2;font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase">⚡ Instant lead alert</div>
        <div style="color:#fff;font-size:24px;font-weight:800;margin-top:6px">You've got a new ${esc(kind)}!</div>
      </td></tr>
      <tr><td style="padding:26px 30px 6px">
        <p style="margin:0 0 14px;color:#1c1230;font-size:15px">Someone just reached out through <b>${esc(brand)}</b>. Here's exactly what would land in your inbox — and on your phone — the moment it happens:</p>
        <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #f0e2ec;border-bottom:1px solid #f0e2ec;margin:6px 0 4px">${rows}</table>
      </td></tr>
      <tr><td style="padding:18px 30px 8px">
        <div style="background:#fff0f6;border:1px solid #ffd4e6;border-radius:14px;padding:20px">
          <div style="font-size:13px;font-weight:800;color:#e01e60;letter-spacing:.05em;text-transform:uppercase;margin-bottom:8px">📣 A note from Rank Rebels</div>
          <p style="margin:0 0 14px;color:#1c1230;font-size:14.5px;line-height:1.6">This was a <b>demo</b> from your preview site. In real life, every booking, quote, and message hits you instantly so you never miss a lead or lose a sale again. We'll build it, host it, and grow it for you — your concierge web &amp; growth partner.</p>
          <a href="${esc(cta)}" style="display:inline-block;background:#ff2e74;color:#fff;font-weight:800;font-size:15px;text-decoration:none;padding:13px 26px;border-radius:12px">Let's build it →</a>
        </div>
      </td></tr>
      <tr><td style="padding:22px 30px 28px;text-align:center;color:#82738f;font-size:12px">
        Rank Rebels · websites, SEO &amp; systems for local businesses · <a href="https://rankrebels.ai" style="color:#a01b8f;font-weight:700;text-decoration:none">rankrebels.ai</a>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;

  const payload = {
    from,
    to: [email],
    reply_to: 'sales@rankrebels.ai',
    subject: `⚡ New ${kind} for ${biz} — see how it works`,
    html,
  };
  const bcc = owners.slice();
  if (env.DEMO_BCC && !bcc.includes(env.DEMO_BCC)) bcc.push(env.DEMO_BCC);
  payload.bcc = bcc;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + env.RESEND_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) return json({ ok: false, error: 'send_failed', status: r.status }, 200);
    return json({ ok: true, sent: true });
  } catch (e) {
    return json({ ok: false, error: 'send_error' }, 200);
  }
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: { 'content-type': 'application/json' } });
}
