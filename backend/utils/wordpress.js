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

// ─── Smart keyword generator ───────────────────────────────────────────────
function generateKeywords(ad) {
  const base = ['XTOX', 'سوق XTOX', 'إعلانات مبوبة', 'بيع وشراء', 'سوق عربي', 'مستعمل', 'للبيع'];

  const catMap = {
    'car': ['سيارات للبيع', 'car for sale', 'سيارة مستعملة'],
    'real': ['عقارات', 'شقق للبيع', 'real estate', 'إيجار'],
    'electron': ['إلكترونيات', 'electronics', 'موبايل', 'لاب توب'],
    'furn': ['أثاث', 'furniture', 'ديكور', 'منزل'],
    'job': ['وظائف', 'jobs', 'فرص عمل', 'توظيف'],
    'fashion': ['ملابس', 'fashion', 'موضة', 'أزياء'],
    'animal': ['حيوانات', 'pets', 'كلاب', 'قطط'],
    'service': ['خدمات', 'services', 'صيانة'],
  };

  const cat = (ad.category || '').toLowerCase();
  const catKeys = Object.entries(catMap).find(([k]) => cat.includes(k))?.[1] || [];

  const cityKeys = ad.city ? [
    ad.city, `${ad.city} للبيع`, `إعلانات ${ad.city}`,
  ] : [];

  const priceKeys = ad.price ? [
    `${Number(ad.price).toLocaleString()} جنيه`,
    ad.price < 500 ? 'رخيص جداً' : ad.price < 5000 ? 'سعر معقول' : 'فاخر',
  ] : [];

  const titleWords = (ad.title || '').split(/\s+/).filter(w => w.length > 2);

  return [...new Set([...base, ...catKeys, ...cityKeys, ...priceKeys, ...titleWords])];
}

function buildTitle(ad) {
  const price = ad.price ? ` — ${Number(ad.price).toLocaleString()} ج.م` : '';
  const city = ad.city ? ` | ${ad.city}` : '';
  return `${ad.title}${price}${city} | سوق XTOX`;
}

function buildContent(ad) {
  const appUrl = 'https://fox-kohl-eight.vercel.app';
  const adLink = `${appUrl}/redirect?adId=${ad._id}`;
  const installLink = `${appUrl}/install`;
  const keywords = generateKeywords(ad).join(', ');

  const imagesHtml = (ad.images || ad.media || []).slice(0, 6).map((src, i) =>
    `<img src="${src}" alt="${ad.title} صورة ${i + 1}" style="max-width:100%;border-radius:12px;margin:8px 0;" loading="lazy"/>`
  ).join('\n');

  const videoHtml = ad.video
    ? `<video controls preload="metadata" style="max-width:100%;border-radius:12px;margin:12px 0;"><source src="${ad.video}" type="video/mp4"></video>`
    : '';

  const priceBlock = ad.price
    ? `<div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:16px;border-radius:12px;font-size:24px;font-weight:bold;text-align:center;margin:16px 0;">💰 ${Number(ad.price).toLocaleString()} ${ad.currency || 'ج.م'}</div>`
    : '';

  return `<div dir="rtl" style="font-family:'Segoe UI',Tahoma,Arial,sans-serif;">

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

export { generateKeywords, buildTitle };
