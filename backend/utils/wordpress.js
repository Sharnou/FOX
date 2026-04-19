// Use global fetch (Node 18+ built-in) — avoids node-fetch ESM import issues

const SITE = 'xt0x.wordpress.com';
const WP_API = `https://public-api.wordpress.com/rest/v1.1/sites/${SITE}`;

function getToken() {
  return process.env.WP_ACCESS_TOKEN;
}

function isConfigured() {
  return !!getToken();
}

function authHeaders() {
  return {
    'Authorization': `Bearer ${getToken()}`,
    'Content-Type': 'application/json',
  };
}

// ─── City database — 60+ Arab cities ────────────────────────────────────────
const ARAB_CITIES = {
  EG: ['القاهرة','الإسكندرية','الجيزة','شرم الشيخ','الغردقة','أسوان','الأقصر','المنصورة','طنطا','الزقازيق','السويس','بورسعيد','الإسماعيلية','المنيا','سوهاج','قنا','أسيوط','دمنهور','الفيوم','بنها','مدينة نصر','هليوبوليس','المعادي','الشروق','6 أكتوبر','العبور','التجمع الخامس'],
  SA: ['الرياض','جدة','مكة المكرمة','المدينة المنورة','الدمام','الخبر','الظهران','تبوك','أبها','خميس مشيط','القصيم','حائل','نجران','جازان','ينبع'],
  AE: ['دبي','أبوظبي','الشارقة','عجمان','رأس الخيمة','الفجيرة','أم القيوين'],
  KW: ['الكويت','حولي','الفروانية','الأحمدي','الجهراء','مبارك الكبير'],
  QA: ['الدوحة','الريان','الوكرة','الخور','الشمال'],
  BH: ['المنامة','المحرق','الرفاع','مدينة عيسى','مدينة حمد'],
  JO: ['عمان','الزرقاء','إربد','العقبة','السلط','المفرق'],
  LB: ['بيروت','طرابلس','صيدا','صور','زحلة'],
  MA: ['الدار البيضاء','الرباط','فاس','مراكش','أكادير','طنجة','مكناس','وجدة'],
  DZ: ['الجزائر','وهران','قسنطينة','عنابة','سطيف','تلمسان','بجاية'],
  TN: ['تونس','صفاقس','سوسة','بنزرت','قابس','القيروان'],
  IQ: ['بغداد','البصرة','الموصل','أربيل','النجف','كربلاء','كركوك'],
  LY: ['طرابلس','بنغازي','مصراتة','سبها','الزاوية'],
  SY: ['دمشق','حلب','حمص','اللاذقية','طرطوس','حماة'],
  OM: ['مسقط','صلالة','صحار','نزوى','السيب'],
  YE: ['صنعاء','عدن','تعز','الحديدة','إب'],
  SD: ['الخرطوم','أم درمان','بحري','بورتسودان','كسلا'],
  PS: ['غزة','رام الله','نابلس','الخليل','جنين'],
};

// ─── Category keyword map — 20 categories, 15+ keywords each ────────────────
const CAT_KEYWORDS = {
  car: {
    ar: ['سيارات للبيع','سيارة مستعملة','سيارة بسعر مناسب','شراء سيارة','بيع سيارة','سيارات فخمة','سيارات اقتصادية','قطع غيار سيارات','موتوسيكلات','دراجات نارية','سيارة كاش','تقسيط سيارة','سيارة بدون حوادث','اختبار قيادة','وكالة سيارات'],
    en: ['car for sale','used car','buy car','sell car','cheap car','luxury car','second hand car','auto parts','motorcycle','test drive'],
  },
  real: {
    ar: ['شقق للبيع','شقق للإيجار','فيلا للبيع','أرض للبيع','عقار','مكتب للإيجار','محل للإيجار','شقة مفروشة','وحدة سكنية','دوبلكس','بنتهاوس','روف للبيع','استثمار عقاري','تطوير عقاري','سكن'],
    en: ['apartment for sale','apartment for rent','villa for sale','land for sale','real estate','office for rent','furnished apartment','residential unit','property investment'],
  },
  electron: {
    ar: ['موبايل للبيع','هاتف مستعمل','لاب توب للبيع','جهاز كمبيوتر','تابلت للبيع','شاشة للبيع','سماعات للبيع','كاميرا للبيع','اكسسوارات موبايل','بلايستيشن للبيع','إكس بوكس','درون للبيع','أجهزة إلكترونية','موبايل مستعمل بسعر رخيص','جوال'],
    en: ['phone for sale','used mobile','laptop for sale','computer','tablet','screen','headphones','camera','accessories','playstation','xbox','drone','electronics'],
  },
  موبايل: {
    ar: ['موبايل للبيع','هاتف مستعمل','آيفون','سامسونج','هواوي','شاومي','أوبو','جهاز مستعمل','موبايل بسعر رخيص','شراء موبايل','بيع موبايل'],
    en: ['phone for sale','used mobile','iphone','samsung','huawei','xiaomi','oppo','buy phone','sell phone'],
  },
  سيارات: {
    ar: ['سيارات للبيع','سيارة مستعملة','سيارة بسعر مناسب','شراء سيارة','بيع سيارة','قطع غيار','موتوسيكل','تقسيط سيارة','سيارة بدون حوادث'],
    en: ['car for sale','used car','buy car','sell car','auto parts','motorcycle'],
  },
  عقارات: {
    ar: ['شقق للبيع','شقق للإيجار','فيلا للبيع','أرض للبيع','عقار','مكتب للإيجار','شقة مفروشة','استثمار عقاري'],
    en: ['apartment for sale','apartment for rent','real estate','villa','land','office for rent'],
  },
  إلكترونيات: {
    ar: ['لاب توب','جهاز كمبيوتر','تابلت','شاشة','سماعات','كاميرا','أجهزة إلكترونية','درون','طباعة'],
    en: ['laptop','computer','tablet','screen','headphones','camera','electronics'],
  },
  أثاث: {
    ar: ['أثاث للبيع','كنبة للبيع','غرفة نوم','طقم صالون','مطبخ','ديكور','سجاد','مفروشات','أثاث مستعمل','طاولة'],
    en: ['furniture for sale','sofa','bedroom','living room','kitchen','carpet'],
  },
  ملابس: {
    ar: ['ملابس للبيع','ملابس نسائية','ملابس رجالية','ملابس أطفال','أزياء','موضة','حقائب','أحذية','ساعات','مجوهرات'],
    en: ['clothes','women fashion','men fashion','kids clothes','bags','shoes','watches','jewelry'],
  },
  وظائف: {
    ar: ['وظائف شاغرة','فرص عمل','مطلوب موظف','وظيفة بدوام كامل','عمل من المنزل','راتب مجزي','وظيفة فورية'],
    en: ['job vacancy','employment','hiring','full time job','part time','work from home'],
  },
  خدمات: {
    ar: ['خدمات منزلية','سباك','كهربائي','نجار','دهان','تكييف','تنظيف','نقل عفش','مصور','معلم خصوصي'],
    en: ['home services','plumber','electrician','carpenter','painter','AC','cleaning','moving'],
  },
  حيوانات: {
    ar: ['حيوانات أليفة','كلاب للبيع','قطط للبيع','طيور للبيع','أسماك','خيول','ماعز','خراف','مستلزمات حيوانات'],
    en: ['pets','dogs','cats','birds','fish','horses','sheep','goats','pet supplies'],
  },
  رياضة: {
    ar: ['أدوات رياضية','دراجة للبيع','ملابس رياضية','كرة القدم','معدات رياضية','جهاز ركض'],
    en: ['sports equipment','bicycle','gym','football','tennis','swimming','treadmill'],
  },
  كتب: {
    ar: ['كتب للبيع','كتب مستعملة','كتب دراسية','مواد تعليمية','دورات تدريبية','تعليم لغات'],
    en: ['books for sale','used books','textbooks','educational materials','training courses'],
  },
  furn: {
    ar: ['أثاث للبيع','كنبة للبيع','غرفة نوم','طقم صالون','مطبخ للبيع','ديكور','سجاد للبيع','مفروشات','أثاث مستعمل','طاولة طعام','خزانة ملابس','تصميم داخلي','إكسسوارات منزلية','ستائر','إضاءة'],
    en: ['furniture for sale','sofa','bedroom set','living room','kitchen','decor','carpet','used furniture','dining table','wardrobe','interior design'],
  },
  job: {
    ar: ['وظائف شاغرة','فرص عمل','مطلوب موظف','مطلوب عمال','وظيفة بدوام كامل','وظيفة بدوام جزئي','عمل من المنزل','فرصة عمل مميزة','راتب مجزي','وظيفة فورية','التوظيف','نشرة وظائف','وظائف حكومية','وظائف في الخارج','مطلوب محاسب'],
    en: ['job vacancy','employment','hiring','full time job','part time','work from home','salary','immediate hiring','accountant needed','engineer wanted'],
  },
  fashion: {
    ar: ['ملابس للبيع','ملابس نسائية','ملابس رجالية','ملابس أطفال','أزياء','موضة','حقائب للبيع','أحذية للبيع','ساعات للبيع','مجوهرات','عبايات','فساتين','مستحضرات تجميل','إكسسوارات','ماركات'],
    en: ['clothes for sale','women fashion','men fashion','kids clothes','bags','shoes','watches','jewelry','beauty','cosmetics','brands'],
  },
  animal: {
    ar: ['حيوانات أليفة للبيع','كلاب للبيع','قطط للبيع','طيور للبيع','أسماك للبيع','خيول للبيع','ماعز للبيع','خراف للبيع','مستلزمات حيوانات','طعام قطط','طعام كلاب','بيطري','تربية حيوانات','بالتو كلاب','تزاوج'],
    en: ['pets for sale','dogs for sale','cats for sale','birds','fish','horses','sheep','goats','pet supplies','vet','pet food','breeding'],
  },
  service: {
    ar: ['خدمات منزلية','سباك','كهربائي','نجار','دهان','تكييف وتبريد','شركة تنظيف','نقل عفش','مصور فوتوغرافي','مصمم جرافيك','معلم خصوصي','خياطة','تعليم قيادة','تصليح أجهزة','برمجة'],
    en: ['home services','plumber','electrician','carpenter','painter','AC repair','cleaning company','moving','photographer','graphic designer','tutor','sewing','driving lessons','tech repair','programming'],
  },
  sport: {
    ar: ['أدوات رياضية','جهاز رياضي','دراجة للبيع','ملابس رياضية','كرة القدم','تنس','سباحة','صالة جيم','معدات رياضية','جهاز ركض','دراجة ثابتة','رياضة'],
    en: ['sports equipment','bicycle','gym equipment','football','tennis','swimming','treadmill','fitness','sports clothes','weights'],
  },
};

// ─── Intent keywords (apply to all ads) ─────────────────────────────────────
const INTENT_KEYWORDS = [
  'للبيع','بيع','شراء','سعر','كاش','تقسيط','مناسب','رخيص','مستعمل','جديد',
  'قريب','في منطقة','بالقرب من','توصيل','شحن','سعر شامل',
  'بسعر مناسب','بدون وسيط','مباشرة من المالك','أصلي','ضمان','فاتورة',
  'XTOX','سوق XTOX','إعلانات مبوبة','بيع وشراء عربي','سوق محلي','إعلان مجاني',
  'ارخص سعر','هل يوجد','اين اجد','مطلوب للشراء','متوفر','كميات',
];

// ─── Country-specific suffixes ───────────────────────────────────────────────
const COUNTRY_SUFFIXES = {
  EG: ['في مصر','مصر','Cairo Egypt','Egypt marketplace'],
  SA: ['في السعودية','المملكة العربية السعودية','Saudi Arabia'],
  AE: ['في الإمارات','دبي','أبوظبي','UAE Dubai'],
  KW: ['في الكويت','Kuwait'],
  QA: ['في قطر','Qatar Doha'],
  BH: ['في البحرين','Bahrain Manama'],
  JO: ['في الأردن','Jordan Amman'],
  LB: ['في لبنان','Lebanon Beirut'],
  MA: ['في المغرب','Morocco'],
  DZ: ['في الجزائر','Algeria'],
  TN: ['في تونس','Tunisia'],
  IQ: ['في العراق','Iraq Baghdad'],
  LY: ['في ليبيا','Libya'],
  SY: ['في سوريا','Syria'],
  OM: ['في عمان','Oman Muscat'],
  YE: ['في اليمن','Yemen'],
  SD: ['في السودان','Sudan'],
  PS: ['في فلسطين','Palestine'],
};

// ─── 2H: Ultra-smart keyword generator — returns 20-30 highly targeted keywords ──
export function generateKeywords(ad) {
  const keywords = new Set();

  // 1. Always include base XTOX keywords (2H requirement)
  ['XTOX', 'سوق XTOX', 'إعلانات مبوبة', 'بيع وشراء', 'سوق محلي', 'إعلانات مجانية', 'سوق عربي', 'إعلان مجاني'].forEach(k => keywords.add(k));

  // 2. Category keywords
  const cat = (ad.category || ad.subCategory || '').toLowerCase();
  // Try Arabic category name first, then English fallback
  const catEntry = Object.entries(CAT_KEYWORDS).find(([k]) =>
    cat.includes(k) || (ad.category || '').includes(k) || (ad.subCategory || '').includes(k)
  );
  if (catEntry) {
    const [, catKws] = catEntry;
    catKws.ar.slice(0, 8).forEach(k => keywords.add(k));
    catKws.en.slice(0, 4).forEach(k => keywords.add(k));
  }

  // 3. City keywords (city itself + "للبيع في X" + "إعلانات X") — 2H: city always included
  const city = ad.city || ad.location || '';
  if (city) {
    keywords.add(city);
    keywords.add(`${city} للبيع`);
    keywords.add(`إعلانات ${city}`);
    keywords.add(`بيع وشراء ${city}`);
    if (catEntry) {
      keywords.add(`${catEntry[1].ar[0]} ${city}`);
    }
  }

  // 4. Country suffixes
  const country = ad.country || 'EG';
  (COUNTRY_SUFFIXES[country] || COUNTRY_SUFFIXES.EG).forEach(k => keywords.add(k));

  // 5. 2H: Price range tags
  if (ad.price) {
    const p = Number(ad.price);
    keywords.add(`${p.toLocaleString()} جنيه`);
    if (p < 200) { keywords.add('أقل من 200 جنيه'); keywords.add('رخيص جداً'); }
    else if (p < 500) { keywords.add('أقل من 500 جنيه'); keywords.add('سعر رخيص'); }
    else if (p < 1000) { keywords.add('أقل من 1000 جنيه'); keywords.add('سعر رخيص'); }
    else if (p < 5000) { keywords.add('1000-5000 جنيه'); keywords.add('سعر معقول'); }
    else if (p < 10000) { keywords.add('5000-10000 جنيه'); keywords.add('سعر مناسب'); }
    else if (p < 50000) { keywords.add('10000-50000 جنيه'); keywords.add('سعر تفاوضي'); }
    else { keywords.add('أكثر من 50000 جنيه'); keywords.add('للبيع بسعر تفاوضي'); }
  }

  // 6. Intent keywords (pick 5 relevant ones)
  INTENT_KEYWORDS.slice(0, 5).forEach(k => keywords.add(k));

  // 7. Title words as keywords (each word > 3 chars)
  (ad.title || '').split(/\s+/).filter(w => w.length > 3).slice(0, 6).forEach(k => keywords.add(k));

  // 8. 2H: Condition/state tags
  if (ad.condition === 'new' || ad.condition === 'جديد') {
    keywords.add('جديد');
    keywords.add('بضاعة جديدة');
  } else if (ad.condition === 'used' || ad.condition === 'مستعمل') {
    keywords.add('مستعمل');
    keywords.add('بحالة جيدة');
  } else if (ad.condition) {
    keywords.add(ad.condition);
  }

  // 9. 2H: Season/year tags — always add current year
  const currentYear = new Date().getFullYear();
  keywords.add(`${currentYear}`);
  keywords.add(`ربيع ${currentYear}`);
  // Add season based on current month
  const month = new Date().getMonth(); // 0-11
  if (month >= 2 && month <= 4) keywords.add(`ربيع ${currentYear}`);
  else if (month >= 5 && month <= 7) keywords.add(`صيف ${currentYear}`);
  else if (month >= 8 && month <= 10) keywords.add(`خريف ${currentYear}`);
  else keywords.add(`شتاء ${currentYear}`);

  return [...keywords].slice(0, 20); // WordPress tag limit friendly
}

// ─── 2A: SEO-Perfect Post Title ─────────────────────────────────────────────
export function buildTitle(ad) {
  // Formula: {ad.title} | {category} في {city} | XTOX
  const category = ad.category || ad.subCategory || 'إعلانات';
  const city = ad.city || ad.location || '';
  const parts = [ad.title || 'إعلان'];
  if (city) {
    parts.push(`${category} في ${city}`);
  } else {
    parts.push(category);
  }
  parts.push('XTOX');
  return parts.join(' | ');
}

// ─── 2B: Rich Meta Description (excerpt) ────────────────────────────────────
function buildExcerpt(ad) {
  const desc = (ad.description || ad.title || '');
  return desc.slice(0, 150) + (desc.length > 150 ? '...' : '');
}

// ─── buildTags: Rich SEO-optimized tag generator (returns array of tag names) ──
function buildTags(ad) {
  const tags = new Set();

  // Category tags (Arabic + English)
  const catMap = {
    'cars':        ['سيارات', 'Cars', 'مركبات', 'Vehicles'],
    'electronics': ['إلكترونيات', 'Electronics', 'أجهزة'],
    'realestate':  ['عقارات', 'Real Estate', 'شقق', 'أراضي'],
    'jobs':        ['وظائف', 'Jobs', 'عمل', 'فرص عمل'],
    'services':    ['خدمات', 'Services'],
    'supermarket': ['سوبرماركت', 'Supermarket', 'بقالة'],
    'pharmacy':    ['صيدلية', 'Pharmacy', 'دواء'],
    'food':        ['طعام', 'Food', 'مطاعم', 'Fast Food'],
    'fashion':     ['موضة', 'Fashion', 'ملابس', 'أزياء'],
  };
  const catKey = (ad.category || '').toLowerCase().replace(/\s+/g, '');
  if (catMap[catKey]) catMap[catKey].forEach(t => tags.add(t));
  else if (ad.category) tags.add(ad.category);

  // Location tags
  if (ad.governorate || ad.city) tags.add(ad.governorate || ad.city);
  if (ad.city && ad.city !== ad.governorate) tags.add(ad.city);

  // Condition tags
  const condMap = {
    'new':         ['جديد', 'New'],
    'used':        ['مستعمل', 'Used'],
    'refurbished': ['مجدد', 'Refurbished'],
  };
  if (ad.condition && condMap[ad.condition]) condMap[ad.condition].forEach(t => tags.add(t));

  // Price range tags
  const price = parseFloat(ad.price);
  if (!isNaN(price)) {
    if (price < 500)        tags.add('أقل من 500 جنيه');
    else if (price < 2000)  tags.add('500 - 2000 جنيه');
    else if (price < 10000) tags.add('2000 - 10000 جنيه');
    else                    tags.add('أكثر من 10000 جنيه');
  }

  // Platform tags (always)
  ['XTOX', 'مصر', 'Egypt', 'سوق إلكتروني', 'بيع وشراء'].forEach(t => tags.add(t));

  // Title keywords (extract meaningful words > 3 chars, max 5)
  if (ad.title) {
    const words = ad.title.split(/\s+/).filter(w => w.length > 3).slice(0, 5);
    words.forEach(w => tags.add(w));
  }

  return [...tags].slice(0, 20); // reasonable max for WP
}

// ─── PAGE_TAGS: Static page tag map for WP pages ─────────────────────────────
export const PAGE_TAGS = {
  home:        ['XTOX', 'سوق إلكتروني', 'مصر', 'بيع وشراء', 'إعلانات مبوبة', 'Egypt Marketplace'],
  leaderboard: ['XTOX', 'متصدرو المبيعات', 'Leaderboard', 'أفضل البائعين', 'مصر'],
  honorRoll:   ['XTOX', 'لوحة الشرف', 'Honor Roll', 'البائع المميز'],
  ads:         ['XTOX', 'إعلانات', 'Ads', 'بيع وشراء', 'مصر', 'Egypt'],
};

// ─── getOrCreateTags: resolve tag names → WP tag IDs (via wp/v2 API) ─────────
async function getOrCreateTags(tagNames, token) {
  if (!token || !tagNames || !tagNames.length) return [];
  const ids = [];
  for (const name of tagNames) {
    try {
      const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u0600-\u06FF-]/g, '');
      // Try to create
      const res = await fetch('https://public-api.wordpress.com/wp/v2/sites/xt0x.wordpress.com/tags', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const tag = await res.json();
        if (tag.id) ids.push(tag.id);
      } else if (res.status === 409) {
        // Tag already exists — search for it
        const search = await fetch(
          `https://public-api.wordpress.com/wp/v2/sites/xt0x.wordpress.com/tags?search=${encodeURIComponent(name)}&per_page=1`,
          { headers: { 'Authorization': `Bearer ${token}` }, signal: AbortSignal.timeout(8000) }
        );
        if (search.ok) {
          const existing = await search.json();
          if (existing[0]?.id) ids.push(existing[0].id);
        }
      }
    } catch { /* skip failed tag — non-fatal */ }
  }
  return ids;
}

// ─── 2F: IndexNow ping (Bing + Yandex instant indexing) ─────────────────────
async function pingIndexNow(postUrl) {
  const INDEXNOW_KEY = 'xtox2026indexnow';
  try {
    // Ping Bing
    fetch(`https://www.bing.com/indexnow?url=${encodeURIComponent(postUrl)}&key=${INDEXNOW_KEY}`, { method: 'GET' }).catch(() => {});
    // Ping Yandex
    fetch(`https://yandex.com/indexnow?url=${encodeURIComponent(postUrl)}&key=${INDEXNOW_KEY}`, { method: 'GET' }).catch(() => {});
    // Also try api.indexnow.org (generic endpoint)
    fetch(`https://api.indexnow.org/indexnow?url=${encodeURIComponent(postUrl)}&key=${INDEXNOW_KEY}`, { method: 'GET' }).catch(() => {});
    console.log('[IndexNow] Pinged Bing + Yandex for:', postUrl);
  } catch (e) {
    console.log('[IndexNow] Ping failed (non-critical):', e.message);
  }
}

// ─── 2G: Google sitemap ping ─────────────────────────────────────────────────
function pingSitemaps(postUrl) {
  try {
    const SITEMAP_URL = 'https://xt0x.wordpress.com/sitemap.xml';
    // Google sitemap notification — fire and forget with 5s timeout
    fetch(
      `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`,
      { signal: AbortSignal.timeout(5000) }
    ).catch(() => {});
    // Bing sitemap notification — fire and forget with 5s timeout
    fetch(
      `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`,
      { signal: AbortSignal.timeout(5000) }
    ).catch(() => {});
    console.log('[Sitemap] Pinged Google + Bing for:', postUrl || 'sitemap update');
  } catch (e) {
    console.log('[Sitemap] Ping failed (non-critical):', e.message);
  }
}
// Keep backward compat alias
const pingGoogle = pingSitemaps;

// Track last ping time for the sitemap endpoint
let _lastSitemapPing = null;

export function getLastSitemapPing() { return _lastSitemapPing; }
export function triggerSitemapPing(postUrl) {
  _lastSitemapPing = new Date().toISOString();
  pingSitemaps(postUrl);
}

function buildPWAWidget(adId) {
  const appUrl = 'https://fox-kohl-eight.vercel.app';
  const adLink = `${appUrl}/ads/${adId}`;
  const installLink = `${appUrl}/install`;
  
  return `<!-- XTOX Smart App Widget -->
<div id="xtox-app-widget" style="background:linear-gradient(135deg,#1e3a5f,#2563eb);border-radius:12px;padding:20px;margin-bottom:24px;text-align:center;color:white;font-family:Arial,sans-serif">
  <div id="xtox-pwa-detected" style="display:none">
    <p style="font-size:20px;margin:0 0 12px">📱 يبدو أن تطبيق XTOX مثبّت على جهازك!</p>
    <a id="xtox-open-app" href="${adLink}" 
       style="background:white;color:#2563eb;padding:12px 28px;border-radius:8px;font-size:17px;font-weight:bold;text-decoration:none;display:inline-block">
      🚀 افتح في تطبيق XTOX
    </a>
  </div>
  <div id="xtox-pwa-not-detected">
    <p style="font-size:18px;margin:0 0 8px;font-weight:bold">🛒 XTOX - السوق المحلي العربي</p>
    <p style="font-size:14px;margin:0 0 16px;opacity:0.9">حمّل التطبيق مجاناً وتواصل مع البائع مباشرة</p>
    <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
      <a href="${adLink}" 
         style="background:white;color:#2563eb;padding:10px 20px;border-radius:8px;font-size:15px;font-weight:bold;text-decoration:none">
        👀 عرض الإعلان
      </a>
      <a href="${installLink}" 
         style="background:#10b981;color:white;padding:10px 20px;border-radius:8px;font-size:15px;font-weight:bold;text-decoration:none">
        📲 تحميل التطبيق
      </a>
    </div>
  </div>
</div>
<script>
(function() {
  var adId = '${adId}';
  var appUrl = '${appUrl}/ads/' + adId;
  var isPWA = window.matchMedia('(display-mode: standalone)').matches || 
              window.navigator.standalone === true;
  if (isPWA) {
    window.location.href = appUrl;
    return;
  }
  if ('getInstalledRelatedApps' in navigator) {
    navigator.getInstalledRelatedApps().then(function(apps) {
      if (apps && apps.length > 0) {
        document.getElementById('xtox-pwa-detected').style.display = 'block';
        document.getElementById('xtox-pwa-not-detected').style.display = 'none';
      }
    }).catch(function() {});
  }
  var visited = localStorage ? localStorage.getItem('xtox_visited') : null;
  if (visited) {
    document.getElementById('xtox-pwa-detected').style.display = 'block';
    document.getElementById('xtox-pwa-not-detected').style.display = 'none';
    document.getElementById('xtox-open-app').href = appUrl;
  }
  if (localStorage) localStorage.setItem('xtox_visited', '1');
})();
</script>`;
}

function buildContent(ad) {
  const adId = (ad._id || ad.id || '').toString();
  const title = (ad.title || '');
  const description = (ad.description || ad.title || '');
  const price = (ad.price !== undefined && ad.price !== null) ? `${Number(ad.price).toLocaleString()} جنيه` : 'غير محدد';
  const governorate = ad.city || ad.location || 'غير محدد';
  const category = ad.category || 'غير محدد';
  const condition = ad.condition || 'غير محدد';

  return `<div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 16px; line-height: 1.8; color: #222;">
  <h2 style="color: #1a73e8; border-bottom: 2px solid #1a73e8; padding-bottom: 8px;">${title}</h2>
  <p style="background: #f8f9fa; padding: 12px; border-right: 4px solid #1a73e8; border-radius: 4px;">${description}</p>
  <table style="width:100%; border-collapse: collapse; margin-top: 16px;">
    <tr><td style="padding:8px; border:1px solid #ddd; background:#f2f2f2; font-weight:bold;">السعر</td><td style="padding:8px; border:1px solid #ddd;">${price}</td></tr>
    <tr><td style="padding:8px; border:1px solid #ddd; background:#f2f2f2; font-weight:bold;">المحافظة</td><td style="padding:8px; border:1px solid #ddd;">${governorate}</td></tr>
    <tr><td style="padding:8px; border:1px solid #ddd; background:#f2f2f2; font-weight:bold;">التصنيف</td><td style="padding:8px; border:1px solid #ddd;">${category}</td></tr>
    <tr><td style="padding:8px; border:1px solid #ddd; background:#f2f2f2; font-weight:bold;">الحالة</td><td style="padding:8px; border:1px solid #ddd;">${condition}</td></tr>
  </table>
  <div style="margin-top: 20px; text-align: center;">
    <a href="https://fox-kohl-eight.vercel.app/ads/${adId}" style="background:#1a73e8; color:#fff; padding:12px 24px; border-radius:6px; text-decoration:none; font-size:16px; display:inline-block;">🔗 عرض الإعلان</a>
  </div>
  <p style="margin-top: 24px; color: #888; font-size: 13px; text-align: center;">منصة XTOX — سوق إلكتروني مصري ذكي</p>
</div>`;
}

// ─── 2A: Country-specific JS widget for WordPress posts ─────────────────────
export function buildCountryJS(ad) {
  const adId = ad._id?.toString() || '';
  const adCountry = ad.country || 'EG';
  const adTitle = (ad.title || '').replace(/'/g, "\\'");
  const adPrice = ad.price || 0;
  const adCat = (ad.category || '').replace(/'/g, "\\'");
  const adCity = (ad.location || ad.city || '').replace(/'/g, "\\'");

  return `<script>
(function() {
  'use strict';
  
  // ─── Country/Language Data ───────────────────────────────
  var COUNTRIES = {
    EG:{lang:'ar',dir:'rtl',name:'مصر',nameEn:'Egypt',currency:'EGP',label:'إعلانات مصر'},
    SA:{lang:'ar',dir:'rtl',name:'السعودية',nameEn:'Saudi Arabia',currency:'SAR',label:'إعلانات السعودية'},
    AE:{lang:'ar',dir:'rtl',name:'الإمارات',nameEn:'UAE',currency:'AED',label:'إعلانات الإمارات'},
    KW:{lang:'ar',dir:'rtl',name:'الكويت',nameEn:'Kuwait',currency:'KWD',label:'إعلانات الكويت'},
    QA:{lang:'ar',dir:'rtl',name:'قطر',nameEn:'Qatar',currency:'QAR',label:'إعلانات قطر'},
    BH:{lang:'ar',dir:'rtl',name:'البحرين',nameEn:'Bahrain',currency:'BHD',label:'إعلانات البحرين'},
    OM:{lang:'ar',dir:'rtl',name:'عُمان',nameEn:'Oman',currency:'OMR',label:'إعلانات عُمان'},
    JO:{lang:'ar',dir:'rtl',name:'الأردن',nameEn:'Jordan',currency:'JOD',label:'إعلانات الأردن'},
    LB:{lang:'ar',dir:'rtl',name:'لبنان',nameEn:'Lebanon',currency:'LBP',label:'إعلانات لبنان'},
    MA:{lang:'ar',dir:'rtl',name:'المغرب',nameEn:'Morocco',currency:'MAD',label:'إعلانات المغرب'},
    DZ:{lang:'ar',dir:'rtl',name:'الجزائر',nameEn:'Algeria',currency:'DZD',label:'إعلانات الجزائر'},
    TN:{lang:'ar',dir:'rtl',name:'تونس',nameEn:'Tunisia',currency:'TND',label:'إعلانات تونس'},
    LY:{lang:'ar',dir:'rtl',name:'ليبيا',nameEn:'Libya',currency:'LYD',label:'إعلانات ليبيا'},
    IQ:{lang:'ar',dir:'rtl',name:'العراق',nameEn:'Iraq',currency:'IQD',label:'إعلانات العراق'},
    SD:{lang:'ar',dir:'rtl',name:'السودان',nameEn:'Sudan',currency:'SDG',label:'إعلانات السودان'},
    SY:{lang:'ar',dir:'rtl',name:'سوريا',nameEn:'Syria',currency:'SYP',label:'إعلانات سوريا'},
    PS:{lang:'ar',dir:'rtl',name:'فلسطين',nameEn:'Palestine',currency:'ILS',label:'إعلانات فلسطين'},
    YE:{lang:'ar',dir:'rtl',name:'اليمن',nameEn:'Yemen',currency:'YER',label:'إعلانات اليمن'},
    US:{lang:'en',dir:'ltr',name:'USA',nameEn:'United States',currency:'USD',label:'US Ads'},
    GB:{lang:'en',dir:'ltr',name:'UK',nameEn:'United Kingdom',currency:'GBP',label:'UK Ads'},
    FR:{lang:'fr',dir:'ltr',name:'France',nameEn:'France',currency:'EUR',label:'Annonces France'},
    DE:{lang:'de',dir:'ltr',name:'Deutschland',nameEn:'Germany',currency:'EUR',label:'Anzeigen Deutschland'},
    CA:{lang:'en',dir:'ltr',name:'Canada',nameEn:'Canada',currency:'CAD',label:'Canadian Ads'},
    AU:{lang:'en',dir:'ltr',name:'Australia',nameEn:'Australia',currency:'AUD',label:'Australian Ads'},
  };
  
  var AD_COUNTRY = '${adCountry}';
  var AD_ID = '${adId}';
  var API = 'https://xtox-production.up.railway.app';
  var APP_URL = 'https://fox-kohl-eight.vercel.app';

  // ─── Step 1: Detect visitor country ─────────────────────
  function detectCountry(cb) {
    var cached = null, cachedTime = 0;
    try { cached = localStorage.getItem('xtox_wpcountry'); cachedTime = parseInt(localStorage.getItem('xtox_wpcountry_t') || '0'); } catch(e){}
    if (cached && Date.now() - cachedTime < 3600000) return cb(cached);
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = controller ? setTimeout(function(){ controller.abort(); }, 3000) : null;
    fetch('https://ipapi.co/json/', controller ? { signal: controller.signal } : {})
      .then(function(r){ return r.json(); })
      .then(function(d){
        if (timer) clearTimeout(timer);
        var code = (d.country_code || '').toUpperCase();
        if (!code) throw new Error('no code');
        try { localStorage.setItem('xtox_wpcountry', code); localStorage.setItem('xtox_wpcountry_t', Date.now()); } catch(e){}
        cb(code);
      }).catch(function(){
        if (timer) clearTimeout(timer);
        // Fallback: Intl timezone
        var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        var tzMap = {
          'Africa/Cairo':'EG','Asia/Riyadh':'SA','Asia/Dubai':'AE','Asia/Kuwait':'KW',
          'Asia/Qatar':'QA','Asia/Bahrain':'BH','Asia/Muscat':'OM','Asia/Amman':'JO',
          'Asia/Beirut':'LB','Africa/Casablanca':'MA','Africa/Algiers':'DZ',
          'Africa/Tunis':'TN','Africa/Tripoli':'LY','Asia/Baghdad':'IQ',
          'Africa/Khartoum':'SD','Asia/Damascus':'SY','Asia/Gaza':'PS','Asia/Aden':'YE',
          'America/New_York':'US','America/Los_Angeles':'US','America/Chicago':'US',
          'Europe/London':'GB','Europe/Paris':'FR','Europe/Berlin':'DE',
          'America/Toronto':'CA','Australia/Sydney':'AU',
        };
        cb(tzMap[tz] || 'EG');
      });
  }

  // ─── Step 2: Apply language/direction to WP page ─────────
  function applyLanguage(code) {
    var info = COUNTRIES[code] || COUNTRIES['EG'];
    document.documentElement.lang = info.lang;
    document.documentElement.dir = info.dir;
    document.body.style.direction = info.dir;
    document.body.style.textAlign = info.dir === 'rtl' ? 'right' : 'left';
    if (info.dir === 'rtl') {
      var style = document.createElement('style');
      style.textContent = 'body,p,h1,h2,h3,h4,h5,h6,.entry-content,.entry-title{direction:rtl!important;text-align:right!important;font-family:Arial,"Helvetica Neue",sans-serif!important}.widget{direction:rtl!important}';
      document.head.appendChild(style);
    }
  }

  // ─── Step 3: Inject geo + hreflang meta tags ─────────────
  function injectGeoMeta(code) {
    var info = COUNTRIES[code] || COUNTRIES['EG'];
    var metas = [
      ['geo.region', code],['geo.country', code],
      ['language', info.lang],['content-language', info.lang],
    ];
    metas.forEach(function(m) {
      var el = document.querySelector('meta[name="' + m[0] + '"]') || document.createElement('meta');
      el.name = m[0]; el.content = m[1];
      if (!el.parentNode) document.head.appendChild(el);
    });
    var hreflang = document.createElement('link');
    hreflang.rel = 'alternate'; hreflang.hreflang = info.lang; hreflang.href = window.location.href;
    document.head.appendChild(hreflang);
    var xdef = document.createElement('link');
    xdef.rel = 'alternate'; xdef.hreflang = 'x-default'; xdef.href = window.location.href;
    document.head.appendChild(xdef);
    var canonical = document.querySelector('link[rel="canonical"]') || document.createElement('link');
    canonical.rel = 'canonical'; canonical.href = window.location.href;
    if (!canonical.parentNode) document.head.appendChild(canonical);
    document.title = document.title.replace('| XTOX', '| XTOX ' + info.name);
  }

  // ─── Step 4: Inject country-aware structured data ────────
  function injectStructuredData(visitorCode) {
    var info = COUNTRIES[visitorCode] || COUNTRIES['EG'];
    var adInfo = COUNTRIES[AD_COUNTRY] || COUNTRIES['EG'];
    var existing = document.querySelector('script[data-xtox-schema]');
    if (existing) existing.remove();
    var schema = {
      '@context': 'https://schema.org','@type': 'Product',
      'name': '${adTitle}',
      'description': document.querySelector('.entry-content p') ? document.querySelector('.entry-content p').textContent.slice(0,200) : '${adTitle}',
      'offers': {
        '@type': 'Offer','price': '${adPrice}','priceCurrency': adInfo.currency,
        'availability': 'https://schema.org/InStock','url': APP_URL + '/ads/' + AD_ID,
        'areaServed': {'@type': 'Country','name': adInfo.nameEn,'identifier': AD_COUNTRY}
      },
      'inLanguage': info.lang,
      'audience': {'@type': 'Audience','geographicArea': {'@type': 'Country','name': info.nameEn}}
    };
    var script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-xtox-schema', '1');
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
  }

  // ─── Step 5: Load country-filtered ads sidebar ───────────
  function loadCountryAds(visitorCode) {
    var info = COUNTRIES[visitorCode] || COUNTRIES['EG'];
    var container = document.getElementById('xtox-country-ads');
    if (!container) return;
    container.innerHTML = '<p style="color:#94a3b8;font-size:13px;text-align:center">' + (info.lang === 'ar' ? 'جاري تحميل الإعلانات...' : 'Loading ads...') + '</p>';
    fetch(API + '/api/ads?country=' + visitorCode + '&limit=5&sort=-createdAt')
      .then(function(r){ return r.json(); })
      .then(function(d){
        var ads = d.ads || d || [];
        if (!ads.length) {
          container.innerHTML = '<p style="color:#94a3b8;font-size:12px;text-align:center">' + (info.label || 'No ads') + '</p>';
          return;
        }
        container.innerHTML = '<div style="font-weight:700;color:#60a5fa;margin-bottom:10px;font-size:15px">' + info.label + '</div>' +
          ads.map(function(a) {
            var img = (a.images && a.images[0]) || (a.media && a.media[0]) || '';
            return '<a href="' + APP_URL + '/ads/' + a._id + '" target="_blank" style="display:flex;gap:8px;padding:8px;border-radius:8px;background:#1e293b;margin-bottom:6px;text-decoration:none">' +
              (img ? '<img src="' + img + '" width="48" height="48" style="border-radius:6px;object-fit:cover;flex-shrink:0" loading="lazy" />' : '<div style="width:48px;height:48px;border-radius:6px;background:#334155;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:20px">🛒</div>') +
              '<div style="flex:1;min-width:0"><div style="color:white;font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (a.title || '') + '</div>' +
              '<div style="color:#10b981;font-size:12px;font-weight:700">' + (a.price ? a.price + ' ' + info.currency : '') + '</div>' +
              '<div style="color:#64748b;font-size:11px">' + (a.location || '') + '</div></div></a>';
          }).join('') +
          '<a href="' + APP_URL + '/?country=' + visitorCode + '" target="_blank" style="display:block;text-align:center;color:#60a5fa;font-size:13px;margin-top:8px;text-decoration:none">← ' + (info.lang === 'ar' ? 'عرض جميع الإعلانات' : 'View all ads') + '</a>';
      }).catch(function() {
        container.innerHTML = '<a href="' + APP_URL + '" target="_blank" style="color:#60a5fa;font-size:13px">XTOX - ' + (info.label || 'Ads') + '</a>';
      });
  }

  // ─── Step 6: Performance — preload app resources ─────────
  function preloadResources() {
    var links = [
      { rel: 'preconnect', href: 'https://xtox-production.up.railway.app' },
      { rel: 'preconnect', href: 'https://fox-kohl-eight.vercel.app' },
      { rel: 'dns-prefetch', href: 'https://ipapi.co' },
      { rel: 'prefetch', href: APP_URL + '/ads/' + AD_ID },
    ];
    links.forEach(function(l) {
      var el = document.createElement('link');
      el.rel = l.rel; el.href = l.href;
      document.head.appendChild(el);
    });
  }

  // ─── Step 7: IndexNow ping for this page ─────────────────
  function pingIndexNow() {
    var pageUrl = encodeURIComponent(window.location.href);
    new Image().src = 'https://www.bing.com/indexnow?url=' + pageUrl + '&key=xtox2026indexnow';
    new Image().src = 'https://yandex.com/indexnow?url=' + pageUrl + '&key=xtox2026indexnow';
  }

  // ─── Step 8: Social share meta update ────────────────────
  function updateSocialMeta(visitorCode) {
    var info = COUNTRIES[visitorCode] || COUNTRIES['EG'];
    var ogLocale = document.querySelector('meta[property="og:locale"]');
    if (ogLocale) ogLocale.content = info.lang === 'ar' ? 'ar_' + visitorCode : info.lang.toLowerCase();
  }

  // ─── MAIN: Run everything ────────────────────────────────
  preloadResources();
  detectCountry(function(code) {
    applyLanguage(code);
    injectGeoMeta(code);
    injectStructuredData(code);
    updateSocialMeta(code);
    loadCountryAds(code);
    try {
      if (!sessionStorage.getItem('xtox_pinged')) {
        pingIndexNow();
        sessionStorage.setItem('xtox_pinged', '1');
      }
    } catch(e) {}
  });

  // ─── Step 9: Notify search engines of content freshness ──
  var freshness = document.createElement('meta');
  freshness.name = 'revisit-after'; freshness.content = '3 days';
  document.head.appendChild(freshness);
  var robots2 = document.querySelector('meta[name="robots"]');
  if (!robots2) {
    robots2 = document.createElement('meta');
    robots2.name = 'robots';
    document.head.appendChild(robots2);
  }
  robots2.content = 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1';

})();
</script>

<!-- Country-specific ads widget (filled by JS above) -->
<div id="xtox-country-ads" style="background:#0f172a;border-radius:10px;padding:14px;margin-top:20px;direction:rtl;font-family:Arial,sans-serif">
  <p style="color:#94a3b8;text-align:center;font-size:13px">جاري التحميل...</p>
</div>`;
}

// ─── 2C: Build Open Graph + Twitter Card metadata object ────────────────────
function buildOGMetadata(ad, title, excerpt) {
  const appUrl = 'https://fox-kohl-eight.vercel.app';
  const adId = ad._id || ad.id || '';
  const firstImage = (ad.images || ad.media || [])[0] || 'https://fox-kohl-eight.vercel.app/logo192.png';
  const adUrl = `${appUrl}/ads/${adId}`;

  return {
    'og:title': title,
    'og:description': excerpt,
    'og:image': firstImage,
    'og:type': 'product',
    'og:url': adUrl,
    'twitter:card': 'summary_large_image',
    'twitter:title': title,
    'twitter:description': excerpt,
    'twitter:image': firstImage,
  };
}


// ─── Upload featured image to WordPress media library ────────────────────────
async function uploadFeaturedImage(imageUrl) {
  if (!isConfigured() || !imageUrl) return null;
  // Only upload http URLs (skip base64 data: URLs)
  if (!imageUrl.startsWith('http')) return null;
  try {
    const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(8000) });
    if (!imgRes.ok) return null;
    const imgBuffer = await imgRes.arrayBuffer();
    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.includes('png') ? '.png' : contentType.includes('gif') ? '.gif' : '.jpg';

    // WordPress.com media upload uses multipart/form-data
    const { FormData, Blob } = await import('node:buffer').catch(() => ({}));
    // Use native FormData if available, otherwise skip
    if (typeof FormData === 'undefined' && typeof globalThis.FormData === 'undefined') {
      return null;
    }
    const fd = new (globalThis.FormData || FormData)();
    const blob = new (globalThis.Blob || Blob)([imgBuffer], { type: contentType });
    fd.append('media[]', blob, `ad-image${ext}`);

    const mediaRes = await fetch(`${WP_API}/media/new`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getToken()}` },
      body: fd,
      signal: AbortSignal.timeout(20000),
    });
    if (!mediaRes.ok) {
      console.log('[WP-Media] Upload failed:', mediaRes.status);
      return null;
    }
    const mediaData = await mediaRes.json();
    const media = mediaData.media && mediaData.media[0];
    const mediaId = media ? (media.ID || media.id) : null;
    console.log('[WP-Media] Featured image uploaded, ID:', mediaId);
    return mediaId;
  } catch (e) {
    console.log('[WP-Media] Featured image upload failed (non-fatal):', e.message);
    return null;
  }
}

// ─── Create WordPress.com post (with upsert: update if slug exists) ──────────
export async function createWPPost(ad) {
  console.log('[WordPress] createWPPost called, token configured:', !!getToken());
  if (!isConfigured()) {
    console.log('[WordPress.com] WP_ACCESS_TOKEN not set — skipping. Set WP_ACCESS_TOKEN in Railway env vars.');
    return null;
  }

  try {
    const adId = (ad._id || ad.id || '').toString();
    const slug = `xtox-ad-${adId}`;
    const tagNames = buildTags(ad);
    const tagIds = await getOrCreateTags(tagNames, getToken()).catch(() => []);
    const title = buildTitle(ad);
    const excerpt = buildExcerpt(ad);

    // Upload featured image (first image in ad.images) — non-fatal if fails
    const firstImageUrl = (ad.images || ad.media || [])[0] || null;
    const featuredMediaId = await uploadFeaturedImage(firstImageUrl).catch(() => null);
    const content = buildContent(ad);
    const metadata = buildOGMetadata(ad, title, excerpt);

    // Get or create WordPress category for this ad's country (non-blocking fallback to null)
    const countryCatId = await getOrCreateWPCategory(ad.country || 'EG').catch(() => null);

    const postBody = {
      title,
      content,
      status: (ad.status && ad.status !== 'active' && ad.status !== 'publish') ? 'draft' : 'publish',
      slug,
      language: 'ar',
      tags: tagIds,
      excerpt,
      format: 'standard',
      metadata,
      categories: countryCatId ? [countryCatId] : [],
      ...(featuredMediaId ? { featured_image: featuredMediaId } : {}),
    };

    // ── Fix 2: Upsert logic — check if slug already exists ─────────────────
    let existingPostId = ad.wpPostId || null;
    if (!existingPostId && adId) {
      try {
        const slugCheckRes = await fetch(`${WP_API}/posts/slug:${slug}`, {
          headers: authHeaders(),
          signal: AbortSignal.timeout(8000),
        });
        if (slugCheckRes.ok) {
          const existing = await slugCheckRes.json();
          if (existing && existing.ID) {
            existingPostId = String(existing.ID);
            console.log('[WordPress] Found existing post by slug, will UPDATE:', existingPostId);
          }
        }
      } catch (slugErr) {
        console.log('[WordPress] Slug check failed (non-fatal, will create):', slugErr.message);
      }
    }

    let res, endpoint, method;
    if (existingPostId) {
      // UPDATE existing post (PUT via WordPress.com POST to /posts/:id)
      endpoint = `${WP_API}/posts/${existingPostId}`;
      method = 'POST'; // WordPress.com REST uses POST for updates too
      console.log('[WordPress] UPDATE existing post:', existingPostId, '| title:', title.slice(0, 60));
    } else {
      // CREATE new post
      endpoint = `${WP_API}/posts/new`;
      method = 'POST';
      console.log('[WordPress] CREATE new post | title:', title.slice(0, 60));
    }

    res = await fetch(endpoint, {
      method,
      headers: authHeaders(),
      body: JSON.stringify(postBody),
      signal: AbortSignal.timeout(15000),
    });

    const responseText = await res.text();
    console.log('[WordPress] Response status:', res.status);

    if (!res.ok) {
      console.error('[WordPress.com] Create/Update failed:', res.status, responseText.slice(0, 500));
      return null;
    }

    let post;
    try {
      post = JSON.parse(responseText);
    } catch (parseErr) {
      console.error('[WordPress.com] JSON parse error:', parseErr.message, '| body:', responseText.slice(0, 300));
      return null;
    }

    const action = existingPostId ? 'Updated' : 'Created';
    console.log(`[WordPress.com] ✅ Post ${action}:`, post.URL, 'ID:', post.ID);

    // Ping IndexNow (Bing + Yandex) for instant indexing — non-blocking
    if (post.URL) {
      pingIndexNow(post.URL).catch(() => {});
      // Ping Google + Bing sitemap — non-blocking with 5s timeout
      triggerSitemapPing(post.URL);
    }

    // Dedup: clean up any slug duplicates created by retries
    try { await deduplicateWPPosts(adId); } catch (_) {}

    return { wpPostId: String(post.ID), wpPostUrl: post.URL };
  } catch (e) {
    console.error('[WordPress.com] Create/Upsert error:', e.message);
    console.error('[WordPress.com] Stack:', e.stack);
    return null;
  }
}



// ─── Country names map (ISO 2-letter → Arabic name) ────────────────────────
const COUNTRY_NAMES = {
  EG: 'مصر', SA: 'السعودية', AE: 'الإمارات', KW: 'الكويت', QA: 'قطر',
  BH: 'البحرين', JO: 'الأردن', LB: 'لبنان', MA: 'المغرب', DZ: 'الجزائر',
  TN: 'تونس', IQ: 'العراق', LY: 'ليبيا', OM: 'عُمان', YE: 'اليمن',
  SD: 'السودان', SY: 'سوريا', PS: 'فلسطين',
};

// In-process cache to avoid repeated WP API calls for same country
const _catIdCache = {};

// ─── Get or create a WordPress category for a country ──────────────────────
export async function getOrCreateWPCategory(countryCode) {
  if (!countryCode) return null;
  const code = countryCode.toUpperCase();
  if (_catIdCache[code]) return _catIdCache[code];
  try {
    const token = getToken();
    if (!token) return null;
    const slug = 'country-' + code.toLowerCase();
    const name = COUNTRY_NAMES[code] || code;

    // Check if category exists
    const checkResp = await fetch(`${WP_API}/categories?slug=${slug}&number=1`, {
      headers: authHeaders(),
      signal: AbortSignal.timeout(8000),
    });
    if (checkResp.ok) {
      const cats = await checkResp.json();
      const catList = cats.categories || (Array.isArray(cats) ? cats : []);
      if (catList.length > 0) {
        const catId = catList[0].ID || catList[0].id;
        _catIdCache[code] = catId;
        return catId;
      }
    }

    // Create category if not found
    const createResp = await fetch(`${WP_API}/categories/new`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ name, slug, description: `إعلانات ${name} على XTOX` }),
      signal: AbortSignal.timeout(10000),
    });
    if (createResp.ok) {
      const cat = await createResp.json();
      const catId = cat.ID || cat.id || null;
      if (catId) _catIdCache[code] = catId;
      console.log(`[WP-CAT] Created category for ${code}: ID=${catId}`);
      return catId;
    }
    return null;
  } catch (e) {
    console.warn('[WP-CAT] Error for', countryCode, ':', e.message);
    return null;
  }
}

// ─── Deduplicate WordPress posts for an ad (keep oldest, delete extras) ─────
export async function deduplicateWPPosts(adId) {
  try {
    const token = getToken();
    if (!token) return;
    const slug = 'xtox-ad-' + adId;
    // Search for all posts with this slug (including numbered duplicates: slug-2, slug-3)
    const searchUrl = `${WP_API}/posts?slug=${encodeURIComponent(slug)}&status=any&number=20`;
    const resp = await fetch(searchUrl, {
      headers: authHeaders(),
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) return;
    const data = await resp.json();
    const postList = data.posts || (Array.isArray(data) ? data : []);
    if (postList.length <= 1) return; // No duplicates

    // Keep the first (oldest/original), delete the rest
    const [keep, ...dupes] = postList.sort((a, b) => new Date(a.date) - new Date(b.date));
    console.log(`[WP-DEDUP] Ad ${adId}: keeping post ${keep.ID}, deleting ${dupes.length} duplicate(s)`);
    for (const dupe of dupes) {
      await fetch(`${WP_API}/posts/${dupe.ID}/delete`, {
        method: 'POST',
        headers: authHeaders(),
        signal: AbortSignal.timeout(8000),
      }).catch(() => {});
    }
    return keep.ID;
  } catch (e) {
    console.warn('[WP-DEDUP] Error:', e.message);
  }
}

// ─── Delete WordPress.com post ─────────────────────────────────────────────
export async function deleteWPPost(wpPostId) {
  if (!isConfigured() || !wpPostId) return;
  try {
    const res = await fetch(`${WP_API}/posts/${wpPostId}/delete`, {
      method: 'POST',
      headers: authHeaders(),
    });
    if (res.ok) {
      console.log('[WordPress.com] ✅ Post deleted:', wpPostId);
    } else {
      const errText = await res.text().catch(() => '');
      console.error('[WordPress.com] Delete failed:', res.status, errText.slice(0, 200));
    }
  } catch (e) {
    console.error('[WordPress.com] Delete error:', e.message);
  }
}

// ─── Update WordPress.com post ─────────────────────────────────────────────
export async function updateWPPost(wpPostId, ad) {
  if (!isConfigured() || !wpPostId) return;
  try {
    const adId = (ad._id || ad.id || '').toString();
    const slug = `xtox-ad-${adId}`;
    const title = buildTitle(ad);
    const excerpt = buildExcerpt(ad);
    const metadata = buildOGMetadata(ad, title, excerpt);
    const updateTagIds = await getOrCreateTags(buildTags(ad), getToken()).catch(() => []);
    const res = await fetch(`${WP_API}/posts/${wpPostId}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        title,
        content: buildContent(ad),
        excerpt,
        slug,
        language: 'ar',
        metadata,
        tags: updateTagIds,
        status: 'publish',
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) {
      console.log('[WordPress.com] ✅ Post updated:', wpPostId);
      // Ping sitemaps after successful update
      const updated = await res.json().catch(() => ({}));
      if (updated.URL) triggerSitemapPing(updated.URL);
    } else {
      const errText = await res.text().catch(() => '');
      console.error('[WordPress.com] Update failed:', res.status, errText.slice(0, 200));
    }
  } catch (e) {
    console.error('[WordPress.com] Update error:', e.message);
  }
}
