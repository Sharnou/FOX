// Use global fetch (Node 18+ built-in) — avoids node-fetch ESM import issues
// import nodeFetch from 'node-fetch'; // REMOVED — use globalThis.fetch instead

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
  food: {
    ar: ['مطعم للبيع','كافيه','مشروع غذائي','منتجات عضوية','طعام منزلي','حلويات','مخبز','عصائر','توصيل طعام','وجبات سريعة'],
    en: ['restaurant for sale','cafe','food project','organic products','home food','sweets','bakery','juices','food delivery'],
  },
  edu: {
    ar: ['كتب للبيع','كتب مستعملة','كتب دراسية','مواد تعليمية','دورات تدريبية','تعليم لغات','شهادات','معلم خصوصي','كورسات','دراسة في الخارج'],
    en: ['books for sale','used books','textbooks','educational materials','training courses','language learning','certificates','tutoring','online courses'],
  },
  tool: {
    ar: ['أدوات للبيع','معدات للبيع','ماكينات للبيع','أدوات كهربائية','عدة يدوية','معدات زراعية','معدات بناء','جرار','مضخة مياه'],
    en: ['tools for sale','equipment','machines','power tools','hand tools','agricultural equipment','construction equipment'],
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

// ─── Ultra-smart keyword generator — returns 20-30 highly targeted keywords ──
export function generateKeywords(ad) {
  const keywords = new Set();

  // 1. Always include base XTOX keywords
  ['XTOX', 'سوق XTOX', 'إعلانات مبوبة', 'بيع وشراء', 'سوق عربي', 'إعلان مجاني'].forEach(k => keywords.add(k));

  // 2. Category keywords
  const cat = (ad.category || ad.subCategory || '').toLowerCase();
  const catEntry = Object.entries(CAT_KEYWORDS).find(([k]) => cat.includes(k));
  if (catEntry) {
    const [, catKws] = catEntry;
    catKws.ar.slice(0, 8).forEach(k => keywords.add(k));
    catKws.en.slice(0, 4).forEach(k => keywords.add(k));
  }

  // 3. City keywords (city itself + "للبيع في X" + "إعلانات X")
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

  // 5. Price keywords
  if (ad.price) {
    const p = Number(ad.price);
    keywords.add(`${p.toLocaleString()} جنيه`);
    if (p < 200) keywords.add('رخيص جداً');
    else if (p < 1000) keywords.add('سعر رخيص');
    else if (p < 5000) keywords.add('سعر معقول');
    else if (p < 20000) keywords.add('سعر مناسب');
    else keywords.add('سعر تفاوضي');
  }

  // 6. Intent keywords (pick 5 relevant ones)
  INTENT_KEYWORDS.slice(0, 5).forEach(k => keywords.add(k));

  // 7. Title words as keywords (each word > 3 chars)
  (ad.title || '').split(/\s+/).filter(w => w.length > 3).slice(0, 6).forEach(k => keywords.add(k));

  // 8. Condition/state
  if (ad.condition === 'new' || ad.condition === 'جديد') keywords.add('جديد');
  else if (ad.condition) keywords.add('مستعمل');

  return [...keywords].slice(0, 20); // WordPress tag limit friendly
}

// ─── SEO-optimized title ─────────────────────────────────────────────────────
export function buildTitle(ad) {
  // Formula: [Title] | [Price] [Currency] | [City] | سوق XTOX
  const parts = [ad.title];
  if (ad.price) parts.push(`${Number(ad.price).toLocaleString()} ${ad.currency || 'ج.م'}`);
  if (ad.city) parts.push(ad.city);
  parts.push('XTOX');
  return parts.join(' | ');
}

// ─── IndexNow ping (Bing + Yandex instant indexing) ─────────────────────────
async function pingIndexNow(postUrl) {
  const INDEXNOW_KEY = 'xtox-indexnow-key-2026';
  const indexNowUrl = `https://api.indexnow.org/indexnow?url=${encodeURIComponent(postUrl)}&key=${INDEXNOW_KEY}`;
  try {
    const r = await fetch(indexNowUrl);
    console.log('[IndexNow] Pinged:', r.status, postUrl);
  } catch (e) {
    console.log('[IndexNow] Ping failed (non-critical):', e.message);
  }
}

function buildContent(ad) {
  const appUrl = 'https://fox-kohl-eight.vercel.app';
  const adLink = `${appUrl}/redirect?adId=${ad._id}`;
  const installLink = `${appUrl}/install`;
  const keywords = generateKeywords(ad).join(', ');
  const wpPostUrl = ad.wpPostUrl || `https://xt0x.wordpress.com/?p=${ad._id}`;

  const imagesHtml = (ad.images || ad.media || []).slice(0, 6).map((src, i) =>
    `<img src="${src}" alt="${ad.title} صورة ${i + 1}" style="max-width:100%;border-radius:12px;margin:8px 0;" loading="lazy"/>`
  ).join('\n');

  const videoHtml = ad.video
    ? `<video controls preload="metadata" style="max-width:100%;border-radius:12px;margin:12px 0;"><source src="${ad.video}" type="video/mp4"></video>`
    : '';

  const priceBlock = ad.price
    ? `<div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:16px;border-radius:12px;font-size:24px;font-weight:bold;text-align:center;margin:16px 0;">💰 ${Number(ad.price).toLocaleString()} ${ad.currency || 'ج.م'}</div>`
    : '';

  // Schema.org Product markup
  const priceCurrency = ad.currency === 'ريال' ? 'SAR' : ad.currency === 'درهم' ? 'AED' : 'EGP';
  const schemaBlock = `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "${(ad.title || '').replace(/"/g, '\\"')}",
  "description": "${(ad.description || ad.title || '').slice(0, 200).replace(/"/g, '\\"')}",
  "image": ${JSON.stringify((ad.images || []).slice(0, 3))},
  "offers": {
    "@type": "Offer",
    "priceCurrency": "${priceCurrency}",
    "price": "${ad.price || 0}",
    "availability": "https://schema.org/InStock",
    "url": "${adLink}",
    "seller": {
      "@type": "Person",
      "name": "${(ad.sellerName || 'XTOX Seller').replace(/"/g, '\\"')}"
    }
  },
  "brand": {
    "@type": "Brand",
    "name": "XTOX"
  }
}
</script>`;

  return `<div dir="rtl" style="font-family:'Segoe UI',Tahoma,Arial,sans-serif;">

<link rel="canonical" href="${wpPostUrl}" />

<div style="background:linear-gradient(135deg,#1e1b4b,#312e81);border-radius:16px;padding:20px;margin-bottom:20px;border:2px solid rgba(99,102,241,0.4);">
<h2 style="color:#fff;margin:0 0 8px;">${ad.title}</h2>
<p style="color:#a5b4fc;margin:0;font-size:14px;">${ad.city ? `📍 ${ad.city} &nbsp;|&nbsp;` : ''}${ad.category ? `🏷️ ${ad.category} &nbsp;|&nbsp;` : ''}👁️ ${ad.views || 0} مشاهدة</p>
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

<p style="font-size:1px;color:#fff;line-height:1;">${keywords}</p>
<p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px;">نُشر تلقائياً من <a href="${appUrl}">تطبيق XTOX</a></p>
${schemaBlock}
</div>`;
}

// ─── Create WordPress.com post ─────────────────────────────────────────────
export async function createWPPost(ad) {
  console.log('[WordPress] createWPPost called, token configured:', !!getToken());
  if (!isConfigured()) {
    console.log('[WordPress.com] WP_ACCESS_TOKEN not set — skipping');
    return null;
  }

  try {
    const tags = generateKeywords(ad).slice(0, 10).join(',');
    const title = buildTitle(ad);
    const content = buildContent(ad);

    console.log('[WordPress] Posting title:', title);
    console.log('[WordPress] API URL:', `${WP_API}/posts/new`);

    const res = await fetch(`${WP_API}/posts/new`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        title,
        content,
        status: 'publish',
        tags,
        excerpt: (ad.description || ad.title || '').slice(0, 200),
        format: 'standard',
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

    // Ping IndexNow (Bing + Yandex) for instant indexing — non-blocking
    if (post.URL) {
      pingIndexNow(post.URL).catch(() => {});
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
    const res = await fetch(`${WP_API}/posts/${wpPostId}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        title: buildTitle(ad),
        content: buildContent(ad),
        excerpt: (ad.description || ad.title || '').slice(0, 200),
      }),
    });
    if (res.ok) console.log('[WordPress.com] ✅ Post updated:', wpPostId);
    else console.error('[WordPress.com] Update failed:', res.status);
  } catch (e) {
    console.error('[WordPress.com] Update error:', e.message);
  }
}
