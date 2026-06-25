// POST /api/google/draft  { to, subject, body } → creates a Gmail draft in the team member's account.
import { json, bearer, verifyTeam, validAccessToken } from './_util.js';

function b64url(str) {
  const bytes = new TextEncoder().encode(str);
  let s = ''; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
// RFC 2047 encode a header value if it contains non-ASCII (fixes garbled subjects)
function encHeader(s) {
  if (/^[\x00-\x7F]*$/.test(s)) return s;
  const bytes = new TextEncoder().encode(s);
  let raw = ''; for (let i = 0; i < bytes.length; i++) raw += String.fromCharCode(bytes[i]);
  return '=?UTF-8?B?' + btoa(raw) + '?=';
}

export async function onRequestPost({ request, env }) {
  const email = await verifyTeam(bearer(request));
  if (!email) return json({ error: 'Not authorized.' }, 401);
  const token = await validAccessToken(env, email);
  if (!token) return json({ error: 'Google not connected. Click "Connect Google" first.' }, 409);

  const b = await request.json().catch(() => ({}));
  const to = (b.to || '').trim();
  const subject = (b.subject || '').trim();
  const body = (b.body || '').toString();
  if (!to) return json({ error: 'Recipient email is required.' }, 400);

  const mime = [
    'To: ' + to,
    'Subject: ' + encHeader(subject),
    'Content-Type: text/plain; charset="UTF-8"',
    'MIME-Version: 1.0',
    '',
    body
  ].join('\r\n');

  const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
    body: JSON.stringify({ message: { raw: b64url(mime) } })
  });
  if (!r.ok) {
    const detail = await r.text();
    return json({ error: 'Could not create draft.', detail: detail.slice(0, 300) }, 502);
  }
  const d = await r.json();
  return json({ ok: true, draftId: d.id, link: 'https://mail.google.com/mail/u/0/#drafts' });
}
