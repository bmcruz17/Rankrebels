// POST /api/admin/reset-user   { email, redirect? }
// Team-only. Generates a one-time password-reset (recovery) link for a rep/user so an admin
// can hand it to them directly — text, email, whatever — WITHOUT relying on Supabase's
// built-in reset mailer (which is rate-limited and unreliable until Auth SMTP points at Resend).
//
// The rep opens the link, lands on the dashboard (or portal), and the PASSWORD_RECOVERY flow
// already wired there prompts them to choose a new password.
//
// Cloudflare secret required: SUPABASE_SERVICE_ROLE_KEY
import { json, bearer, verifyTeam } from '../google/_util.js';

const SUPABASE_URL = 'https://eejmocneacfleltspedl.supabase.co';

export async function onRequestPost({ request, env }) {
  const who = await verifyTeam(bearer(request));
  if (!who) return json({ error: 'Not authorized — team sign-in required.' }, 401);
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return json({ error: 'Not configured (missing service role key).' }, 503);

  const b = await request.json().catch(() => ({}));
  const email = String(b.email || '').trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'A valid rep email is required.' }, 400);
  const redirect = /^https:\/\/[^\s]+$/.test(b.redirect || '') ? b.redirect : 'https://rankrebels.ai/dashboard';

  const r = await fetch(SUPABASE_URL + '/auth/v1/admin/generate_link', {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ type: 'recovery', email, options: { redirect_to: redirect } }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    // Most common: the user doesn't exist yet (they've never signed in / been created).
    const msg = (d && (d.msg || d.error_description || d.error || d.message)) || ('Supabase error ' + r.status);
    return json({ error: msg, hint: 'If this rep has never logged in, add them as a user first.' }, 502);
  }

  const link = d.action_link || (d.properties && d.properties.action_link) || null;
  if (!link) return json({ error: 'No reset link returned by Supabase.' }, 502);
  return json({ ok: true, email, link });
}
