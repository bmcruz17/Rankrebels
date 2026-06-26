#!/usr/bin/env node
/**
 * Daily blog auto-poster. Generates one on-brand Rank Rebels blog post with Claude
 * and inserts it into the rr_blog_posts table. Runs in CI (GitHub Action).
 *
 * Env required:
 *   ANTHROPIC_API_KEY          (Claude API key)
 *   SUPABASE_SERVICE_ROLE_KEY  (insert the post, bypassing RLS)
 * Optional:
 *   BLOG_MODEL                 (defaults to claude-opus-4-8)
 */

const SUPABASE_URL = 'https://eejmocneacfleltspedl.supabase.co';
const MODEL = process.env.BLOG_MODEL || 'claude-opus-4-8';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!ANTHROPIC_KEY || !SERVICE_KEY) {
  console.error('Missing ANTHROPIC_API_KEY or SUPABASE_SERVICE_ROLE_KEY — skipping.');
  process.exit(0); // don't fail the workflow; just no-op
}

function sbHeaders(extra) {
  return Object.assign({ apikey: SERVICE_KEY, authorization: 'Bearer ' + SERVICE_KEY, 'content-type': 'application/json' }, extra || {});
}
function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

async function recentTitles() {
  try {
    const r = await fetch(SUPABASE_URL + '/rest/v1/rr_blog_posts?select=title&order=published_at.desc&limit=20', { headers: sbHeaders() });
    if (!r.ok) return [];
    return (await r.json()).map(x => x.title);
  } catch { return []; }
}

const PROMPT = (avoid) => `You are the content writer for Rank Rebels (rankrebels.ai), a web design + local SEO + Google Business Profile agency for SMALL local businesses (home services, restaurants, auto, med spas, contractors, etc.).

Brand voice: confident, plain-English, a little rebellious, never corporate. We root for the underdog. Our values: Purpose, Grit, Honesty, Ownership, Vision. We NEVER guarantee specific rankings or "#1 on Google" (SEO has no guarantees) — talk about getting *found*, getting *more calls*, and standing out.

Write ONE genuinely useful blog post a local small-business owner would want to read. Practical, specific, actionable. ~600-850 words. Pick a fresh angle on local SEO, websites, Google Business Profile, reviews, or getting found on AI search.

Do NOT repeat these recent titles: ${avoid.length ? avoid.join(' | ') : '(none yet)'}

Return ONLY a JSON object (no markdown fence, no commentary) with exactly these keys:
{
  "title": "compelling, specific, not clickbait",
  "excerpt": "1-2 sentence summary (<=180 chars)",
  "tags": ["2-4 short tags"],
  "body_html": "the article as clean semantic HTML using only <h2> <h3> <p> <ul> <ol> <li> <strong> <em> <a href> tags. No <h1>, no <script>, no <style>, no inline styles, no images. End with a short call-to-action paragraph inviting a free audit at rankrebels.ai."
}`;

async function generate(avoid) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: 3000, messages: [{ role: 'user', content: PROMPT(avoid) }] }),
  });
  if (!r.ok) throw new Error('Anthropic ' + r.status + ': ' + (await r.text()).slice(0, 300));
  const d = await r.json();
  let text = (d.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  return JSON.parse(text);
}

(async () => {
  const avoid = await recentTitles();
  const post = await generate(avoid);
  if (!post.title || !post.body_html) throw new Error('Generated post missing title/body.');

  const today = new Date().toISOString().slice(0, 10);
  const slug = slugify(post.title) + '-' + today.replace(/-/g, '');
  const rec = {
    slug,
    title: post.title.trim(),
    excerpt: (post.excerpt || '').trim().slice(0, 200),
    body_html: post.body_html,
    tags: Array.isArray(post.tags) ? post.tags.slice(0, 4) : [],
    author: 'Rank Rebels',
    published: true,
  };
  const ins = await fetch(SUPABASE_URL + '/rest/v1/rr_blog_posts', {
    method: 'POST', headers: sbHeaders({ prefer: 'return=representation' }), body: JSON.stringify(rec),
  });
  if (!ins.ok) throw new Error('Insert failed ' + ins.status + ': ' + (await ins.text()).slice(0, 300));
  console.log('Published: ' + rec.title + '  (/blog?slug=' + slug + ')');
})().catch(e => { console.error(String(e && e.message || e)); process.exit(1); });
