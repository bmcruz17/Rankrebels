// POST /api/demo-lead
// Powers the "try the form" hook on customer preview sites (e.g. Island Claw).
// When a visitor submits a booking/quote form, we email THEM an instant "lead alert"
// that doubles as a Rank Rebels pitch — showing what their live site would do, and
// inviting them to have us build it.
//
// Cloudflare secret (optional): RESEND_API_KEY  — when unset, this no-ops gracefully
//   (returns {ok:true, demo:true}) so the form still shows success and never errors.
// Optional env: RESEND_FROM (default 'Rank Rebels <hello@rankrebels.ai>'),
//               DEMO_BCC (an address to copy on every test submission).

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
    from: env.RESEND_FROM || 'Rank Rebels <hello@rankrebels.ai>',
    to: [email],
    reply_to: 'hello@rankrebels.ai',
    subject: `⚡ New ${kind} for ${biz} — see how it works`,
    html,
  };
  if (env.DEMO_BCC) payload.bcc = [env.DEMO_BCC];

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
