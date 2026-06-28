// GET /locations/<slug>[?lang=xx]  → an indexable, on-brand local landing page for SEO.
//   <slug> = a metro ("los-angeles-ca") or a state ("california"); ?lang renders it in that language.
// Tailored H1/title/meta, local copy, services, internal links, a lead form that drops into the
// pipeline, a language switcher, hreflang alternates, and RTL for Arabic.

const SITE = 'https://rankrebels.ai';
const RR_BOOK = 'https://calendar.app.google/DsZdKoocVMVg2JeA6';
const RR_DEPOSIT = ''; // paste your Stripe deposit Payment Link to enable the "Start now" button

const METROS = [
  ['New York', 'NY'], ['Los Angeles', 'CA'], ['Chicago', 'IL'], ['Houston', 'TX'], ['Phoenix', 'AZ'],
  ['Philadelphia', 'PA'], ['San Antonio', 'TX'], ['San Diego', 'CA'], ['Dallas', 'TX'], ['Austin', 'TX'],
  ['San Jose', 'CA'], ['Jacksonville', 'FL'], ['Columbus', 'OH'], ['Charlotte', 'NC'], ['Indianapolis', 'IN'],
  ['San Francisco', 'CA'], ['Seattle', 'WA'], ['Denver', 'CO'], ['Nashville', 'TN'], ['Oklahoma City', 'OK'],
  ['Las Vegas', 'NV'], ['Portland', 'OR'], ['Miami', 'FL'], ['Atlanta', 'GA'], ['Boston', 'MA'],
  ['Sacramento', 'CA'], ['Kansas City', 'MO'], ['Tampa', 'FL'], ['Salt Lake City', 'UT'], ['Honolulu', 'HI']
];
const STATES = [
  ['Alabama', 'AL'], ['Alaska', 'AK'], ['Arizona', 'AZ'], ['Arkansas', 'AR'], ['California', 'CA'], ['Colorado', 'CO'],
  ['Connecticut', 'CT'], ['Delaware', 'DE'], ['Florida', 'FL'], ['Georgia', 'GA'], ['Hawaii', 'HI'], ['Idaho', 'ID'],
  ['Illinois', 'IL'], ['Indiana', 'IN'], ['Iowa', 'IA'], ['Kansas', 'KS'], ['Kentucky', 'KY'], ['Louisiana', 'LA'],
  ['Maine', 'ME'], ['Maryland', 'MD'], ['Massachusetts', 'MA'], ['Michigan', 'MI'], ['Minnesota', 'MN'], ['Mississippi', 'MS'],
  ['Missouri', 'MO'], ['Montana', 'MT'], ['Nebraska', 'NE'], ['Nevada', 'NV'], ['New Hampshire', 'NH'], ['New Jersey', 'NJ'],
  ['New Mexico', 'NM'], ['New York', 'NY'], ['North Carolina', 'NC'], ['North Dakota', 'ND'], ['Ohio', 'OH'], ['Oklahoma', 'OK'],
  ['Oregon', 'OR'], ['Pennsylvania', 'PA'], ['Rhode Island', 'RI'], ['South Carolina', 'SC'], ['South Dakota', 'SD'], ['Tennessee', 'TN'],
  ['Texas', 'TX'], ['Utah', 'UT'], ['Vermont', 'VT'], ['Virginia', 'VA'], ['Washington', 'WA'], ['West Virginia', 'WV'],
  ['Wisconsin', 'WI'], ['Wyoming', 'WY']
];

const LANGS = [['en', 'English', 'ltr'], ['es', 'Español', 'ltr'], ['zh', '中文', 'ltr'], ['vi', 'Tiếng Việt', 'ltr'], ['tl', 'Tagalog', 'ltr'], ['fr', 'Français', 'ltr'], ['ar', 'العربية', 'rtl']];

// {place} = "City, ST" or "State"; {x} = city or state name. en is the source / fallback.
const LOC = {
  serving:   { en: 'Serving {place}', es: 'Servicios en {place}', zh: '服务于 {place}', vi: 'Phục vụ {place}', tl: 'Naglilingkod sa {place}', fr: 'Au service de {place}', ar: 'نخدم {place}' },
  h1:        { en: 'Web Design & SEO in {place}', es: 'Diseño web y SEO en {place}', zh: '{place} 的网站设计与 SEO', vi: 'Thiết kế web & SEO tại {place}', tl: 'Web Design at SEO sa {place}', fr: 'Création de site & SEO à {place}', ar: 'تصميم مواقع و SEO في {place}' },
  heroP:     { en: 'Custom-built websites, SEO, and Google Business Profile management for {x} businesses that want to get found — on Google, in the Map pack, and when customers ask AI for a recommendation.', es: 'Sitios web a medida, SEO y gestión del Perfil de Google Business para negocios de {x} que quieren que los encuentren — en Google, en el paquete de mapas y cuando los clientes le piden recomendaciones a la IA.', zh: '为 {x} 的企业打造定制网站、SEO 和 Google 商家资料管理——让你在 Google、地图栏，以及客户向 AI 寻求推荐时被发现。', vi: 'Trang web tùy chỉnh, SEO và quản lý Hồ sơ Google Business cho các doanh nghiệp tại {x} muốn được tìm thấy — trên Google, trong Map pack và khi khách hàng hỏi AI để được giới thiệu.', tl: 'Custom na website, SEO, at pamamahala ng Google Business Profile para sa mga negosyo sa {x} na gustong matagpuan — sa Google, sa Map pack, at kapag humihingi ng rekomendasyon ang mga customer sa AI.', fr: 'Sites web sur mesure, SEO et gestion du profil Google Business pour les entreprises de {x} qui veulent être trouvées — sur Google, dans le pack local et quand les clients demandent une recommandation à l’IA.', ar: 'مواقع مخصّصة و SEO وإدارة الملف التجاري على Google لشركات {x} التي تريد أن يُعثر عليها — على Google وفي حزمة الخرائط وعندما يطلب العملاء توصية من الذكاء الاصطناعي.' },
  audit:     { en: 'Free audit', es: 'Auditoría gratis', zh: '免费诊断', vi: 'Đánh giá miễn phí', tl: 'Libreng audit', fr: 'Audit gratuit', ar: 'تدقيق مجاني' },
  getAudit:  { en: 'Get your free audit →', es: 'Obtén tu auditoría gratis →', zh: '获取免费诊断 →', vi: 'Nhận đánh giá miễn phí →', tl: 'Kunin ang libreng audit →', fr: 'Obtenez votre audit gratuit →', ar: 'احصل على تدقيقك المجاني →' },
  whyKick:   { en: 'Why {x} businesses choose us', es: 'Por qué los negocios de {x} nos eligen', zh: '{x} 的企业为何选择我们', vi: 'Vì sao doanh nghiệp {x} chọn chúng tôi', tl: 'Bakit pinipili kami ng mga negosyo sa {x}', fr: 'Pourquoi les entreprises de {x} nous choisissent', ar: 'لماذا تختارنا شركات {x}' },
  whyH2:     { en: 'Show up first when locals search', es: 'Aparece primero cuando buscan en tu zona', zh: '当本地人搜索时，第一个出现', vi: 'Xuất hiện đầu tiên khi người dân địa phương tìm kiếm', tl: 'Lumitaw nang una kapag naghahanap ang mga lokal', fr: 'Apparaissez en premier dans les recherches locales', ar: 'اظهر أولاً عندما يبحث سكان منطقتك' },
  whyLead:   { en: 'Most {x} customers Google a business before they ever call. We make sure that when they do, you’re the professional, modern, trustworthy result they pick — not the competitor with the old site.', es: 'La mayoría de los clientes de {x} buscan en Google antes de llamar. Nos aseguramos de que, cuando lo hagan, tú seas el resultado profesional, moderno y confiable que eligen, no el competidor con el sitio viejo.', zh: '{x} 的大多数客户在打电话前都会先 Google。我们确保当他们搜索时，你就是那个被选中的专业、现代、值得信赖的结果——而不是那个网站老旧的竞争对手。', vi: 'Hầu hết khách hàng ở {x} đều tìm trên Google trước khi gọi. Chúng tôi đảm bảo khi họ tìm, bạn là kết quả chuyên nghiệp, hiện đại, đáng tin mà họ chọn — không phải đối thủ với trang web cũ.', tl: 'Karamihan ng customer sa {x} ay nag-Google ng negosyo bago tumawag. Sinisiguro namin na kapag ginawa nila ito, ikaw ang propesyonal, moderno, at mapagkakatiwalaang resulta na pipiliin nila — hindi ang kakumpitensyang may lumang site.', fr: 'La plupart des clients de {x} cherchent sur Google avant d’appeler. Nous faisons en sorte que, lorsqu’ils le font, vous soyez le résultat professionnel, moderne et fiable qu’ils choisissent — pas le concurrent au vieux site.', ar: 'معظم عملاء {x} يبحثون على Google قبل أن يتصلوا. نحرص على أن تكون أنت — عند بحثهم — النتيجة المهنية والعصرية والموثوقة التي يختارونها، لا المنافس صاحب الموقع القديم.' },
  s1t:       { en: 'Custom websites', es: 'Sitios web a medida', zh: '定制网站', vi: 'Trang web tùy chỉnh', tl: 'Custom na website', fr: 'Sites sur mesure', ar: 'مواقع مخصّصة' },
  s1p:       { en: 'Fast, mobile-first sites built for your {x} business — designed to turn visitors into booked jobs.', es: 'Sitios rápidos y pensados para móvil, hechos para tu negocio de {x}, diseñados para convertir visitas en trabajos agendados.', zh: '为你在 {x} 的业务打造的快速、移动优先网站——旨在把访客变成预约订单。', vi: 'Trang web nhanh, ưu tiên di động cho doanh nghiệp {x} của bạn — được thiết kế để biến khách truy cập thành đơn đặt.', tl: 'Mabilis, mobile-first na site para sa negosyo mo sa {x} — ginawa para gawing booking ang mga bisita.', fr: 'Des sites rapides et pensés mobile pour votre entreprise de {x} — conçus pour transformer les visiteurs en clients.', ar: 'مواقع سريعة ومُصمّمة للجوال أولاً لنشاطك في {x} — لتحويل الزوّار إلى حجوزات.' },
  s2t:       { en: 'SEO & AI search', es: 'SEO y búsqueda con IA', zh: 'SEO 与 AI 搜索', vi: 'SEO & tìm kiếm AI', tl: 'SEO at AI search', fr: 'SEO & recherche IA', ar: 'SEO وبحث الذكاء الاصطناعي' },
  s2p:       { en: 'Engineered to rank on Google and surface when people ask ChatGPT and AI for a local recommendation.', es: 'Diseñado para posicionar en Google y aparecer cuando la gente le pide a ChatGPT y a la IA una recomendación local.', zh: '专为在 Google 排名而打造，并在人们向 ChatGPT 和 AI 寻求本地推荐时出现。', vi: 'Được thiết kế để xếp hạng trên Google và xuất hiện khi mọi người hỏi ChatGPT và AI để được giới thiệu địa phương.', tl: 'Ginawa para mag-rank sa Google at lumitaw kapag humihingi ng lokal na rekomendasyon ang mga tao sa ChatGPT at AI.', fr: 'Conçu pour se classer sur Google et apparaître quand on demande une recommandation locale à ChatGPT et à l’IA.', ar: 'مُصمّم ليتصدّر في Google ويظهر عندما يطلب الناس توصية محلية من ChatGPT والذكاء الاصطناعي.' },
  s3t:       { en: 'Google Business Profile', es: 'Perfil de Google Business', zh: 'Google 商家资料', vi: 'Hồ sơ Google Business', tl: 'Google Business Profile', fr: 'Profil Google Business', ar: 'الملف التجاري على Google' },
  s3p:       { en: 'We set up and manage your listing to win the {place} Map pack and drive calls, directions & reviews.', es: 'Configuramos y gestionamos tu ficha para ganar el paquete de mapas de {place} y generar llamadas, indicaciones y reseñas.', zh: '我们设置并管理你的商家信息，赢得 {place} 的地图栏，并带来来电、导航和评价。', vi: 'Chúng tôi thiết lập và quản lý hồ sơ của bạn để chiến thắng Map pack {place} và tạo cuộc gọi, chỉ đường & đánh giá.', tl: 'Ise-set up at pamamahalaan namin ang listing mo para manalo sa Map pack ng {place} at magdala ng tawag, direksyon at review.', fr: 'Nous créons et gérons votre fiche pour gagner le pack local de {place} et générer appels, itinéraires et avis.', ar: 'نُنشئ ونُدير بطاقتك للفوز بحزمة خرائط {place} وجلب المكالمات والاتجاهات والتقييمات.' },
  readyH2:   { en: 'Ready to stand out in {place}?', es: '¿Listo para destacar en {place}?', zh: '准备好在 {place} 脱颖而出了吗？', vi: 'Sẵn sàng nổi bật tại {place}?', tl: 'Handa nang tumayo sa {place}?', fr: 'Prêt à vous démarquer à {place} ?', ar: 'مستعدّ للتميّز في {place}؟' },
  auditLead: { en: 'Tell us about your business and we’ll send a free, no-pressure audit of your site and search presence within 24 hours.', es: 'Cuéntanos sobre tu negocio y te enviaremos una auditoría gratuita y sin compromiso de tu sitio y tu presencia en buscadores en menos de 24 horas.', zh: '告诉我们你的业务，我们将在 24 小时内免费、无压力地为你的网站和搜索表现做一份诊断。', vi: 'Hãy cho chúng tôi biết về doanh nghiệp của bạn và chúng tôi sẽ gửi đánh giá miễn phí, không áp lực trong vòng 24 giờ.', tl: 'Sabihin sa amin ang tungkol sa negosyo mo at magpapadala kami ng libre, walang-presyur na audit sa loob ng 24 oras.', fr: 'Parlez-nous de votre entreprise et nous vous enverrons un audit gratuit et sans engagement sous 24 heures.', ar: 'أخبِرنا عن نشاطك التجاري وسنرسل تدقيقًا مجانيًا وبلا ضغط خلال 24 ساعة.' },
  fName:     { en: 'Your name', es: 'Tu nombre', zh: '你的姓名', vi: 'Tên của bạn', tl: 'Pangalan mo', fr: 'Votre nom', ar: 'اسمك' },
  fBiz:      { en: 'Business name', es: 'Nombre del negocio', zh: '企业名称', vi: 'Tên doanh nghiệp', tl: 'Pangalan ng negosyo', fr: 'Nom de l’entreprise', ar: 'اسم النشاط التجاري' },
  fEmail:    { en: 'Email', es: 'Correo electrónico', zh: '电子邮箱', vi: 'Email', tl: 'Email', fr: 'E-mail', ar: 'البريد الإلكتروني' },
  fPhone:    { en: 'Phone (optional)', es: 'Teléfono (opcional)', zh: '电话（可选）', vi: 'Điện thoại (tùy chọn)', tl: 'Telepono (opsyonal)', fr: 'Téléphone (facultatif)', ar: 'الهاتف (اختياري)' },
  fMsg:      { en: 'What do you need? (new site, redesign, more leads…)', es: '¿Qué necesitas? (sitio nuevo, rediseño, más clientes…)', zh: '你需要什么？（新网站、改版、更多客户……）', vi: 'Bạn cần gì? (trang mới, thiết kế lại, thêm khách…)', tl: 'Ano ang kailangan mo? (bagong site, redesign, mas maraming lead…)', fr: 'De quoi avez-vous besoin ? (nouveau site, refonte, plus de clients…)', ar: 'ماذا تحتاج؟ (موقع جديد، إعادة تصميم، عملاء أكثر…)' },
  fSubmit:   { en: 'Get my free audit →', es: 'Quiero mi auditoría gratis →', zh: '获取我的免费诊断 →', vi: 'Nhận đánh giá miễn phí của tôi →', tl: 'Kunin ang libreng audit ko →', fr: 'Obtenir mon audit gratuit →', ar: 'احصل على تدقيقي المجاني →' },
  fOk:       { en: '✓ Got it. We’ll be in touch within 24 hours.', es: '✓ Recibido. Nos pondremos en contacto en menos de 24 horas.', zh: '✓ 已收到。我们将在 24 小时内联系你。', vi: '✓ Đã nhận. Chúng tôi sẽ liên hệ trong vòng 24 giờ.', tl: '✓ Natanggap. Makikipag-ugnayan kami sa loob ng 24 oras.', fr: '✓ Bien reçu. Nous vous contacterons sous 24 heures.', ar: '✓ تمّ الاستلام. سنتواصل معك خلال 24 ساعة.' },
  nearMetro: { en: 'Nearby areas', es: 'Zonas cercanas', zh: '周边地区', vi: 'Khu vực lân cận', tl: 'Mga kalapit na lugar', fr: 'Zones à proximité', ar: 'المناطق القريبة' },
  nearState: { en: 'Cities in {x}', es: 'Ciudades de {x}', zh: '{x} 的城市', vi: 'Các thành phố ở {x}', tl: 'Mga lungsod sa {x}', fr: 'Villes de {x}', ar: 'مدن {x}' },
  serveH2:   { en: 'We serve businesses across {x}', es: 'Damos servicio a negocios en todo {x}', zh: '我们服务于 {x} 各地的企业', vi: 'Chúng tôi phục vụ doanh nghiệp khắp {x}', tl: 'Naglilingkod kami sa mga negosyo sa buong {x}', fr: 'Nous servons les entreprises dans tout {x}', ar: 'نخدم الشركات في جميع أنحاء {x}' },
  seeAll:    { en: 'See all of {x} →', es: 'Ver todo {x} →', zh: '查看全部 {x} →', vi: 'Xem toàn bộ {x} →', tl: 'Tingnan ang buong {x} →', fr: 'Voir tout {x} →', ar: 'عرض كل {x} →' },
  allStates: { en: 'All states', es: 'Todos los estados', zh: '所有州', vi: 'Tất cả các bang', tl: 'Lahat ng estado', fr: 'Tous les États', ar: 'كل الولايات' },
  footSuffix:{ en: 'Serving {place} and beyond.', es: 'Damos servicio en {place} y más allá.', zh: '服务于 {place} 及周边。', vi: 'Phục vụ {place} và hơn thế.', tl: 'Naglilingkod sa {place} at higit pa.', fr: 'Au service de {place} et au-delà.', ar: 'نخدم {place} وما حولها.' },
  fHome:     { en: 'Home', es: 'Inicio', zh: '首页', vi: 'Trang chủ', tl: 'Home', fr: 'Accueil', ar: 'الرئيسية' },
  fPrivacy:  { en: 'Privacy', es: 'Privacidad', zh: '隐私', vi: 'Quyền riêng tư', tl: 'Privacy', fr: 'Confidentialité', ar: 'الخصوصية' },
  getStarted:{ en: 'Get started', es: 'Empieza', zh: '开始', vi: 'Bắt đầu', tl: 'Magsimula', fr: 'Commencer', ar: 'ابدأ' },
  claimSpot: { en: 'Ready to claim your spot in {place}?', es: '¿Listo para reservar tu lugar en {place}?', zh: '准备好在 {place} 占据你的位置了吗？', vi: 'Sẵn sàng giữ chỗ của bạn tại {place}?', tl: 'Handa nang angkinin ang lugar mo sa {place}?', fr: 'Prêt à réserver votre place à {place} ?', ar: 'مستعدّ لحجز مكانك في {place}؟' },
  bookTitle: { en: 'Book a free strategy call', es: 'Reserva una llamada estratégica gratis', zh: '预约免费策略通话', vi: 'Đặt lịch gọi tư vấn miễn phí', tl: 'Mag-book ng libreng strategy call', fr: 'Réservez un appel stratégique gratuit', ar: 'احجز مكالمة استراتيجية مجانية' },
  bookP:     { en: 'Grab a time and we’ll map out a plan to get your {x} business more customers — no pressure.', es: 'Elige un horario y trazaremos un plan para conseguirle más clientes a tu negocio de {x}, sin compromiso.', zh: '选个时间，我们将为你在 {x} 的业务制定一个吸引更多客户的方案——毫无压力。', vi: 'Chọn một thời gian và chúng tôi sẽ lên kế hoạch để mang về nhiều khách hơn cho doanh nghiệp {x} của bạn — không áp lực.', tl: 'Pumili ng oras at gagawa kami ng plano para sa mas maraming customer ng negosyo mo sa {x} — walang presyur.', fr: 'Choisissez un créneau et nous établirons un plan pour amener plus de clients à votre entreprise de {x} — sans engagement.', ar: 'اختر وقتًا وسنضع خطة لجلب المزيد من العملاء لنشاطك في {x} — دون أي ضغط.' },
  pickTime:  { en: 'Pick a time →', es: 'Elegir un horario →', zh: '选择时间 →', vi: 'Chọn thời gian →', tl: 'Pumili ng oras →', fr: 'Choisir un créneau →', ar: 'اختر وقتًا →' },
  reserveT:  { en: 'Reserve your build', es: 'Reserva tu proyecto', zh: '预订你的项目', vi: 'Giữ chỗ dự án của bạn', tl: 'I-reserve ang iyong build', fr: 'Réservez votre projet', ar: 'احجز مشروعك' },
  reserveP:  { en: 'Ready to roll? Put down your onboarding deposit and we’ll start this week — applied straight to your project.', es: '¿Listo para arrancar? Deja tu depósito de incorporación y empezamos esta semana, se aplica directo a tu proyecto.', zh: '准备好了吗？支付启动定金，我们本周就开始——定金直接抵扣到你的项目。', vi: 'Sẵn sàng chưa? Đặt cọc khởi tạo và chúng tôi bắt đầu trong tuần này — trừ thẳng vào dự án của bạn.', tl: 'Handa na? Maglagay ng onboarding deposit at magsisimula kami ngayong linggo — ibabawas mismo sa proyekto mo.', fr: 'Prêt à démarrer ? Versez votre acompte et nous commençons cette semaine — déduit directement de votre projet.', ar: 'مستعدّ للانطلاق؟ ادفع عربون البدء وسنبدأ هذا الأسبوع — يُحتسب مباشرة ضمن مشروعك.' },
  startNow:  { en: 'Start now →', es: 'Empezar ahora →', zh: '立即开始 →', vi: 'Bắt đầu ngay →', tl: 'Magsimula na →', fr: 'Commencer maintenant →', ar: 'ابدأ الآن →' }
};

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function citySlug(city, abbr) { return city.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + abbr.toLowerCase(); }
function stateSlug(name) { return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
const stateName = abbr => (STATES.find(s => s[1] === abbr) || [abbr])[0];

export function listLocationUrls() {
  return [].concat(METROS.map(([c, a]) => SITE + '/locations/' + citySlug(c, a)), STATES.map(([n]) => SITE + '/locations/' + stateSlug(n)));
}

export async function onRequestGet({ params, request }) {
  const slug = (params.slug || '').toLowerCase();
  const metro = METROS.find(([c, a]) => citySlug(c, a) === slug);
  const state = STATES.find(([n]) => stateSlug(n) === slug);
  if (!metro && !state) return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain' } });

  const reqUrl = new URL(request.url);
  let lang = (reqUrl.searchParams.get('lang') || 'en').toLowerCase();
  const langRow = LANGS.find(l => l[0] === lang) || LANGS[0];
  lang = langRow[0];
  const dir = langRow[2];

  const isMetro = !!metro;
  const city = isMetro ? metro[0] : '';
  const abbr = isMetro ? metro[1] : state[1];
  const stName = isMetro ? stateName(abbr) : state[0];
  const place = isMetro ? `${city}, ${abbr}` : stName;
  const x = isMetro ? city : stName;
  const vars = { place, x };
  const t = (key) => ((LOC[key] && (LOC[key][lang] || LOC[key].en)) || '').replace(/\{(\w+)\}/g, (m, k) => vars[k] != null ? vars[k] : '');

  const title = `${t('h1').replace(/<[^>]+>/g, '')} | Rank Rebels`;
  const desc = t('heroP').replace(/<[^>]+>/g, '').slice(0, 300);
  const path = '/locations/' + slug;
  const url = SITE + path;
  const langQ = (code) => path + (code === 'en' ? '' : ('?lang=' + code));

  const q = lang === 'en' ? '' : '?lang=' + lang;
  const sameStateMetros = METROS.filter(([c, a]) => a === abbr && c !== city);
  const otherLinks = (isMetro ? (sameStateMetros.length ? sameStateMetros : METROS.slice(0, 8).filter(m => m[0] !== city)) : METROS.filter(([c, a]) => a === abbr))
    .map(([c, a]) => `<a href="/locations/${citySlug(c, a)}${q}">${esc(c)}, ${esc(a)}</a>`).join('');
  const stateLinks = STATES.map(([n]) => `<a href="/locations/${stateSlug(n)}${lang === 'en' ? '' : '?lang=' + lang}">${esc(n)}</a>`).join('');
  const stateLink = isMetro ? `<a href="/locations/${stateSlug(stName)}${lang === 'en' ? '' : '?lang=' + lang}">${esc(t('seeAll'))}</a>` : '';

  const hreflang = LANGS.map(l => `<link rel="alternate" hreflang="${l[0]}" href="${SITE}${langQ(l[0])}">`).join('') + `<link rel="alternate" hreflang="x-default" href="${url}">`;
  const switcher = `<select onchange="location.href=this.value" aria-label="Language" style="font:inherit;font-size:13px;font-weight:600;color:var(--ink);background:#fff;border:1px solid var(--line);border-radius:9px;padding:8px 10px;cursor:pointer">` +
    LANGS.map(l => `<option value="${SITE}${langQ(l[0])}"${l[0] === lang ? ' selected' : ''}>${l[1]}</option>`).join('') + `</select>`;

  const body = `<!doctype html><html lang="${lang}" dir="${dir}"><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
<link rel="icon" href="/brand/icon-32.png">
${hreflang}
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(url)}">
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'ProfessionalService', name: 'Rank Rebels', description: desc, areaServed: place, url, telephone: '+1-808-265-5339', priceRange: '$$', serviceType: ['Web Design', 'SEO', 'Google Business Profile Management'] })}</script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{--brand:#15803d;--gold:#c79a1e;--ink:#11201a;--muted:#5f6f66;--line:#e6ece8;--soft:#f5f8f6}
body{font-family:'Plus Jakarta Sans',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:var(--ink);line-height:1.6;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
.wrap{max-width:1080px;margin:0 auto;padding:0 24px}
.nav{position:sticky;top:0;z-index:50;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 24px;background:rgba(255,255,255,.9);backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}
.nav .brand{display:flex;align-items:center;gap:9px;font-weight:800;font-size:18px}
.nav .brand img{width:30px;height:30px;border-radius:7px}
.nav .brand b{color:var(--brand)}
.nav .right{display:flex;align-items:center;gap:10px}
.nav .ncta{background:var(--brand);color:#fff;font-weight:700;font-size:14px;padding:9px 18px;border-radius:10px;white-space:nowrap}
.hero{background:linear-gradient(160deg,#0d1512,#15201a);color:#fff;padding:70px 0 60px}
.hero .eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;letter-spacing:.16em;text-transform:uppercase;font-weight:700;color:#7CFFB0;margin-bottom:16px}
.hero h1{font-size:clamp(30px,5.2vw,52px);font-weight:800;letter-spacing:-.025em;line-height:1.08;max-width:18ch}
.hero p{font-size:clamp(16px,2.2vw,20px);margin-top:18px;max-width:60ch;color:#c7d6cd}
.hero .btns{display:flex;gap:12px;flex-wrap:wrap;margin-top:30px}
.btn{display:inline-flex;align-items:center;gap:8px;background:var(--brand);color:#fff;font-weight:700;font-size:16px;padding:14px 28px;border-radius:12px;border:0;cursor:pointer}
.btn.o{background:transparent;border:1px solid rgba(255,255,255,.3);color:#fff}
section{padding:60px 0}
.kick{font-size:12.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--brand);font-weight:800;margin-bottom:10px}
h2{font-size:clamp(24px,3.4vw,36px);font-weight:800;letter-spacing:-.02em;line-height:1.15}
.lead{font-size:17px;color:var(--muted);max-width:64ch;margin-top:14px}
.svcs{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px;margin-top:30px}
.svc{border:1px solid var(--line);border-radius:16px;padding:24px;background:#fff}
.svc .i{font-size:24px}.svc h3{font-size:18px;margin:10px 0 6px}.svc p{font-size:14px;color:var(--muted)}
.soft{background:var(--soft)}
.links{display:flex;flex-wrap:wrap;gap:8px 10px;margin-top:18px}
.links a{font-size:13.5px;color:var(--brand);background:#fff;border:1px solid var(--line);padding:7px 12px;border-radius:999px}
.links a:hover{border-color:var(--brand)}
.form{background:#fff;border:1px solid var(--line);border-radius:18px;padding:26px;max-width:560px;margin:0 auto;box-shadow:0 24px 50px -30px rgba(20,50,30,.3)}
.form .row{display:flex;gap:12px;flex-wrap:wrap}
.form input,.form textarea{flex:1;min-width:160px;width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:10px;font:inherit;margin-bottom:12px}
.form button{width:100%;justify-content:center}
.start-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;max-width:820px;margin:30px auto 0}
.start-grid.solo{grid-template-columns:1fr;max-width:430px}
.start-card{border:1px solid var(--line);border-radius:18px;padding:28px 24px;text-align:center;background:#fff}
.start-card.hl-card{border-color:var(--brand);box-shadow:0 24px 50px -30px rgba(21,128,61,.4)}
.start-card .e{font-size:32px}.start-card h3{font-size:19px;margin:10px 0 6px}.start-card p{font-size:14px;color:var(--muted);margin-bottom:18px}
.btn.ob{background:transparent;border:1px solid var(--brand);color:var(--brand)}
@media(max-width:560px){.start-grid{grid-template-columns:1fr}}
footer{background:#0a0f0c;color:#9fb3a8;text-align:center;padding:40px 24px;font-size:13px}
footer a{color:#7CFFB0}
html[dir=rtl] .hero h1,html[dir=rtl] .lead{margin-left:auto}
@media(max-width:640px){.hero{padding:50px 0 44px}.nav .brand{font-size:16px}}
</style>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</head><body>
<div class="nav"><a class="brand" href="/"><img src="/brand/rr-mark.png" alt="Rank Rebels"> Rank<b>Rebels</b></a><div class="right">${switcher}<a class="ncta" href="#audit">${esc(t('audit'))}</a></div></div>
<header class="hero"><div class="wrap">
  <div class="eyebrow">● ${esc(t('serving'))}</div>
  <h1>${esc(t('h1'))}</h1>
  <p>${esc(t('heroP'))}</p>
  <div class="btns"><a class="btn" href="#audit">${esc(t('getAudit'))}</a><a class="btn o" href="tel:+18082655339">📞 (808) 265-5339</a></div>
</div></header>

<section><div class="wrap">
  <div class="kick">${esc(t('whyKick'))}</div>
  <h2>${esc(t('whyH2'))}</h2>
  <p class="lead">${esc(t('whyLead'))}</p>
  <div class="svcs">
    <div class="svc"><div class="i">🛠️</div><h3>${esc(t('s1t'))}</h3><p>${esc(t('s1p'))}</p></div>
    <div class="svc"><div class="i">🔎</div><h3>${esc(t('s2t'))}</h3><p>${esc(t('s2p'))}</p></div>
    <div class="svc"><div class="i">📍</div><h3>${esc(t('s3t'))}</h3><p>${esc(t('s3p'))}</p></div>
  </div>
</div></section>

<section><div class="wrap">
  <div style="text-align:center;margin-bottom:6px"><div class="kick">${esc(t('getStarted'))}</div><h2>${esc(t('claimSpot'))}</h2></div>
  <div class="start-grid${RR_DEPOSIT ? '' : ' solo'}">
    <div class="start-card"><div class="e">📅</div><h3>${esc(t('bookTitle'))}</h3><p>${esc(t('bookP'))}</p><a class="btn ob" href="${esc(RR_BOOK)}" target="_blank" rel="noopener">${esc(t('pickTime'))}</a></div>
    ${RR_DEPOSIT ? `<div class="start-card hl-card"><div class="e">🚀</div><h3>${esc(t('reserveT'))}</h3><p>${esc(t('reserveP'))}</p><a class="btn" href="${esc(RR_DEPOSIT)}" target="_blank" rel="noopener">${esc(t('startNow'))}</a></div>` : ''}
  </div>
</div></section>

<section class="soft" id="audit"><div class="wrap">
  <div style="text-align:center;margin-bottom:26px"><div class="kick">${esc(t('audit'))}</div><h2>${esc(t('readyH2'))}</h2><p class="lead" style="margin:14px auto 0">${esc(t('auditLead'))}</p></div>
  <form class="form" onsubmit="return submitLead(event)">
    <div class="row"><input required name="name" placeholder="${esc(t('fName'))}"><input required name="business" placeholder="${esc(t('fBiz'))}"></div>
    <div class="row"><input required type="email" name="email" placeholder="${esc(t('fEmail'))}"><input name="phone" placeholder="${esc(t('fPhone'))}"></div>
    <textarea name="message" rows="3" placeholder="${esc(t('fMsg'))}"></textarea>
    <button class="btn" type="submit">${esc(t('fSubmit'))}</button>
    <p id="fm" style="display:none;text-align:center;color:var(--brand);font-size:14px;margin-top:10px">${esc(t('fOk'))}</p>
  </form>
</div></section>

<section><div class="wrap">
  <div class="kick">${esc(isMetro ? t('nearMetro') : t('nearState'))}</div>
  <h2>${esc(t('serveH2'))}</h2>
  <div class="links">${otherLinks || stateLinks}</div>
  ${stateLink ? `<p style="margin-top:16px;font-size:14px;color:var(--muted)">${stateLink}</p>` : ''}
  <div class="kick" style="margin-top:34px">${esc(t('allStates'))}</div>
  <div class="links">${stateLinks}</div>
</div></section>

<footer>© <span id="y"></span> RankRebels.AI LLC · <a href="/">${esc(t('fHome'))}</a> · <a href="/privacy">${esc(t('fPrivacy'))}</a> · ${esc(t('footSuffix'))}</footer>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
document.getElementById('y').textContent=new Date().getFullYear();
var sb=window.supabase.createClient('https://eejmocneacfleltspedl.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlam1vY25lYWNmbGVsdHNwZWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyNDQ3MTMsImV4cCI6MjA5NzgyMDcxM30.dXJTMFp_d9JRlXkesVPCUj6tBi3qphxxOu3v-Cuw7_Y');
async function submitLead(e){e.preventDefault();var f=e.target;var rec={business_name:f.business.value,contact_name:f.name.value,email:f.email.value,phone:f.phone.value||null,stage:'lead',acquired_by:'website',notes:'Inbound lead from ${esc(place)} landing page'+(f.message.value?(' — '+f.message.value):'')};try{var r=await sb.from('rr_clients').insert(rec);if(r.error)throw r.error;f.reset();document.getElementById('fm').style.display='block';}catch(err){alert('Sorry, something went wrong — please email sales@rankrebels.ai');}return false;}
</script>
</body></html>`;
  return new Response(body, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}
