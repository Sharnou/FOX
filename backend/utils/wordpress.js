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
  const desc = (ad.description || ad.title || '').slice(0, 120);
  const price = ad.price ? `${Number(ad.price).toLocaleString()} ${ad.currency || 'جنيه'}` : '';
  const city = ad.city || ad.location || '';
  let excerpt = desc;
  if (price) excerpt += ` — السعر: ${price}`;
  if (city) excerpt += ` — ${city}`;
  excerpt += ' | XTOX سوق محلي';
  return excerpt;
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
function pingGoogle(postUrl) {
  try {
    // Google sitemap notification
    fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent('https://xt0x.wordpress.com/sitemap.xml')}`, { method: 'GET' }).catch(() => {});
    console.log('[Google] Pinged sitemap for:', postUrl);
  } catch (e) {
    console.log('[Google] Ping failed (non-critical):', e.message);
  }
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
  const appUrl = 'https://fox-kohl-eight.vercel.app';
  const adId = ad._id || ad.id || '';
  const adLink = `${appUrl}/ads/${adId}`;
  const installLink = `${appUrl}/install`;
  const keywords = generateKeywords(ad).join(', ');
  const wpPostUrl = ad.wpPostUrl || `https://xt0x.wordpress.com/?p=${adId}`;
  const category = ad.category || ad.subCategory || 'إعلانات';
  const city = ad.city || ad.location || '';
  const sellerName = ad.sellerName || ad.userName || 'XTOX Seller';
  const firstImage = (ad.images || ad.media || [])[0] || 'https://fox-kohl-eight.vercel.app/logo192.png';

  const imagesHtml = (ad.images || ad.media || []).slice(0, 6).map((src, i) =>
    `<img src="${src}" alt="${(ad.title||'').replace(/"/g,'')}" style="max-width:100%;border-radius:12px;margin:8px 0;" loading="lazy"/>`
  ).join('\n');

  const videoHtml = ad.video
    ? `<video controls preload="metadata" style="max-width:100%;border-radius:12px;margin:12px 0;"><source src="${ad.video}" type="video/mp4"></video>`
    : '';

  const priceBlock = ad.price
    ? `<div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:16px;border-radius:12px;font-size:24px;font-weight:bold;text-align:center;margin:16px 0;">💰 ${Number(ad.price).toLocaleString()} ${ad.currency || 'ج.م'}</div>`
    : '';

  // 2D: Schema.org Product markup (exact spec)
  const priceCurrency = ad.currency === 'ريال' ? 'SAR' : ad.currency === 'درهم' ? 'AED' : ad.currency === 'KWD' ? 'KWD' : 'EGP';
  const schemaBlock = `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "${(ad.title || '').replace(/"/g, '\\"').replace(/\n/g, ' ')}",
  "description": "${(ad.description || ad.title || '').slice(0, 300).replace(/"/g, '\\"').replace(/\n/g, ' ')}",
  "image": "${firstImage}",
  "offers": {
    "@type": "Offer",
    "price": "${ad.price || 0}",
    "priceCurrency": "${priceCurrency}",
    "availability": "https://schema.org/InStock",
    "url": "${adLink}"
  },
  "seller": {
    "@type": "Person",
    "name": "${sellerName.replace(/"/g, '\\"')}"
  }
}
</script>`;

  // 2E: Call-to-Action Footer (exact spec)
  const ctaBlock = `<hr>
<div style="background:#f0f7ff;border-radius:8px;padding:16px;text-align:center;margin-top:20px">
  <p style="font-size:18px;font-weight:bold">🔥 هل أعجبك هذا الإعلان؟</p>
  <a href="${adLink}"
     style="background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:16px">
     👀 عرض الإعلان الكامل والتواصل مع البائع
  </a>
  <p style="margin-top:12px;font-size:14px">
    📱 <a href="${appUrl}">XTOX</a> — السوق المحلي العربي الأول | إعلانات مجانية | محادثة مباشرة | مكالمات صوتية
  </p>
</div>`;

  // 2I: Related Posts Section (exact spec)
  const relatedBlock = `<p style="margin-top:16px">
  🔍 <strong>تصفح المزيد:</strong>
  <a href="https://xt0x.wordpress.com/?cat=${encodeURIComponent(category)}">المزيد من إعلانات ${category}</a> |
  <a href="https://xt0x.wordpress.com/">جميع الإعلانات</a>
</p>`;

  const pwaWidget = buildPWAWidget(adId);
  
  return `<div dir="rtl" style="font-family:'Segoe UI',Tahoma,Arial,sans-serif;">

${pwaWidget}

<div style="background:linear-gradient(135deg,#1e1b4b,#312e81);border-radius:16px;padding:20px;margin-bottom:20px;border:2px solid rgba(99,102,241,0.4);">
<h2 style="color:#fff;margin:0 0 8px;">${ad.title || ''}</h2>
<p style="color:#a5b4fc;margin:0;font-size:14px;">${city ? `📍 ${city} &nbsp;|&nbsp;` : ''}${category ? `🏷️ ${category} &nbsp;|&nbsp;` : ''}👁️ ${ad.views || 0} مشاهدة</p>
${priceBlock}
</div>

${imagesHtml}
${videoHtml}

${ad.description ? `<div style="background:#f8f9ff;border-radius:12px;padding:16px;margin:16px 0;border-right:4px solid #6366f1;"><h3 style="color:#6366f1;margin:0 0 8px;">📝 تفاصيل الإعلان</h3><p style="line-height:1.8;margin:0;">${ad.description}</p></div>` : ''}

<div style="text-align:center;margin:28px 0;">
<a href="${adLink}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:16px 36px;border-radius:50px;font-size:17px;font-weight:bold;margin:6px;">🔍 عرض الإعلان في التطبيق</a>
<br><br>
<a href="${installLink}" style="display:inline-block;background:linear-gradient(135deg,#059669,#10b981);color:#fff;text-decoration:none;padding:12px 28px;border-radius:50px;font-size:15px;font-weight:bold;">📲 تحميل XTOX مجاناً</a>
</div>

<div style="background:#fffbeb;border-radius:12px;padding:16px;border:1px solid #fbbf24;">
<h3 style="color:#b45309;margin:0 0 10px;">⭐ لماذا XTOX؟</h3>
<ul style="line-height:2.2;padding-right:20px;margin:0;font-size:14px;">
<li>🆓 نشر مجاني بدون عمولة</li>
<li>📞 مكالمات صوتية مع البائع</li>
<li>💬 دردشة آمنة ومشفرة</li>
<li>🏆 مسابقة بائع الشهر بجوائز حقيقية</li>
<li>🌍 جميع الدول العربية</li>
</ul>
</div>

${ctaBlock}
${relatedBlock}

<p style="font-size:1px;color:#fff;line-height:1;">${keywords}</p>
<p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px;">نُشر تلقائياً من <a href="${appUrl}">تطبيق XTOX</a></p>
${schemaBlock}
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

// ─── Create WordPress.com post ─────────────────────────────────────────────
export async function createWPPost(ad) {
  console.log('[WordPress] createWPPost called, token configured:', !!getToken());
  if (!isConfigured()) {
    console.log('[WordPress.com] WP_ACCESS_TOKEN not set — skipping. Set WP_ACCESS_TOKEN in Railway env vars.');
    return null;
  }

  try {
    const tags = generateKeywords(ad).slice(0, 15).join(',');
    const title = buildTitle(ad);
    const excerpt = buildExcerpt(ad);
    const content = buildContent(ad);
    const metadata = buildOGMetadata(ad, title, excerpt);

    console.log('[WordPress] Posting title:', title);
    console.log('[WordPress] API URL:', `${WP_API}/posts/new`);
    console.log('[WordPress] Tags:', tags.slice(0, 80));

    const res = await fetch(`${WP_API}/posts/new`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        title,
        content,
        status: 'publish',
        tags,
        excerpt,
        format: 'standard',
        metadata,
      }),
    });

    const responseText = await res.text();
    console.log('[WordPress] Response status:', res.status);

    if (!res.ok) {
      console.error('[WordPress.com] Create failed:', res.status, responseText.slice(0, 500));
      return null;
    }

    let post;
    try {
      post = JSON.parse(responseText);
    } catch (parseErr) {
      console.error('[WordPress.com] JSON parse error:', parseErr.message, '| body:', responseText.slice(0, 300));
      return null;
    }

    console.log('[WordPress.com] ✅ Post created:', post.URL, 'ID:', post.ID);

    // 2F: Ping IndexNow (Bing + Yandex) for instant indexing — non-blocking
    if (post.URL) {
      pingIndexNow(post.URL).catch(() => {});
      // 2G: Ping Google sitemap
      pingGoogle(post.URL);
    }

    return { wpPostId: String(post.ID), wpPostUrl: post.URL };
  } catch (e) {
    console.error('[WordPress.com] Create error:', e.message);
    console.error('[WordPress.com] Stack:', e.stack);
    return null;
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
    const title = buildTitle(ad);
    const excerpt = buildExcerpt(ad);
    const metadata = buildOGMetadata(ad, title, excerpt);
    const res = await fetch(`${WP_API}/posts/${wpPostId}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        title,
        content: buildContent(ad),
        excerpt,
        metadata,
        tags: generateKeywords(ad).slice(0, 15).join(','),
      }),
    });
    if (res.ok) console.log('[WordPress.com] ✅ Post updated:', wpPostId);
    else console.error('[WordPress.com] Update failed:', res.status);
  } catch (e) {
    console.error('[WordPress.com] Update error:', e.message);
  }
}
