// POST /api/audit   { url, industry? }     (also accepts GET ?url=&industry=)
// Heuristic ADA / WCAG accessibility scan of a public web page, plus an optional
// industry-disclosure check (e.g. contractor license number). Runs entirely inside
// the Pages Function using HTMLRewriter + a regex pass — no headless browser.
//
// HONESTY: automated checks catch only part of WCAG (~30-40%). This is a starting
// score, NOT a certification of compliance. The report says so.

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'content-type',
};
function json(obj, status) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: Object.assign({ 'content-type': 'application/json' }, CORS) });
}
export function onRequestOptions() { return new Response(null, { status: 204, headers: CORS }); }

// ---- SSRF guard: only public http(s) hosts ----
function normalizeUrl(raw) {
  let s = String(raw || '').trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  let u;
  try { u = new URL(s); } catch (e) { return null; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  const h = u.hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.internal') || h.endsWith('.local')) return null;
  if (/^(127\.|10\.|192\.168\.|169\.254\.|::1|0\.0\.0\.0)/.test(h)) return null;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return null;
  if (h === '169.254.169.254') return null; // cloud metadata
  return u;
}

const GENERIC_LINKS = ['click here', 'read more', 'here', 'more', 'learn more', 'this', 'link'];

// Industry disclosure rules (informational; expand over time, with citations).
const INDUSTRY_RULES = {
  electrician: { label: 'Electrician / Contractor', need: 'state license number', why: 'Most states require licensed contractors to display their license number on advertising, including their website (e.g. CA CSLB, AZ ROC).' },
  contractor:  { label: 'Contractor', need: 'state license number', why: 'Most states require licensed contractors to display their license number on advertising/website (e.g. CA CSLB §7030).' },
  plumber:     { label: 'Plumber', need: 'state license number', why: 'Plumbing is a licensed trade in most states; the license number is typically required on advertising.' },
  hvac:        { label: 'HVAC', need: 'state license/registration number', why: 'HVAC contractors are licensed/registered in most states and the number is often required on ads.' },
  roofer:      { label: 'Roofer', need: 'contractor license number', why: 'Roofing usually falls under contractor licensing; the number is typically required on advertising.' },
};
function hasLicense(text) {
  return /\b(lic(?:ense)?\.?\s*(?:no\.?|number|#)?\s*[:#]?\s*[A-Z]{0,3}\s*\d{3,})\b/i.test(text) ||
         /\b(CSLB|ROC|license\s*#|lic#|state\s+license)\b/i.test(text);
}

async function scan(url) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 9000);
  let res;
  try {
    res = await fetch(url.href, { redirect: 'follow', signal: ctrl.signal, headers: { 'user-agent': 'Mozilla/5.0 (compatible; AccessGradeBot/1.0; +https://rankrebels.ai)' } });
  } finally { clearTimeout(to); }
  if (!res.ok) throw new Error('Site returned HTTP ' + res.status);
  const ct = res.headers.get('content-type') || '';
  if (!/text\/html/i.test(ct)) throw new Error('That URL did not return an HTML page.');
  const html = await res.text();

  // --- structural checks via HTMLRewriter ---
  const c = {
    lang: false, title: false, viewport: false,
    imgs: 0, imgsNoAlt: 0,
    controls: 0, controlsNoLabel: 0,
    buttons: 0, buttonsUnnamed: 0,
    h1: 0, headings: 0,
  };
  let curBtnHasText = false;
  const rw = new HTMLRewriter()
    .on('html', { element(e) { const l = e.getAttribute('lang'); if (l && l.trim()) c.lang = true; } })
    .on('title', { text(t) { if (t.text && t.text.trim()) c.title = true; } })
    .on('meta[name="viewport"]', { element() { c.viewport = true; } })
    .on('img', { element(e) { c.imgs++; if (e.getAttribute('alt') === null) c.imgsNoAlt++; } })
    .on('input', { element(e) {
      const type = (e.getAttribute('type') || 'text').toLowerCase();
      if (['hidden', 'submit', 'button', 'image', 'reset'].includes(type)) return;
      c.controls++;
      if (!e.getAttribute('aria-label') && !e.getAttribute('aria-labelledby') && !e.getAttribute('title')) c.controlsNoLabel++;
    } })
    .on('select,textarea', { element(e) {
      c.controls++;
      if (!e.getAttribute('aria-label') && !e.getAttribute('aria-labelledby') && !e.getAttribute('title')) c.controlsNoLabel++;
    } })
    .on('h1', { element() { c.h1++; c.headings++; } })
    .on('h2,h3,h4,h5,h6', { element() { c.headings++; } })
    .on('button', {
      element(e) {
        c.buttons++; curBtnHasText = false;
        if (e.getAttribute('aria-label') && e.getAttribute('aria-label').trim()) curBtnHasText = true;
        e.onEndTag(() => { if (!curBtnHasText) c.buttonsUnnamed++; });
      },
      text(t) { if (t.text && t.text.trim()) curBtnHasText = true; },
    });
  await rw.transform(new Response(html)).text();

  // --- text heuristics via regex on raw HTML ---
  const lower = html.toLowerCase();
  const a11yStatement = /accessibility\s*(statement|policy)|\/accessibility/.test(lower);
  // generic / empty link text
  let linkTotal = 0, linkBad = 0;
  const aRe = /<a\b[^>]*>([\s\S]*?)<\/a>/gi; let m;
  while ((m = aRe.exec(html)) && linkTotal < 4000) {
    const txt = m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
    linkTotal++;
    if (!txt || GENERIC_LINKS.includes(txt)) linkBad++;
  }
  const skipLink = /href=["']#(main|content|maincontent)["']/i.test(html) || /skip to (main )?content/i.test(lower);

  return { c, a11yStatement, linkTotal, linkBad, skipLink, text: html.replace(/<[^>]*>/g, ' ') };
}

function pct(good, total) { return total <= 0 ? 1 : Math.max(0, good / total); }

export async function onRequest(context) {
  const { request } = context;
  if (request.method === 'OPTIONS') return onRequestOptions();
  try {
    let body = {};
    if (request.method === 'POST') body = await request.json().catch(() => ({}));
    const sp = new URL(request.url).searchParams;
    const url = normalizeUrl(body.url || sp.get('url'));
    const industry = String(body.industry || sp.get('industry') || '').toLowerCase().trim();
    if (!url) return json({ error: 'Enter a valid public website URL (e.g. https://example.com).' }, 400);

    const r = await scan(url);
    const c = r.c;

    // weighted categories (sum = 100; full credit when N/A)
    const cats = [];
    function add(key, title, weight, score, detail, wcag, count) {
      cats.push({ key, title, weight, score: Math.round(score * 100) / 100, pass: score >= 0.999, detail, wcag, count: count || 0 });
    }
    add('alt', 'Image alt text', 18, pct(c.imgs - c.imgsNoAlt, c.imgs), c.imgsNoAlt ? (c.imgsNoAlt + ' of ' + c.imgs + ' images have no alt text — screen readers can\'t describe them.') : (c.imgs ? 'All images have alt text.' : 'No images found.'), 'WCAG 1.1.1', c.imgsNoAlt);
    add('forms', 'Form field labels', 14, pct(c.controls - c.controlsNoLabel, c.controls), c.controlsNoLabel ? (c.controlsNoLabel + ' form field(s) may be missing an accessible label.') : (c.controls ? 'Form fields appear labeled.' : 'No form fields found.'), 'WCAG 1.3.1 / 4.1.2', c.controlsNoLabel);
    add('viewport', 'Mobile viewport', 12, c.viewport ? 1 : 0, c.viewport ? 'Responsive viewport tag present.' : 'No mobile viewport tag — the site may not scale on phones.', 'WCAG 1.4.10', c.viewport ? 0 : 1);
    add('lang', 'Page language set', 10, c.lang ? 1 : 0, c.lang ? 'Page language is declared.' : 'No lang attribute on <html> — screen readers may use the wrong pronunciation.', 'WCAG 3.1.1', c.lang ? 0 : 1);
    add('headings', 'Heading structure', 10, c.h1 >= 1 ? (c.headings >= 2 ? 1 : 0.7) : 0, c.h1 >= 1 ? (c.headings >= 2 ? 'Has an H1 and a heading structure.' : 'Has an H1 but little heading structure.') : 'No H1 heading found — hurts structure and SEO.', 'WCAG 1.3.1 / 2.4.6', c.h1 >= 1 ? 0 : 1);
    add('links', 'Link text quality', 10, pct(r.linkTotal - r.linkBad, r.linkTotal), r.linkBad ? (r.linkBad + ' link(s) are empty or use vague text like "click here".') : (r.linkTotal ? 'Link text is descriptive.' : 'No links found.'), 'WCAG 2.4.4', r.linkBad);
    add('buttons', 'Buttons named', 10, pct(c.buttons - c.buttonsUnnamed, c.buttons), c.buttonsUnnamed ? (c.buttonsUnnamed + ' button(s) have no readable name.') : (c.buttons ? 'Buttons have accessible names.' : 'No <button> elements found.'), 'WCAG 4.1.2', c.buttonsUnnamed);
    add('title', 'Page title', 6, c.title ? 1 : 0, c.title ? 'Page has a title.' : 'Missing or empty <title> — needed for orientation & SEO.', 'WCAG 2.4.2', c.title ? 0 : 1);
    add('statement', 'Accessibility statement', 10, r.a11yStatement ? 1 : 0, r.a11yStatement ? 'An accessibility statement/policy was detected.' : 'No accessibility statement found — recommended to show your commitment & contact path.', 'Best practice', r.a11yStatement ? 0 : 1);

    const earned = cats.reduce((a, x) => a + x.weight * x.score, 0);
    const score = Math.round(earned); // out of 100
    const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
    const issues = cats.filter(x => !x.pass).sort((a, b) => (b.weight * (1 - b.score)) - (a.weight * (1 - a.score)));

    // industry disclosure (informational, not in the ADA score)
    let industryCheck = null;
    const rule = INDUSTRY_RULES[industry];
    if (rule) {
      const present = hasLicense(r.text);
      industryCheck = { industry: rule.label, need: rule.need, present, why: rule.why,
        message: present ? ('A license-number-style disclosure was detected.') : ('No ' + rule.need + ' detected on the page. ' + rule.why) };
    }

    return json({
      ok: true, url: url.href, score, grade,
      summary: score >= 80 ? 'Solid foundation with a few fixable gaps.' : score >= 60 ? 'Several accessibility gaps that likely affect real users.' : 'Significant accessibility gaps — high priority to fix.',
      categories: cats, issues, industryCheck,
      passed: cats.filter(x => x.pass).length, total: cats.length,
      disclaimer: 'Automated scan — catches roughly 30–40% of WCAG criteria. A passing score is a starting point, not a guarantee of full ADA compliance. A manual expert review is recommended for full conformance.',
      skipLink: r.skipLink,
    });
  } catch (err) {
    const msg = String(err && err.message || err);
    const friendly = /abort/i.test(msg) ? 'The site took too long to respond.' : msg.slice(0, 200);
    return json({ error: 'Could not scan that site: ' + friendly }, 200);
  }
}
