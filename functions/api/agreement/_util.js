// Shared helpers for the agreement countersign + delivery flow.
// Signing is recorded client-side (anon insert, as before). These server-side
// endpoints handle the parts that must be trusted: notifying Rank Rebels, verifying
// the countersigner, flipping the record to "executed", and emailing both parties.

export const SUPABASE_URL = 'https://eejmocneacfleltspedl.supabase.co';
export const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlam1vY25lYWNmbGVsdHNwZWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyNDQ3MTMsImV4cCI6MjA5NzgyMDcxM30.dXJTMFp_d9JRlXkesVPCUj6tBi3qphxxOu3v-Cuw7_Y';
export const SITE = 'https://rankrebels.ai';
// Only Brandon may countersign (Eric is no longer with the company). Explicit list —
// intentionally NOT a "@rankrebels.ai" wildcard, so no other address can execute.
export const COUNTERSIGNERS = ['brandon@rankrebels.ai', 'brandonmcruz@mac.com'];

export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export function json(obj, status) { return new Response(JSON.stringify(obj), { status: status || 200, headers: { 'content-type': 'application/json' } }); }
export function money(n) { n = Number(n || 0); return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export function sbHeaders(env) {
  return { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY, 'content-type': 'application/json' };
}

// Load one agreement by its secret token (service role, bypasses RLS).
export async function getByToken(env, token) {
  if (!env.SUPABASE_SERVICE_ROLE_KEY || !token) return null;
  const r = await fetch(SUPABASE_URL + '/rest/v1/rr_agreements?token=eq.' + encodeURIComponent(token) + '&select=*', { headers: sbHeaders(env) });
  if (!r.ok) return null;
  const rows = await r.json().catch(() => []);
  return rows[0] || null;
}

// Verify the caller is an authorized Rank Rebels countersigner via their Supabase JWT.
export async function verifyCountersigner(jwt) {
  if (!jwt) return null;
  try {
    const r = await fetch(SUPABASE_URL + '/auth/v1/user', { headers: { apikey: SUPABASE_ANON, authorization: 'Bearer ' + jwt } });
    if (!r.ok) return null;
    const u = await r.json();
    const email = (u && u.email || '').toLowerCase();
    return COUNTERSIGNERS.indexOf(email) >= 0 ? email : null;
  } catch (e) { return null; }
}

// Send via Resend. No-ops gracefully (returns skipped:true) when RESEND_API_KEY is unset,
// exactly like the demo-lead function, so the flow never errors before email is configured.
export async function sendEmail(env, { to, bcc, subject, html, reply_to }) {
  if (!env.RESEND_API_KEY) return { ok: true, skipped: true };
  const payload = { from: env.RESEND_FROM || 'Rank Rebels <sales@rankrebels.ai>', to: [].concat(to).filter(Boolean), subject, html };
  if (bcc) payload.bcc = [].concat(bcc).filter(Boolean);
  if (reply_to) payload.reply_to = reply_to;
  try {
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: 'Bearer ' + env.RESEND_API_KEY, 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    return { ok: r.ok, status: r.status };
  } catch (e) { return { ok: false, error: 'send_error' }; }
}

// Branded email wrapper (Rank Rebels green/gold header).
export function emailShell(inner) {
  return `<!doctype html><html><body style="margin:0;background:#eef3ee;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef3ee;padding:24px 0"><tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 18px 40px -20px rgba(20,50,30,.3)">
      <tr><td style="background:linear-gradient(100deg,#15803d,#1aa251 60%,#c79a1e);padding:22px 28px">
        <div style="color:#fff;font-size:20px;font-weight:800">Rank<span style="opacity:.92">Rebels</span></div>
        <div style="color:#eafce9;font-size:12px;margin-top:2px">Master Service Agreement</div>
      </td></tr>
      ${inner}
      <tr><td style="padding:18px 28px 26px;text-align:center;color:#77857c;font-size:12px">Rank Rebels · sales@rankrebels.ai · 808-265-5339</td></tr>
    </table></td></tr></table></body></html>`;
}
