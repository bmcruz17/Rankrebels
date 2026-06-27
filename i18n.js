/* Rank Rebels — homepage internationalization.
   Text-keyed runtime: each translatable element's English text is the key; values may contain
   inline markup (e.g. <span class="hl">). Strings with no translation gracefully stay English.
   Adds a language switcher, persists the choice, and sets <html lang>/<html dir> (RTL for Arabic). */
(function () {
  var LANGS = [
    { code: 'en', native: 'English',   dir: 'ltr' },
    { code: 'es', native: 'Español',   dir: 'ltr' },
    { code: 'zh', native: '中文',       dir: 'ltr' },
    { code: 'vi', native: 'Tiếng Việt', dir: 'ltr' },
    { code: 'tl', native: 'Tagalog',   dir: 'ltr' },
    { code: 'fr', native: 'Français',  dir: 'ltr' },
    { code: 'ar', native: 'العربية',    dir: 'rtl' }
  ];

  // English key -> { es, zh, vi, tl, fr, ar }
  var T = {
    // ---- nav ----
    'Services': { es:'Servicios', zh:'服务', vi:'Dịch vụ', tl:'Mga Serbisyo', fr:'Services', ar:'الخدمات' },
    'Process': { es:'Proceso', zh:'流程', vi:'Quy trình', tl:'Proseso', fr:'Processus', ar:'العملية' },
    'Areas': { es:'Zonas', zh:'服务地区', vi:'Khu vực', tl:'Mga Lugar', fr:'Régions', ar:'المناطق' },
    'Our Why': { es:'Nuestro porqué', zh:'我们的理念', vi:'Lý do của chúng tôi', tl:'Ang Aming Layunin', fr:'Notre raison d’être', ar:'لماذا نحن' },
    'Reviews': { es:'Reseñas', zh:'评价', vi:'Đánh giá', tl:'Mga Review', fr:'Avis', ar:'التقييمات' },
    'Blog': { es:'Blog', zh:'博客', vi:'Blog', tl:'Blog', fr:'Blog', ar:'المدوّنة' },
    'FAQ': { es:'Preguntas frecuentes', zh:'常见问题', vi:'Câu hỏi thường gặp', tl:'Mga FAQ', fr:'FAQ', ar:'الأسئلة الشائعة' },
    'Team login': { es:'Acceso del equipo', zh:'团队登录', vi:'Đăng nhập nhóm', tl:'Team login', fr:'Connexion équipe', ar:'دخول الفريق' },

    // ---- hero ----
    'Websites · SEO · Google Business Profile': { es:'Sitios web · SEO · Perfil de Google Business', zh:'网站 · SEO · Google 商家资料', vi:'Trang web · SEO · Hồ sơ Google Business', tl:'Mga Website · SEO · Google Business Profile', fr:'Sites web · SEO · Profil Google Business', ar:'مواقع · SEO · الملف التجاري على Google' },
    'When customers search,your business is the answer.': { es:'Cuando los clientes buscan,<br>tu negocio es la <span class="hl">respuesta</span>.', zh:'当客户搜索时，<br>你的企业就是<span class="hl">答案</span>。', vi:'Khi khách hàng tìm kiếm,<br>doanh nghiệp của bạn là <span class="hl">câu trả lời</span>.', tl:'Kapag naghahanap ang mga customer,<br>ang negosyo mo ang <span class="hl">sagot</span>.', fr:'Quand les clients cherchent,<br>votre entreprise est la <span class="hl">réponse</span>.', ar:'عندما يبحث العملاء،<br>تكون شركتك هي <span class="hl">الإجابة</span>.' },
    'We build fast, custom websites and help local businesses get found on Google, in the Map pack, and when people ask ChatGPT & AI for a recommendation.': { es:'Creamos sitios web rápidos y personalizados, y ayudamos a los negocios locales a aparecer en Google, en el paquete de mapas y cuando la gente le pide recomendaciones a ChatGPT y a la IA.', zh:'我们打造快速、定制的网站，帮助本地企业出现在 Google 搜索、地图栏，以及人们向 ChatGPT 和 AI 寻求推荐时。', vi:'Chúng tôi xây dựng các trang web nhanh, tùy chỉnh và giúp doanh nghiệp địa phương được tìm thấy trên Google, trong Map pack và khi mọi người hỏi ChatGPT & AI để được giới thiệu.', tl:'Gumagawa kami ng mabilis at custom na website at tinutulungan ang mga lokal na negosyo na matagpuan sa Google, sa Map pack, at kapag humihingi ng rekomendasyon ang mga tao sa ChatGPT at AI.', fr:'Nous créons des sites web rapides et sur mesure et aidons les entreprises locales à être trouvées sur Google, dans le pack local et quand les gens demandent une recommandation à ChatGPT et à l’IA.', ar:'نصمّم مواقع سريعة ومخصّصة ونساعد الشركات المحلية على الظهور في Google وفي حزمة الخرائط وعندما يطلب الناس توصية من ChatGPT والذكاء الاصطناعي.' },
    'Get your free audit →': { es:'Obtén tu auditoría gratis →', zh:'获取免费诊断 →', vi:'Nhận đánh giá miễn phí →', tl:'Kunin ang libreng audit →', fr:'Obtenez votre audit gratuit →', ar:'احصل على تدقيقك المجاني →' },
    'See how it works': { es:'Mira cómo funciona', zh:'了解运作方式', vi:'Xem cách hoạt động', tl:'Tingnan kung paano ito gumagana', fr:'Voir comment ça marche', ar:'شاهد كيف يعمل' },

    'Built to be found on': { es:'Diseñado para que te encuentren en', zh:'专为被发现而打造', vi:'Được xây dựng để được tìm thấy trên', tl:'Ginawa para matagpuan sa', fr:'Conçu pour être trouvé sur', ar:'مُصمّم ليُعثر عليه على' },

    // ---- problem ----
    'The problem': { es:'El problema', zh:'问题所在', vi:'Vấn đề', tl:'Ang Problema', fr:'Le problème', ar:'المشكلة' },
    'Your website is your first impression': { es:'Tu sitio web es tu <span class="hl">primera impresión</span>', zh:'你的网站就是你的<span class="hl">第一印象</span>', vi:'Trang web của bạn là <span class="hl">ấn tượng đầu tiên</span>', tl:'Ang website mo ang iyong <span class="hl">unang impresyon</span>', fr:'Votre site web est votre <span class="hl">première impression</span>', ar:'موقعك هو <span class="hl">انطباعك الأول</span>' },
    'When a customer Googles your name, what do they find? A pro that earns the call, or a reason to call your competitor?': { es:'Cuando un cliente busca tu nombre en Google, ¿qué encuentra? ¿Un profesional que se gana la llamada, o un motivo para llamar a tu competencia?', zh:'当客户在 Google 上搜索你的名字时，他们会看到什么？一个值得致电的专业商家，还是一个转而联系竞争对手的理由？', vi:'Khi khách hàng tìm tên bạn trên Google, họ thấy gì? Một chuyên gia đáng để gọi, hay một lý do để gọi cho đối thủ của bạn?', tl:'Kapag ni-Google ng customer ang pangalan mo, ano ang makikita nila? Isang propesyonal na karapat-dapat tawagan, o dahilan para tawagan ang kakumpitensya mo?', fr:'Quand un client cherche votre nom sur Google, que trouve-t-il ? Un pro qui mérite l’appel, ou une raison d’appeler votre concurrent ?', ar:'عندما يبحث العميل عن اسمك على Google، ماذا يجد؟ محترفًا يستحق الاتصال، أم سببًا للاتصال بمنافسك؟' },
    'Outdated design': { es:'Diseño anticuado', zh:'设计过时', vi:'Thiết kế lỗi thời', tl:'Lumang disenyo', fr:'Design dépassé', ar:'تصميم قديم' },
    'Slow load time': { es:'Carga lenta', zh:'加载缓慢', vi:'Tải chậm', tl:'Mabagal mag-load', fr:'Chargement lent', ar:'بطء التحميل' },
    'Invisible on Google & AI': { es:'Invisible en Google e IA', zh:'在 Google 和 AI 上不可见', vi:'Vô hình trên Google & AI', tl:'Hindi nakikita sa Google at AI', fr:'Invisible sur Google et l’IA', ar:'غير مرئي على Google والذكاء الاصطناعي' },
    'Weak Google Business presence': { es:'Presencia débil en Google Business', zh:'Google 商家展示薄弱', vi:'Hiện diện Google Business yếu', tl:'Mahinang presensya sa Google Business', fr:'Présence Google Business faible', ar:'حضور ضعيف على Google Business' },
    'Not mobile-friendly': { es:'No apto para móviles', zh:'不适配手机', vi:'Không thân thiện với di động', tl:'Hindi mobile-friendly', fr:'Pas adapté au mobile', ar:'غير متوافق مع الجوال' },
    'The DIY template trap': { es:'La trampa de las plantillas “hazlo tú mismo”', zh:'自助模板陷阱', vi:'Cái bẫy mẫu tự làm', tl:'Ang bitag ng DIY template', fr:'Le piège des modèles « à faire soi-même »', ar:'فخّ القوالب الجاهزة' },

    // ---- services ----
    'What we do': { es:'Lo que hacemos', zh:'我们的服务', vi:'Chúng tôi làm gì', tl:'Ang Ginagawa Namin', fr:'Ce que nous faisons', ar:'ما نقوم به' },
    'Build it. Rank it. Manage it.': { es:'Constrúyelo. Posiciónalo. <span class="hl">Gestiónalo.</span>', zh:'搭建。排名。<span class="hl">管理。</span>', vi:'Xây dựng. Xếp hạng. <span class="hl">Quản lý.</span>', tl:'Gawin. I-rank. <span class="hl">Pamahalaan.</span>', fr:'Créer. Classer. <span class="hl">Gérer.</span>', ar:'نبنيه. نرفع ترتيبه. <span class="hl">نديره.</span>' },
    'Custom Builds': { es:'Sitios a medida', zh:'定制开发', vi:'Thiết kế riêng', tl:'Custom na Build', fr:'Sites sur mesure', ar:'تصميمات مخصّصة' },
    'Hand-crafted, lightning-fast sites that match your brand. Mobile-first, conversion-focused, launch-ready in days.': { es:'Sitios hechos a mano y ultrarrápidos que reflejan tu marca. Pensados para móvil, enfocados en conversión y listos para lanzar en días.', zh:'手工打造、闪电般快速且契合你品牌的网站。移动优先、专注转化，数天内即可上线。', vi:'Trang web được làm thủ công, nhanh như chớp và hợp với thương hiệu của bạn. Ưu tiên di động, tập trung chuyển đổi, sẵn sàng ra mắt trong vài ngày.', tl:'Mga site na gawa nang maayos, napakabilis, at bagay sa iyong brand. Mobile-first, nakatuon sa conversion, at handa nang i-launch sa loob ng ilang araw.', fr:'Des sites faits main, ultra-rapides et fidèles à votre marque. Pensés mobile d’abord, axés sur la conversion, prêts à être lancés en quelques jours.', ar:'مواقع مصنوعة بعناية وفائقة السرعة تعكس علامتك التجارية. مُصمّمة للجوال أولاً، تركّز على التحويل، وجاهزة للإطلاق خلال أيام.' },
    'SEO & AI Search': { es:'SEO y búsqueda con IA', zh:'SEO 与 AI 搜索', vi:'SEO & Tìm kiếm AI', tl:'SEO at AI Search', fr:'SEO & recherche IA', ar:'SEO وبحث الذكاء الاصطناعي' },
    'Engineered to climb Google and show up when customers ask ChatGPT and AI search for a recommendation.': { es:'Diseñado para escalar en Google y aparecer cuando los clientes le piden una recomendación a ChatGPT y a la búsqueda con IA.', zh:'专为攀升 Google 排名而打造，并在客户向 ChatGPT 和 AI 搜索寻求推荐时出现。', vi:'Được thiết kế để leo hạng trên Google và xuất hiện khi khách hàng hỏi ChatGPT và tìm kiếm AI để được giới thiệu.', tl:'Ginawa para umakyat sa Google at lumitaw kapag humihingi ng rekomendasyon ang mga customer sa ChatGPT at AI search.', fr:'Conçu pour grimper sur Google et apparaître quand les clients demandent une recommandation à ChatGPT et à la recherche IA.', ar:'مُصمّم للصعود في Google والظهور عندما يطلب العملاء توصية من ChatGPT وبحث الذكاء الاصطناعي.' },
    'Google Business Profile': { es:'Perfil de Google Business', zh:'Google 商家资料', vi:'Hồ sơ Google Business', tl:'Google Business Profile', fr:'Profil Google Business', ar:'الملف التجاري على Google' },
    'We set up and manage your Google listing to drive calls, directions, and reviews, and own the local Map pack.': { es:'Configuramos y gestionamos tu ficha de Google para generar llamadas, indicaciones y reseñas, y dominar el paquete de mapas local.', zh:'我们为你设置并管理 Google 商家信息，带来来电、导航和评价，并占据本地地图栏。', vi:'Chúng tôi thiết lập và quản lý hồ sơ Google của bạn để tạo cuộc gọi, chỉ đường và đánh giá, và làm chủ Map pack địa phương.', tl:'Ise-set up at pamamahalaan namin ang iyong Google listing para magdala ng tawag, direksyon, at review, at angkinin ang lokal na Map pack.', fr:'Nous créons et gérons votre fiche Google pour générer des appels, des itinéraires et des avis, et dominer le pack local.', ar:'نُنشئ ونُدير بطاقتك على Google لجلب المكالمات والاتجاهات والتقييمات والسيطرة على حزمة الخرائط المحلية.' },

    // ---- statband labels ----
    'of people Google you before they call': { es:'de las personas te buscan en Google antes de llamar', zh:'的人在致电前会先 Google 你', vi:'số người tìm bạn trên Google trước khi gọi', tl:'ng mga tao ang nag-Google sa iyo bago tumawag', fr:'des gens vous cherchent sur Google avant d’appeler', ar:'من الناس يبحثون عنك على Google قبل الاتصال' },
    'to launch, not months': { es:'para lanzar, no meses', zh:'即可上线，而非数月', vi:'để ra mắt, không phải hàng tháng', tl:'para mag-launch, hindi buwan', fr:'pour lancer, pas des mois', ar:'للإطلاق، وليس أشهرًا' },
    'monthly, or save with a term': { es:'mensual, o ahorra con un plazo', zh:'按月付费，或选择长期更省', vi:'hàng tháng, hoặc tiết kiệm với gói dài hạn', tl:'buwanan, o makatipid sa term', fr:'au mois, ou économisez avec un engagement', ar:'شهريًا، أو وفّر باشتراك لمدة' },
    'optimized from day one': { es:'optimizado desde el primer día', zh:'从第一天起优化', vi:'tối ưu từ ngày đầu', tl:'optimisado mula sa unang araw', fr:'optimisé dès le premier jour', ar:'مُحسّن من اليوم الأول' },

    // ---- process ----
    'Your new website in 4 simple steps': { es:'Tu nuevo sitio web en <span class="hl">4 sencillos pasos</span>', zh:'<span class="hl">4 个简单步骤</span>打造你的新网站', vi:'Trang web mới của bạn trong <span class="hl">4 bước đơn giản</span>', tl:'Ang bagong website mo sa <span class="hl">4 na simpleng hakbang</span>', fr:'Votre nouveau site en <span class="hl">4 étapes simples</span>', ar:'موقعك الجديد في <span class="hl">4 خطوات بسيطة</span>' },
    'Free audit': { es:'Auditoría gratis', zh:'免费诊断', vi:'Đánh giá miễn phí', tl:'Libreng audit', fr:'Audit gratuit', ar:'تدقيق مجاني' },
    'We review your site and search presence and show you exactly where leads are leaking out.': { es:'Revisamos tu sitio y tu presencia en buscadores y te mostramos exactamente por dónde se te escapan los clientes.', zh:'我们审查你的网站和搜索表现，准确指出潜在客户从哪里流失。', vi:'Chúng tôi rà soát trang web và sự hiện diện tìm kiếm của bạn và chỉ ra chính xác nơi khách hàng tiềm năng đang rò rỉ.', tl:'Sinusuri namin ang site at search presence mo at ipinapakita kung saan eksakto natutulo ang mga lead.', fr:'Nous analysons votre site et votre présence dans les recherches et vous montrons exactement où vous perdez des clients.', ar:'نراجع موقعك وحضورك في البحث ونوضّح لك بالضبط أين تتسرّب العملاء المحتملون.' },
    'Design & build': { es:'Diseño y desarrollo', zh:'设计与搭建', vi:'Thiết kế & xây dựng', tl:'Disenyo at build', fr:'Conception & création', ar:'التصميم والبناء' },
    'We design and build your custom, conversion-focused site, fast.': { es:'Diseñamos y construimos tu sitio personalizado y enfocado en conversión, rápido.', zh:'我们快速设计并搭建专注转化的定制网站。', vi:'Chúng tôi thiết kế và xây dựng trang web tùy chỉnh, tập trung chuyển đổi của bạn, nhanh chóng.', tl:'Dinidisenyo at binubuo namin ang iyong custom, conversion-focused na site, mabilis.', fr:'Nous concevons et créons votre site sur mesure, axé conversion, rapidement.', ar:'نصمّم ونبني موقعك المخصّص الذي يركّز على التحويل، بسرعة.' },
    'Optimize': { es:'Optimización', zh:'优化', vi:'Tối ưu', tl:'I-optimize', fr:'Optimisation', ar:'التحسين' },
    'SEO, speed, and tracking dialed in for Google and AI search, then we go live.': { es:'Ajustamos SEO, velocidad y seguimiento para Google y la búsqueda con IA, y luego lo publicamos.', zh:'为 Google 和 AI 搜索调校 SEO、速度和数据追踪，然后正式上线。', vi:'Tinh chỉnh SEO, tốc độ và theo dõi cho Google và tìm kiếm AI, rồi chúng tôi cho ra mắt.', tl:'I-aayos ang SEO, bilis, at tracking para sa Google at AI search, tapos go live na.', fr:'SEO, vitesse et suivi réglés pour Google et la recherche IA, puis mise en ligne.', ar:'نضبط SEO والسرعة والتتبّع لِ*Google* وبحث الذكاء الاصطناعي، ثم ننشر الموقع.' },
    'Grow': { es:'Crecimiento', zh:'增长', vi:'Phát triển', tl:'Lumago', fr:'Croissance', ar:'النمو' },
    'Ongoing tuning and monthly reporting so your rankings and leads keep climbing.': { es:'Ajustes continuos e informes mensuales para que tus posiciones y clientes sigan creciendo.', zh:'持续调整与每月报告，让你的排名和客户不断攀升。', vi:'Tinh chỉnh liên tục và báo cáo hàng tháng để thứ hạng và khách hàng của bạn tiếp tục tăng.', tl:'Tuluy-tuloy na pag-tune at buwanang ulat para patuloy na umakyat ang ranking at lead mo.', fr:'Optimisation continue et rapports mensuels pour que vos classements et prospects continuent de grimper.', ar:'ضبط مستمر وتقارير شهرية كي يستمرّ ترتيبك وعملاؤك في الصعود.' },

    // ---- why ----
    'Why RankRebels': { es:'Por qué RankRebels', zh:'为何选择 RankRebels', vi:'Vì sao chọn RankRebels', tl:'Bakit RankRebels', fr:'Pourquoi RankRebels', ar:'لماذا RankRebels' },
    'The modern alternative to bloated agencies': { es:'La alternativa moderna a las <span class="hl">agencias infladas</span>', zh:'臃肿代理机构的<span class="hl">现代替代方案</span>', vi:'Giải pháp hiện đại thay cho <span class="hl">các agency cồng kềnh</span>', tl:'Ang modernong alternatibo sa <span class="hl">malalaking ahensya</span>', fr:'L’alternative moderne aux <span class="hl">agences trop lourdes</span>', ar:'البديل العصري <span class="hl">للوكالات المتضخّمة</span>' },

    // ---- reviews ----
    'What clients say': { es:'Lo que dicen los clientes', zh:'客户怎么说', vi:'Khách hàng nói gì', tl:'Ang Sabi ng mga Kliyente', fr:'Ce que disent les clients', ar:'ماذا يقول العملاء' },
    'Businesses that joined the Rebellion': { es:'Negocios que se unieron a la <span class="hl">Rebelión</span>', zh:'加入<span class="hl">反叛军</span>的企业', vi:'Những doanh nghiệp đã gia nhập <span class="hl">Cuộc nổi dậy</span>', tl:'Mga negosyong sumali sa <span class="hl">Rebelyon</span>', fr:'Des entreprises qui ont rejoint la <span class="hl">Rébellion</span>', ar:'شركات انضمّت إلى <span class="hl">التمرّد</span>' },

    // ---- values ----
    'Who we are': { es:'Quiénes somos', zh:'我们是谁', vi:'Chúng tôi là ai', tl:'Sino Kami', fr:'Qui nous sommes', ar:'من نحن' },
    'We put small businesses where they belong: on top.': { es:'Ponemos a los pequeños negocios donde merecen estar: <span class="hl">en la cima.</span>', zh:'我们让小企业站到应有的位置：<span class="hl">顶端。</span>', vi:'Chúng tôi đưa các doanh nghiệp nhỏ đến nơi họ thuộc về: <span class="hl">đỉnh cao.</span>', tl:'Inilalagay namin ang maliliit na negosyo kung nasaan dapat sila: <span class="hl">sa tuktok.</span>', fr:'Nous mettons les petites entreprises là où elles méritent : <span class="hl">au sommet.</span>', ar:'نضع الشركات الصغيرة حيث تستحق: <span class="hl">في القمّة.</span>' },
    'We Rebel with Purpose': { es:'Nos rebelamos con Propósito', zh:'我们以「使命」反叛', vi:'Chúng tôi nổi dậy bằng Mục đích', tl:'Naghihimagsik kami nang may Layunin', fr:'Nous nous rebellons avec Détermination', ar:'نتمرّد بهدف' },
    'We Rebel with Grit': { es:'Nos rebelamos con Determinación', zh:'我们以「韧劲」反叛', vi:'Chúng tôi nổi dậy bằng Sự kiên cường', tl:'Naghihimagsik kami nang may Tatag', fr:'Nous nous rebellons avec Ténacité', ar:'نتمرّد بعزيمة' },
    'We Rebel with Honesty': { es:'Nos rebelamos con Honestidad', zh:'我们以「诚实」反叛', vi:'Chúng tôi nổi dậy bằng Sự trung thực', tl:'Naghihimagsik kami nang may Katapatan', fr:'Nous nous rebellons avec Honnêteté', ar:'نتمرّد بصدق' },
    'We Rebel with Ownership': { es:'Nos rebelamos con Compromiso', zh:'我们以「担当」反叛', vi:'Chúng tôi nổi dậy bằng Tinh thần trách nhiệm', tl:'Naghihimagsik kami nang may Pananagutan', fr:'Nous nous rebellons avec Responsabilité', ar:'نتمرّد بالمسؤولية' },
    'We Rebel with Vision': { es:'Nos rebelamos con Visión', zh:'我们以「远见」反叛', vi:'Chúng tôi nổi dậy bằng Tầm nhìn', tl:'Naghihimagsik kami nang may Pananaw', fr:'Nous nous rebellons avec Vision', ar:'نتمرّد برؤية' },

    // ---- faq ----
    'Questions, answered': { es:'Preguntas, <span class="hl">respondidas</span>', zh:'问题，<span class="hl">已解答</span>', vi:'Câu hỏi, <span class="hl">đã giải đáp</span>', tl:'Mga tanong, <span class="hl">nasagot</span>', fr:'Vos questions, <span class="hl">nos réponses</span>', ar:'أسئلة <span class="hl">مُجاب عنها</span>' },
    'How fast can you build my website?': { es:'¿Qué tan rápido pueden crear mi sitio web?', zh:'你们能多快做好我的网站？', vi:'Bạn xây dựng website cho tôi nhanh thế nào?', tl:'Gaano kabilis ninyo magagawa ang website ko?', fr:'En combien de temps créez-vous mon site ?', ar:'ما مدى سرعة بناء موقعي؟' },
    'Do you optimize for Google and AI search?': { es:'¿Optimizan para Google y la búsqueda con IA?', zh:'你们会针对 Google 和 AI 搜索进行优化吗？', vi:'Bạn có tối ưu cho Google và tìm kiếm AI không?', tl:'Ino-optimize ba ninyo para sa Google at AI search?', fr:'Optimisez-vous pour Google et la recherche IA ?', ar:'هل تُحسّنون للظهور في Google وبحث الذكاء الاصطناعي؟' },
    'Is there a commitment?': { es:'¿Hay algún compromiso de permanencia?', zh:'需要签约承诺吗？', vi:'Có ràng buộc cam kết không?', tl:'May commitment ba?', fr:'Y a-t-il un engagement ?', ar:'هل هناك التزام؟' },
    'Who do you work with?': { es:'¿Con quién trabajan?', zh:'你们与谁合作？', vi:'Bạn làm việc với ai?', tl:'Kanino kayo nakikipagtulungan?', fr:'Avec qui travaillez-vous ?', ar:'مع مَن تعملون؟' },
    'What does it cost?': { es:'¿Cuánto cuesta?', zh:'费用是多少？', vi:'Chi phí là bao nhiêu?', tl:'Magkano ang gastos?', fr:'Combien ça coûte ?', ar:'كم التكلفة؟' },

    // ---- contact ----
    'Tell us about your business and we\'ll send a free, no-pressure audit of your site and search presence within 24 hours.': { es:'Cuéntanos sobre tu negocio y te enviaremos una auditoría gratuita y sin compromiso de tu sitio y tu presencia en buscadores en menos de 24 horas.', zh:'告诉我们你的业务，我们将在 24 小时内免费、无压力地为你的网站和搜索表现做一份诊断。', vi:'Hãy cho chúng tôi biết về doanh nghiệp của bạn và chúng tôi sẽ gửi đánh giá miễn phí, không áp lực về trang web và sự hiện diện tìm kiếm trong vòng 24 giờ.', tl:'Sabihin sa amin ang tungkol sa negosyo mo at magpapadala kami ng libre, walang-presyur na audit ng site at search presence mo sa loob ng 24 oras.', fr:'Parlez-nous de votre entreprise et nous vous enverrons un audit gratuit et sans engagement de votre site et de votre présence en ligne sous 24 heures.', ar:'أخبِرنا عن نشاطك التجاري وسنرسل لك تدقيقًا مجانيًا وبلا أي ضغط لموقعك وحضورك في البحث خلال 24 ساعة.' },
    'Your name': { es:'Tu nombre', zh:'你的姓名', vi:'Tên của bạn', tl:'Pangalan mo', fr:'Votre nom', ar:'اسمك' },
    'Business name': { es:'Nombre del negocio', zh:'企业名称', vi:'Tên doanh nghiệp', tl:'Pangalan ng negosyo', fr:'Nom de l’entreprise', ar:'اسم النشاط التجاري' },
    'Email': { es:'Correo electrónico', zh:'电子邮箱', vi:'Email', tl:'Email', fr:'E-mail', ar:'البريد الإلكتروني' },
    'Phone (optional)': { es:'Teléfono (opcional)', zh:'电话（可选）', vi:'Điện thoại (tùy chọn)', tl:'Telepono (opsyonal)', fr:'Téléphone (facultatif)', ar:'الهاتف (اختياري)' },
    'What do you need? (new site, redesign, more leads…)': { es:'¿Qué necesitas? (sitio nuevo, rediseño, más clientes…)', zh:'你需要什么？（新网站、改版、更多客户……）', vi:'Bạn cần gì? (trang mới, thiết kế lại, thêm khách hàng…)', tl:'Ano ang kailangan mo? (bagong site, redesign, mas maraming lead…)', fr:'De quoi avez-vous besoin ? (nouveau site, refonte, plus de clients…)', ar:'ماذا تحتاج؟ (موقع جديد، إعادة تصميم، عملاء أكثر…)' },
    'Get my free audit →': { es:'Quiero mi auditoría gratis →', zh:'获取我的免费诊断 →', vi:'Nhận đánh giá miễn phí của tôi →', tl:'Kunin ang libreng audit ko →', fr:'Obtenir mon audit gratuit →', ar:'احصل على تدقيقي المجاني →' },
    '✓ Got it. We\'ll be in touch within 24 hours with your free audit.': { es:'✓ Recibido. Nos pondremos en contacto en menos de 24 horas con tu auditoría gratis.', zh:'✓ 已收到。我们将在 24 小时内联系你并提供免费诊断。', vi:'✓ Đã nhận. Chúng tôi sẽ liên hệ trong vòng 24 giờ kèm đánh giá miễn phí của bạn.', tl:'✓ Natanggap. Makikipag-ugnayan kami sa loob ng 24 oras kasama ang libreng audit mo.', fr:'✓ Bien reçu. Nous vous contacterons sous 24 heures avec votre audit gratuit.', ar:'✓ تمّ الاستلام. سنتواصل معك خلال 24 ساعة مع تدقيقك المجاني.' },

    // ---- cookie ----
    'Decline': { es:'Rechazar', zh:'拒绝', vi:'Từ chối', tl:'Tanggihan', fr:'Refuser', ar:'رفض' },
    'Accept': { es:'Aceptar', zh:'接受', vi:'Chấp nhận', tl:'Tanggapin', fr:'Accepter', ar:'قبول' },

    // ---- misc ----
    'Get a free audit': { es:'Auditoría gratis', zh:'免费诊断', vi:'Nhận đánh giá miễn phí', tl:'Libreng audit', fr:'Audit gratuit', ar:'تدقيق مجاني' },
    'Search': { es:'Buscar', zh:'搜索', vi:'Tìm kiếm', tl:'Maghanap', fr:'Rechercher', ar:'بحث' },
    'Your Business': { es:'Tu Negocio', zh:'你的企业', vi:'Doanh nghiệp của bạn', tl:'Ang Negosyo Mo', fr:'Votre entreprise', ar:'نشاطك التجاري' },
    'Found ✓': { es:'Encontrado ✓', zh:'已找到 ✓', vi:'Đã tìm thấy ✓', tl:'Nahanap ✓', fr:'Trouvé ✓', ar:'✓ تم العثور' },
    'A competitor with an old site': { es:'Un competidor con un sitio viejo', zh:'一个使用旧网站的竞争对手', vi:'Một đối thủ với trang web cũ', tl:'Isang kakumpitensyang may lumang site', fr:'Un concurrent avec un vieux site', ar:'منافس بموقع قديم' },
    'Another generic listing': { es:'Otra ficha genérica', zh:'另一个普通商家', vi:'Một danh sách chung chung khác', tl:'Isa pang generic na listing', fr:'Une autre fiche générique', ar:'بطاقة عامة أخرى' }
  };

  function norm(s) { return (s || '').replace(/\s+/g, ' ').trim().replace(/[‘’]/g, "'").replace(/[“”]/g, '"'); }
  var SEL = 'nav.nav-links a, .nav-cta a, .hero-actions a, .eyebrow, h1, h2, h3, .hero .sub, .optfor .lbl, .prob h4, .prob p, .card p, .statband .l, .step h4, .step p, .vtag, .sec-head p, .cta-band p, .lead-form button, #form-msg, #cookie-banner button, .result .rname, .result .pill, .searchbar .go';
  var store = null;
  function collect() {
    store = [];
    document.querySelectorAll(SEL).forEach(function (el) {
      store.push({ el: el, html: el.innerHTML, key: norm(el.textContent) });
    });
  }
  function apply(lang) {
    if (!store) collect();
    store.forEach(function (s) {
      if (lang === 'en') { s.el.innerHTML = s.html; return; }
      var e = T[s.key];
      s.el.innerHTML = (e && e[lang]) ? e[lang] : s.html;
    });
    document.querySelectorAll('input[placeholder],textarea[placeholder]').forEach(function (el) {
      if (el.__ph == null) el.__ph = el.getAttribute('placeholder');
      var e = T[norm(el.__ph)];
      el.setAttribute('placeholder', (lang !== 'en' && e && e[lang]) ? e[lang] : el.__ph);
    });
    var L = LANGS.filter(function (x) { return x.code === lang; })[0] || LANGS[0];
    document.documentElement.lang = lang;
    document.documentElement.dir = L.dir;
    try { localStorage.setItem('rr_lang', lang); } catch (e) {}
    var u = new URL(location.href); if (lang === 'en') u.searchParams.delete('lang'); else u.searchParams.set('lang', lang);
    history.replaceState(null, '', u);
    var cur = document.getElementById('rr-lang-cur'); if (cur) cur.textContent = L.native;
    document.querySelectorAll('#rr-lang-menu button').forEach(function (b) { b.setAttribute('aria-current', b.dataset.code === lang ? 'true' : 'false'); });
  }

  function buildSwitcher() {
    var mount = document.getElementById('langpick'); if (!mount) return;
    var cur = currentLang();
    var curNative = (LANGS.filter(function (x) { return x.code === cur; })[0] || LANGS[0]).native;
    mount.innerHTML =
      '<button id="rr-lang-btn" aria-haspopup="true" aria-expanded="false">🌐 <span id="rr-lang-cur">' + curNative + '</span> ▾</button>' +
      '<div id="rr-lang-menu" role="menu">' + LANGS.map(function (l) {
        return '<button role="menuitem" data-code="' + l.code + '"' + (l.dir === 'rtl' ? ' dir="rtl"' : '') + '>' + l.native + '</button>';
      }).join('') + '</div>';
    var btn = document.getElementById('rr-lang-btn'), menu = document.getElementById('rr-lang-menu');
    btn.addEventListener('click', function (e) { e.stopPropagation(); var open = menu.classList.toggle('open'); btn.setAttribute('aria-expanded', open ? 'true' : 'false'); });
    document.addEventListener('click', function () { menu.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); });
    menu.querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { apply(b.dataset.code); menu.classList.remove('open'); }); });
  }

  function currentLang() {
    var q = new URL(location.href).searchParams.get('lang');
    if (q && LANGS.some(function (l) { return l.code === q; })) return q;
    try { var s = localStorage.getItem('rr_lang'); if (s && LANGS.some(function (l) { return l.code === s; })) return s; } catch (e) {}
    var nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
    return LANGS.some(function (l) { return l.code === nav; }) ? nav : 'en';
  }

  function init() { collect(); buildSwitcher(); apply(currentLang()); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
