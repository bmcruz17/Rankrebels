// POST /api/google/draft-ai  { to, lead } → Claude writes a tailored email, then it's saved as a Gmail draft.
import { json, bearer, verifyTeam, validAccessToken } from './_util.js';

function b64url(str) {
  const bytes = new TextEncoder().encode(str);
  let s = ''; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function onRequestPost({ request, env }) {
  const email = await verifyTeam(bearer(request));
  if (!email) return json({ error: 'Not authorized.' }, 401);
  if (!env.ANTHROPIC_API_KEY) return json({ error: 'AI is not configured (missing ANTHROPIC_API_KEY).' }, 503);
  const token = await validAccessToken(env, email);
  if (!token) return json({ error: 'Google not connected. Click "Connect Google" first.' }, 409);

  const b = await request.json().catch(() => ({}));
  const to = (b.to || '').trim();
  if (!to) return json({ error: 'Recipient email is required.' }, 400);
  const lead = b.lead || {};

  const sys = [
    "You write short, warm, professional emails for Rank Rebels — a digital agency offering custom websites, SEO, and Google Business Profile management.",
    "Write a concise email (4-7 sentences) to the lead described below. If it's an early-stage lead, make it a friendly first-touch intro; if they're further along, make it a natural follow-up. Reference what they're interested in, sound human (not salesy), and invite a quick reply or a free consultation. Do NOT mention pricing or make guarantees. Sign off as 'The Rank Rebels Team'.",
    'Return ONLY valid JSON, no markdown: {"subject": "...", "body": "..."}. The body is plain text with real line breaks, ready to send.'
  ].join('\n');

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-opus-4-8',
      max_tokens: 700,
      system: sys,
      messages: [{ role: 'user', content: 'Lead details:\n' + JSON.stringify(lead, null, 2) }]
    })
  });
  if (!r.ok) { const d = await r.text(); return json({ error: 'AI service error.', detail: d.slice(0, 300) }, 502); }
  const data = await r.json();
  let txt = (data.content || []).filter(x => x.type === 'text').map(x => x.text).join('').trim();
  txt = txt.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  let subject = 'Rank Rebels', body = txt;
  try { const j = JSON.parse(txt); if (j.subject) subject = j.subject; if (j.body) body = j.body; } catch (e) { /* use whole text as body */ }

  const mime = [
    'To: ' + to,
    'Subject: ' + subject,
    'Content-Type: text/plain; charset="UTF-8"',
    'MIME-Version: 1.0',
    '',
    body
  ].join('\r\n');

  const gr = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
    body: JSON.stringify({ message: { raw: b64url(mime) } })
  });
  if (!gr.ok) { const d = await gr.text(); return json({ error: 'Could not create draft.', detail: d.slice(0, 300) }, 502); }
  const gd = await gr.json();
  return json({ ok: true, draftId: gd.id, subject, link: 'https://mail.google.com/mail/u/0/#drafts' });
}
