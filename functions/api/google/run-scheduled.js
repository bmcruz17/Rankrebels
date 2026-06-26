// POST /api/google/run-scheduled    (triggered by a cron / GitHub Action)
// Sends any scheduled emails whose send_at has passed, by sending the Gmail draft
// that was created when they were scheduled. Secured by a shared secret.
//
// Cloudflare secrets required: SCHED_SECRET, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_CLIENT_SECRET
// Auth: send header  X-Sched-Secret: <SCHED_SECRET>   (or ?secret= for convenience)

import { json, validAccessToken } from './_util.js';

const SUPABASE_URL = 'https://eejmocneacfleltspedl.supabase.co';
function sbHeaders(env, extra) {
  return Object.assign({ apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY, 'content-type': 'application/json' }, extra || {});
}

export async function onRequestPost(ctx) { return run(ctx); }
export async function onRequestGet(ctx) { return run(ctx); }

async function run({ request, env }) {
  const url = new URL(request.url);
  const secret = request.headers.get('x-sched-secret') || url.searchParams.get('secret') || '';
  if (!env.SCHED_SECRET || secret !== env.SCHED_SECRET) return json({ error: 'Unauthorized.' }, 401);
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return json({ error: 'Not configured.' }, 503);

  const nowIso = new Date().toISOString();
  // due, still-scheduled emails (cap a batch)
  const q = SUPABASE_URL + '/rest/v1/rr_scheduled_emails?status=eq.scheduled&send_at=lte.' + encodeURIComponent(nowIso) + '&select=*&order=send_at.asc&limit=25';
  const r = await fetch(q, { headers: sbHeaders(env) });
  if (!r.ok) return json({ error: 'DB read failed: ' + r.status }, 502);
  const due = await r.json().catch(() => []);

  let sent = 0, failed = 0;
  for (const row of due) {
    try {
      const token = await validAccessToken(env, row.sender_email);
      if (!token) { await mark(env, row.id, 'error', 'Sender Google account not connected.'); failed++; continue; }
      if (!row.draft_id) { await mark(env, row.id, 'error', 'No draft id.'); failed++; continue; }
      const gr = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts/send', {
        method: 'POST',
        headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
        body: JSON.stringify({ id: row.draft_id }),
      });
      if (gr.ok) { await mark(env, row.id, 'sent', null); sent++; }
      else { await mark(env, row.id, 'error', ('Gmail ' + gr.status + ': ' + (await gr.text()).slice(0, 200))); failed++; }
    } catch (e) {
      await mark(env, row.id, 'error', String(e && e.message || e).slice(0, 200)); failed++;
    }
  }
  return json({ ok: true, due: due.length, sent, failed });
}

async function mark(env, id, status, error) {
  await fetch(SUPABASE_URL + '/rest/v1/rr_scheduled_emails?id=eq.' + id, {
    method: 'PATCH', headers: sbHeaders(env, { prefer: 'return=minimal' }),
    body: JSON.stringify({ status, error: error || null, sent_at: status === 'sent' ? new Date().toISOString() : null }),
  });
}
