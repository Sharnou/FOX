import nodeFetch from 'node-fetch';

const WP_URL = process.env.WP_SITE_URL; // e.g. https://xt0x.wordpress.com
const WP_USER = process.env.WP_USERNAME;
const WP_PASS = process.env.WP_APP_PASSWORD; // Application Password from WP profile

function getAuthHeader() {
  const creds = Buffer.from(`${WP_USER}:${WP_PASS}`).toString('base64');
  return `Basic ${creds}`;
}

function isConfigured() {
  return WP_URL && WP_USER && WP_PASS;
}

// ─── Smart keyword generator ───────────────────────────────────────────────
function generateKeywords(ad) {
  const base = ['XTOX', 'سوق XTOX', 'إعلانات مبوبة', 'بيع وشراء', 'سوق عربي', 'مستعمل', 'للبيع'];
  
  const catMap = {
    'car': ['سيارات للبيع', 'car for sale', 'سيارة مستعملة', 'أوتو'],
    'real': ['عقارات', 'شقق للبيع', 'real estate', 'إيجار', 'apartment'],
    'electron': ['إلكترونيات', 'electronics', 'موبايل', 'لاب توب', 'phone'],
    'furn': ['أثاث', 'furniture', 'ديكور', 'منزل'],
    'job': ['وظائف', 'jobs', 'فرص عمل', 'توظيف', 'عمل'],
    'fashion': ['ملابس', 'fashion', 'موضة', 'أزياء'],
    'animal': ['حيوانات', 'pets', 'كلاب', 'قطط', 'animals'],
    'service': ['خدمات', 'services', 'صيانة', 'تركيب'],
  };
  
  const cat = (ad.category || '').toLowerCase();
  const catKeys = Object.entries(catMap).find(([k]) => cat.includes(k))?.[1] || [];
  
  const cityKeys = ad.city ? [
    ad.city, `${ad.city} للبيع`, `إعلانات ${ad.city}`, `بيع وشراء ${ad.city}`
  ] : [];
  
  const priceKeys = ad.price ? [
    `${ad.price.toLocaleString()} جنيه`,
    ad.price < 500 ? 'رخيص جداً' : ad.price < 2000 ? 'سعر معقول' : ad.price < 10000 ? 'جودة عالية' : 'فاخر'
  ] : [];
  
  const titleWords = (ad.title || '').split(/\s+/).filter(w => w.length > 2);
  
  return [...new Set([...base, ...catKeys, ...cityKeys, ...priceKeys, ...titleWords])];
}

// ─── Build SEO post title ──────────────────────────────────────────────────
function buildTitle(ad) {
  const price = ad.price ? ` — ${Number(ad.price).toLocaleString()} ج.م` : '';
  const city = ad.city ? ` | ${ad.city}` : '';
  return `${ad.title}${price}${city} | سوق XTOX`;
}

// ─── Build rich HTML post content ─────────────────────────────────────────
function buildContent(ad) {
  const appUrl = 'https://fox-kohl-eight.vercel.app';
  const adLink = `${appUrl}/redirect?adId=${ad._id}`;
  const installLink = `${appUrl}/install`;
  const keywords = generateKeywords(ad).join(', ');

  const imagesHtml = (ad.images || []).slice(0, 6).map((src, i) =>
    `<figure class="wp-block-image"><img src="${src}" alt="${ad.title} صورة ${i + 1}" style="max-width:100%;border-radius:12px;" loading="lazy"/></figure>`
  ).join('\n');

  const videoHtml = ad.video
    ? `<figure class="wp-block-video"><video controls preload="metadata" style="max-width:100%;border-radius:12px;"><source src="${ad.video}" type="video/mp4"></video></figure>`
    : '';

  const priceBlock = ad.price
    ? `<div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:16px 24px;border-radius:16px;font-size:26px;font-weight:bold;text-align:center;margin:20px 0;">💰 ${Number(ad.price).toLocaleString()} ${ad.currency || 'ج.م'}</div>`
    : '';

  return `<!-- wp:html -->
<div dir="rtl" style="font-family:'Segoe UI',Tahoma,Arial,sans-serif;background:#0f0f1a;color:#e2e8f0;padding:20px;border-radius:16px;">

  <!-- Ad header -->
  <div style="background:linear-gradient(135deg,#1e1b4b,#312e81);border-radius:16px;padding:20px;margin-bottom:20px;border:1px solid rgba(99,102,241,0.3);">
    <h1 style="color:#fff;font-size:22px;margin:0 0 8px;">${ad.title}</h1>
    <div style="color:#a5b4fc;font-size:13px;">
      ${ad.city ? `📍 ${ad.city} &nbsp;|&nbsp;` : ''}
      ${ad.category ? `🏷️ ${ad.category} &nbsp;|&nbsp;` : ''}
      👁️ ${ad.views || 0} مشاهدة
    </div>
    ${priceBlock}
  </div>

  <!-- Images -->
  ${imagesHtml}

  <!-- Video -->
  ${videoHtml}

  <!-- Description -->
  ${ad.description ? `
  <div style="background:#1a1a2e;border-radius:12px;padding:16px;margin:16px 0;border:1px solid rgba(99,102,241,0.2);">
    <h2 style="color:#a5b4fc;font-size:16px;margin:0 0 10px;">📝 تفاصيل الإعلان</h2>
    <p style="color:#e2e8f0;line-height:1.8;margin:0;">${ad.description}</p>
  </div>` : ''}

  <!-- Seller info -->
  <div style="background:#1a1a2e;border-radius:12px;padding:14px;margin:14px 0;border:1px solid rgba(99,102,241,0.2);">
    <h2 style="color:#a5b4fc;font-size:15px;margin:0 0 8px;">👤 البائع</h2>
    <div style="color:#e2e8f0;">${ad.sellerName || 'بائع موثوق على XTOX'}${ad.city ? `<br>📍 ${ad.city}` : ''}</div>
  </div>

  <!-- CTA -->
  <div style="text-align:center;margin:28px 0;">
    <a href="${adLink}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:16px 36px;border-radius:50px;font-size:17px;font-weight:bold;margin:6px;box-shadow:0 6px 24px rgba(99,102,241,0.4);">
      🔍 عرض الإعلان في التطبيق
    </a>
    <br>
    <a href="${installLink}" style="display:inline-block;background:linear-gradient(135deg,#059669,#10b981);color:#fff;text-decoration:none;padding:12px 28px;border-radius:50px;font-size:15px;font-weight:bold;margin:6px;">
      📲 تحميل XTOX مجاناً
    </a>
  </div>

  <!-- Why XTOX -->
  <div style="background:linear-gradient(135deg,#1e1b4b,#312e81);border-radius:12px;padding:16px;border:1px solid rgba(99,102,241,0.3);">
    <h2 style="color:#fbbf24;font-size:15px;margin:0 0 10px;">⭐ لماذا XTOX؟</h2>
    <ul style="color:#e2e8f0;line-height:2.2;padding-right:20px;margin:0;font-size:14px;">
      <li>🆓 نشر مجاني بدون عمولة</li>
      <li>📞 مكالمات صوتية مع البائع مباشرة</li>
      <li>💬 دردشة آمنة ومشفرة</li>
      <li>🔔 إشعارات فورية</li>
      <li>🏆 مسابقة بائع الشهر بجوائز حقيقية</li>
      <li>🌍 جميع الدول العربية</li>
    </ul>
  </div>

  <!-- SEO keywords (invisible) -->
  <p style="font-size:1px;color:#0f0f1a;line-height:1;">${keywords}</p>

  <div style="text-align:center;margin-top:20px;color:#4b5563;font-size:12px;">
    نُشر تلقائياً من <a href="${appUrl}" style="color:#6366f1;">تطبيق XTOX</a>
  </div>
</div>
<!-- /wp:html -->`;
}

// ─── Ensure tags exist and return their IDs ────────────────────────────────
async function ensureTags(keywords) {
  if (!isConfigured()) return [];
  const tagIds = [];
  for (const kw of keywords.slice(0, 10)) {
    try {
      // Try to create — if exists, WP returns the existing one
      const res = await nodeFetch(`${WP_URL}/wp-json/wp/v2/tags`, {
        method: 'POST',
        headers: {
          'Authorization': getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: kw }),
      });
      const tag = await res.json();
      if (tag.id) tagIds.push(tag.id);
      else if (tag.code === 'term_exists') tagIds.push(tag.data?.term_id);
    } catch {}
  }
  return tagIds.filter(Boolean);
}

// ─── Create WordPress post ─────────────────────────────────────────────────
async function createWPPost(ad) {
  if (!isConfigured()) {
    console.log('[WordPress] Not configured — skipping post creation');
    return null;
  }
  try {
    const tags = await ensureTags(generateKeywords(ad).slice(0, 10));
    
    const res = await nodeFetch(`${WP_URL}/wp-json/wp/v2/posts`, {
      method: 'POST',
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: buildTitle(ad),
        content: buildContent(ad),
        status: 'publish',
        tags,
        excerpt: (ad.description || ad.title || '').slice(0, 200),
        featured_media: 0,
        format: 'standard',
        meta: {
          _yoast_wpseo_title: buildTitle(ad),
          _yoast_wpseo_metadesc: (ad.description || ad.title || '').slice(0, 160),
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[WordPress] Create failed:', res.status, err.slice(0, 200));
      return null;
    }

    const post = await res.json();
    console.log('[WordPress] Post created:', post.link);
    return { wpPostId: String(post.id), wpPostUrl: post.link };
  } catch (e) {
    console.error('[WordPress] Create error:', e.message);
    return null;
  }
}

// ─── Delete WordPress post ─────────────────────────────────────────────────
async function deleteWPPost(wpPostId) {
  if (!isConfigured() || !wpPostId) return;
  try {
    const res = await nodeFetch(`${WP_URL}/wp-json/wp/v2/posts/${wpPostId}?force=true`, {
      method: 'DELETE',
      headers: { 'Authorization': getAuthHeader() },
    });
    if (res.ok) {
      console.log('[WordPress] Post deleted:', wpPostId);
    } else {
      console.error('[WordPress] Delete failed:', res.status);
    }
  } catch (e) {
    console.error('[WordPress] Delete error:', e.message);
  }
}

// ─── Update WordPress post ─────────────────────────────────────────────────
async function updateWPPost(wpPostId, ad) {
  if (!isConfigured() || !wpPostId) return;
  try {
    const res = await nodeFetch(`${WP_URL}/wp-json/wp/v2/posts/${wpPostId}`, {
      method: 'POST',
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: buildTitle(ad),
        content: buildContent(ad),
        excerpt: (ad.description || ad.title || '').slice(0, 200),
      }),
    });
    if (res.ok) console.log('[WordPress] Post updated:', wpPostId);
    else console.error('[WordPress] Update failed:', res.status);
  } catch (e) {
    console.error('[WordPress] Update error:', e.message);
  }
}

export { createWPPost, deleteWPPost, updateWPPost, generateKeywords, buildTitle };
