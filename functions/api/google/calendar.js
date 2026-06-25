// POST /api/google/calendar  { summary, description, date?, start?, end? }
//   date  → all-day event on that date (YYYY-MM-DD)
//   start/end → timed event (RFC3339). Creates on the team member's primary calendar.
import { json, bearer, verifyTeam, validAccessToken } from './_util.js';

function addDays(ymd, n) {
  const d = new Date(ymd + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export async function onRequestPost({ request, env }) {
  const email = await verifyTeam(bearer(request));
  if (!email) return json({ error: 'Not authorized.' }, 401);
  const token = await validAccessToken(env, email);
  if (!token) return json({ error: 'Google not connected. Click "Connect Google" first.' }, 409);

  const b = await request.json().catch(() => ({}));
  const summary = (b.summary || 'Rank Rebels follow-up').toString().slice(0, 300);
  const description = (b.description || '').toString().slice(0, 4000);
  let event;
  if (b.date) {
    event = { summary, description, start: { date: b.date }, end: { date: addDays(b.date, 1) } };
  } else if (b.start && b.end) {
    event = { summary, description, start: { dateTime: b.start }, end: { dateTime: b.end } };
  } else {
    return json({ error: 'Provide a date (all-day) or start/end (timed).' }, 400);
  }

  const r = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
    body: JSON.stringify(event)
  });
  if (!r.ok) {
    const detail = await r.text();
    return json({ error: 'Could not create event.', detail: detail.slice(0, 300) }, 502);
  }
  const d = await r.json();
  return json({ ok: true, link: d.htmlLink });
}
