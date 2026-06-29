// GET/POST /api/followups/run   (triggered by the daily cron — same secret as run-scheduled)
// Auto follow-up sequence for un-closed proposals. Any customer sitting in an OPEN stage
// (lead / contacted) with an email + a hook page gets a short series of hand-written
// reminder emails on a cadence. It stops the moment they're won (accepted/in_build/…),
// archived, or paused. Sends from sales@rankrebels.ai via Resend.
//
// Cloudflare secrets: SCHED_SECRET, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY
// Auth: header  X-Sched-Secret: <SCHED_SECRET>   (or ?secret= for convenience)
//
// State lives in rr_clients.followups (jsonb): { enrolled_at, step, last_sent_at, paused, done }
// Cadence (days after enrollment): step 1 → 2, step 2 → 5, step 3 → 10, step 4 → 21.

const SUPABASE_URL = 'https://eejmocneacfleltspedl.supabase.co';
const OPEN_STAGES = ['lead', 'contacted'];
const OFFSETS = [2, 5, 10, 21]; // days after enrollment for steps 1..4
const DAY = 86400000;

function json(obj, status) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: { 'content-type': 'application/json' } });
}
function sb(env, extra) {
  return Object.assign({ apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY, 'content-type': 'application/json' }, extra || {});
}
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const firstName = (n) => { const t = String(n || '').trim().split(/\s+/)[0]; return t && t.length <= 24 ? t : 'there'; };

// ---- the emails (hand-written, varied, not spammy) ----
function shell(bodyHtml, hook, ctaLabel) {
  const btn = `<a href="${esc(hook)}" style="display:inline-block;background:#15803d;color:#fff;font-weight:700;font-size:15px;text-decoration:none;padding:13px 26px;border-radius:11px">${esc(ctaLabel)} →</a>`;
  return `<!doctype html><html><body style="margin:0;background:#f4f6f4;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1d2b22;line-height:1.6">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f4;padding:26px 0"><tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 16px 44px -26px rgba(20,50,30,.4)">
      <tr><td style="padding:28px 32px 6px">
        <div style="font-weight:800;font-size:15px;letter-spacing:.02em;color:#15803d">Rank Rebels</div>
      </td></tr>
      <tr><td style="padding:8px 32px 6px;font-size:15px">${bodyHtml}
        <div style="margin:22px 0 6px">${btn}</div>
      </td></tr>
      <tr><td style="padding:18px 32px 26px;border-top:1px solid #eef1ee;color:#7c8a82;font-size:12px">
        Rank Rebels · websites, SEO &amp; systems for local businesses · <a href="https://rankrebels.ai" style="color:#15803d;text-decoration:none">rankrebels.ai</a><br>
        Not the right time? Just reply and we'll close it out — no more emails.
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

function template(step, c) {
  const fn = firstName(c.contact_name);
  const biz = (c.business_name || 'your business').trim();
  const hook = c.hook_url;
  if (step === 1) return {
    subject: `Quick one about ${biz}'s new site, ${fn}`,
    html: shell(
      `<p>Hi ${esc(fn)},</p>
       <p>Just making sure the preview we put together for <b>${esc(biz)}</b> reached you — it's the page with the design, what's included, and the spot to get started.</p>
       <p>Have a look whenever you get a minute. If anything's unclear or you'd tweak something, just reply here and I'll sort it out.</p>`,
      hook, 'See your site & get started')
  };
  if (step === 2) return {
    subject: `What this actually does for ${biz}`,
    html: shell(
      `<p>Hi ${esc(fn)},</p>
       <p>Circling back on the ${esc(biz)} build. The short version of why it's worth it: a fast, modern site that shows up on Google, takes bookings or calls 24/7, and is fully managed by us — you never touch the tech.</p>
       <p>Most owners we work with see the difference in the first month or two. The page below has the full breakdown and pricing.</p>`,
      hook, 'View the proposal')
  };
  if (step === 3) return {
    subject: `Still mulling it over? (totally fair)`,
    html: shell(
      `<p>Hi ${esc(fn)},</p>
       <p>No rush at all — I know a new site is a real decision. Two things people usually want to know:</p>
       <p>• <b>You own everything</b> — the site, the domain, all of it.<br>
          • <b>You can spread the build fee</b> over time with Klarna, Affirm, or Afterpay at checkout.</p>
       <p>If there's a question holding it up, hit reply — happy to answer straight. Otherwise the proposal's right here.</p>`,
      hook, 'Review & get started')
  };
  return {
    subject: `Should I close out the ${biz} project?`,
    html: shell(
      `<p>Hi ${esc(fn)},</p>
       <p>I don't want to keep landing in your inbox, so this is my last note on it. If the timing isn't right for <b>${esc(biz)}</b>, no worries at all — just let me know and I'll close the file.</p>
       <p>If you <i>are</i> still interested, the proposal's below and I'd love to build it for you. Either way, thanks for taking a look.</p>`,
      hook, 'Open the proposal')
  };
}

async function sendEmail(env, to, subject, html) {
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + env.RESEND_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: env.RESEND_FROM || 'Rank Rebels <sales@rankrebels.ai>',
        to: [to], reply_to: 'sales@rankrebels.ai',
        bcc: ['sales@rankrebels.ai'], subject, html,
      }),
    });
    return r.ok;
  } catch (e) { return false; }
}

async function patchClient(env, id, fields) {
  return fetch(SUPABASE_URL + '/rest/v1/rr_clients?id=eq.' + encodeURIComponent(id), {
    method: 'PATCH', headers: sb(env, { prefer: 'return=minimal' }), body: JSON.stringify(fields),
  });
}

export async function onRequestGet(ctx) { return run(ctx); }
export async function onRequestPost(ctx) { return run(ctx); }

async function run({ request, env }) {
  const url = new URL(request.url);
  const secret = request.headers.get('x-sched-secret') || url.searchParams.get('secret') || '';
  if (!env.SCHED_SECRET || secret !== env.SCHED_SECRET) return json({ error: 'Unauthorized.' }, 401);
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return json({ error: 'Not configured (no service role).' }, 503);
  if (!env.RESEND_API_KEY) return json({ ok: true, skipped: 'RESEND_API_KEY not set — nothing sent.' });

  const dry = url.searchParams.get('dry') === '1';
  const inStages = OPEN_STAGES.map((s) => '"' + s + '"').join(',');
  const q = SUPABASE_URL + '/rest/v1/rr_clients?stage=in.(' + encodeURIComponent(inStages) +
    ')&email=not.is.null&hook_url=not.is.null&select=id,business_name,contact_name,email,hook_url,followups,activities&limit=300';
  const r = await fetch(q, { headers: sb(env) });
  if (!r.ok) return json({ error: 'DB read failed: ' + r.status }, 502);
  const clients = await r.json().catch(() => []);

  const now = Date.now();
  const sent = [], enrolled = [];
  for (const c of clients) {
    const email = String(c.email || '').trim();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !c.hook_url) continue;
    const fu = (c.followups && typeof c.followups === 'object') ? c.followups : {};
    if (fu.paused || fu.done) continue;

    // First time we see them eligible → enroll, but don't email on day 0.
    if (!fu.enrolled_at) {
      if (!dry) await patchClient(env, c.id, { followups: { enrolled_at: new Date(now).toISOString(), step: 0 } });
      enrolled.push(c.id); continue;
    }
    const step = Number(fu.step) || 0;
    const next = step + 1;
    if (next > OFFSETS.length) { if (!dry) await patchClient(env, c.id, Object.assign({}, { followups: Object.assign({}, fu, { done: true }) })); continue; }
    const dueAt = Date.parse(fu.enrolled_at) + OFFSETS[next - 1] * DAY;
    if (now < dueAt) continue;

    const tpl = template(next, c);
    if (dry) { sent.push({ id: c.id, step: next, subject: tpl.subject, demo: true }); continue; }
    const ok = await sendEmail(env, email, tpl.subject, tpl.html);
    if (!ok) continue;

    const newFu = Object.assign({}, fu, { step: next, last_sent_at: new Date(now).toISOString(), done: next >= OFFSETS.length });
    const acts = Array.isArray(c.activities) ? c.activities.slice() : [];
    acts.unshift({ type: 'email', note: 'Auto follow-up #' + next + ' sent: ' + tpl.subject, at: new Date(now).toISOString(), by: 'auto' });
    await patchClient(env, c.id, { followups: newFu, activities: acts });
    sent.push({ id: c.id, step: next });
  }
  return json({ ok: true, considered: clients.length, enrolled: enrolled.length, sent: sent.length, detail: sent });
}
