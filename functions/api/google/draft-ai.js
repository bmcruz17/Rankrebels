// POST /api/google/draft-ai  { to, lead } → Claude writes a tailored email, then it's saved as a Gmail draft.
import { json, bearer, verifyTeam, validAccessToken } from './_util.js';

function b64url(str) {
  const bytes = new TextEncoder().encode(str);
  let s = ''; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function encHeader(s) {
  if (/^[\x00-\x7F]*$/.test(s)) return s;
  const bytes = new TextEncoder().encode(s);
  let raw = ''; for (let i = 0; i < bytes.length; i++) raw += String.fromCharCode(bytes[i]);
  return '=?UTF-8?B?' + btoa(raw) + '?=';
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
  const kind = b.kind === 'onboarding' ? 'onboarding' : 'outreach';

  const sysOutreach = [
    "You write short, warm, professional cold-outreach emails for Rank Rebels — a digital agency offering custom websites, SEO, and Google Business Profile management for LOCAL small businesses.",
    "Write a concise email (4-7 sentences) to the local business below. Sound like a real person who noticed THEIR business specifically, not a mass blast.",
    "THE ANGLE (use whatever applies, from the fields provided):",
    "- If 'rating' and 'reviews' are present and strong (4.0+ / lots of reviews): open by genuinely complimenting their reputation, e.g. 'I came across <business> and your 4.8 stars across 120+ reviews really stood out.' Be specific with the real numbers.",
    "- If 'has_website' is false: point out, helpfully (not insultingly), that despite their great reputation they don't have a website — so they're likely missing customers who search for them and find nothing, or find a competitor instead. Frame a website as capturing demand they've already earned.",
    "- If they HAVE a website: focus on getting found on Google/AI search and the Map pack instead.",
    "- Use 'description'/'business_type' and 'city' to sound local and relevant.",
    "Goal: a soft, low-pressure invite to a quick chat or a free audit. Do NOT mention pricing, do NOT guarantee rankings or '#1 on Google'. Read the 'notes' field for any prior context. Sign off as 'The Rank Rebels Team'.",
    "BOOKING: If a 'booking' object with links is provided, end the email by offering the reader an easy choice to grab a quick 15-minute call, e.g. 'Grab a time that works for you: Book with Brandon: <link> or Book with Eric: <link>'. Include only the links that are present. If no booking links are provided, just invite them to reply.",
    'Return ONLY valid JSON, no markdown: {"subject": "...", "body": "..."}. The body is plain text with real line breaks, ready to send.'
  ].join('\n');

  const sysOnboarding = [
    "You write warm, clear ONBOARDING emails for Rank Rebels — a digital agency offering custom websites, SEO, and Google Business Profile management. The customer below has just SIGNED their service agreement, so this is a welcome + next-steps email.",
    "Write a friendly welcome (6-10 sentences or a short intro + a few bullet/numbered next steps). Thank them for signing on, express genuine excitement to get started, and clearly lay out NEXT STEPS, which typically include: (1) the one-time setup fee invoice is on its way and work begins once it's paid, (2) what we need FROM them to start — content, photos/logo, business hours, and any website logins, (3) what to expect on timeline and that they'll get monthly reports, (4) that they can submit any change requests anytime through their customer portal. Reference the specific services they signed up for (the 'interested_in' field) and use the 'notes' for personal context.",
    "Tone: human, reassuring, organized. Don't restate full legal terms. Don't invent specific dates. Sign off as 'The Rank Rebels Team'.",
    'Return ONLY valid JSON, no markdown: {"subject": "...", "body": "..."}. The body is plain text with real line breaks, ready to send.'
  ].join('\n');

  const sys = kind === 'onboarding' ? sysOnboarding : sysOutreach;

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-opus-4-8',
      max_tokens: 800,
      system: sys,
      messages: [{ role: 'user', content: (kind === 'onboarding' ? 'New signed customer:\n' : 'Lead details:\n') + JSON.stringify(lead, null, 2) }]
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
    'Subject: ' + encHeader(subject),
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
