// GET /sitemap.xml — lists the homepage, blog, and every location landing page for search engines.
const SITE = 'https://rankrebels.ai';
const METROS = [['New York','NY'],['Los Angeles','CA'],['Chicago','IL'],['Houston','TX'],['Phoenix','AZ'],['Philadelphia','PA'],['San Antonio','TX'],['San Diego','CA'],['Dallas','TX'],['Austin','TX'],['San Jose','CA'],['Jacksonville','FL'],['Columbus','OH'],['Charlotte','NC'],['Indianapolis','IN'],['San Francisco','CA'],['Seattle','WA'],['Denver','CO'],['Nashville','TN'],['Oklahoma City','OK'],['Las Vegas','NV'],['Portland','OR'],['Miami','FL'],['Atlanta','GA'],['Boston','MA'],['Sacramento','CA'],['Kansas City','MO'],['Tampa','FL'],['Salt Lake City','UT'],['Honolulu','HI']];
const STATES = ['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming'];
const cs = (c, a) => c.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + a.toLowerCase();
const ss = n => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export async function onRequestGet() {
  const urls = [SITE + '/', SITE + '/blog', SITE + '/audit.html']
    .concat(METROS.map(([c, a]) => SITE + '/locations/' + cs(c, a)))
    .concat(STATES.map(n => SITE + '/locations/' + ss(n)));
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map(u => `  <url><loc>${u}</loc></url>`).join('\n') + '\n</urlset>';
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=86400' } });
}
