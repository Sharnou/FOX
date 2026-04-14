import { google } from 'googleapis';

const BLOG_ID = process.env.BLOGGER_BLOG_ID;

function getBloggerClient() {
  const oauth2 = new google.auth.OAuth2(
    process.env.BLOGGER_CLIENT_ID,
    process.env.BLOGGER_CLIENT_SECRET,
    'https://xtox-production.up.railway.app/api/blogger/oauth/callback'
  );
  oauth2.setCredentials({
    refresh_token: process.env.BLOGGER_REFRESH_TOKEN,
  });
  return google.blogger({ version: 'v3', auth: oauth2 });
}

// Generate smart SEO keywords from ad data
function generateKeywords(ad) {
  const base = ['XTOX', 'سوق XTOX', 'إعلانات مبوبة', 'بيع وشراء', 'سوق عربي'];

  const catMap = {
    'cars': ['سيارات للبيع', 'car for sale', 'سيارة مستعملة', 'أوتوموبيل'],
    'real_estate': ['عقارات', 'شقق للبيع', 'real estate', 'إيجار', 'apartment'],
    'electronics': ['إلكترونيات', 'electronics', 'موبايل', 'لاب توب', 'أجهزة'],
    'furniture': ['أثاث', 'furniture', 'ديكور', 'منزل'],
    'jobs': ['وظائف', 'jobs', 'فرص عمل', 'توظيف'],
    'fashion': ['ملابس', 'fashion', 'موضة', 'أزياء'],
    'animals': ['حيوانات أليفة', 'pets', 'كلاب', 'قطط'],
    'services': ['خدمات', 'services', 'عمال', 'صيانة'],
  };

  const cat = (ad.category || '').toLowerCase();
  const catKeys = Object.entries(catMap).find(([k]) => cat.includes(k))?.[1] || [];

  const locationKeys = ad.city ? [
    ad.city, `${ad.city} للبيع`, `إعلانات ${ad.city}`,
    `${ad.city} بيع وشراء`
  ] : [];

  const priceKeys = ad.price ? [
    `${ad.price} جنيه`, `${ad.price} ريال`, `${ad.price} درهم`,
    ad.price < 500 ? 'رخيص' : ad.price < 2000 ? 'سعر معقول' : 'فاخر'
  ] : [];

  const titleWords = (ad.title || '').split(/\s+/).filter(w => w.length > 3);

  return [...new Set([...base, ...catKeys, ...locationKeys, ...priceKeys, ...titleWords])].join(', ');
}

function generatePostTitle(ad) {
  const price = ad.price ? ` — ${Number(ad.price).toLocaleString()} ${ad.currency || 'ج.م'}` : '';
  const location = ad.city ? ` | ${ad.city}` : '';
  return `${ad.title}${price}${location} | سوق XTOX`;
}

function generatePostBody(ad) {
  const appUrl = 'https://fox-kohl-eight.vercel.app';
  const adDeepLink = `${appUrl}/redirect?adId=${ad._id}`;
  const installUrl = `${appUrl}/install`;
  const keywords = generateKeywords(ad);

  const imagesHtml = (ad.images || ad.media || []).slice(0, 6).map((img, i) => `
    <div style="margin:8px;display:inline-block;">
      <img src="${img}" alt="${ad.title} - صورة ${i+1}"
           style="width:300px;height:225px;object-fit:cover;border-radius:12px;border:2px solid #6366f1;"
           loading="lazy" />
    </div>
  `).join('');

  const videoHtml = ad.video ? `
    <div style="margin:16px 0;text-align:center;">
      <video controls style="max-width:100%;border-radius:12px;border:2px solid #6366f1;" preload="metadata">
        <source src="${ad.video}" type="video/mp4">
      </video>
    </div>
  ` : '';

  const priceHtml = ad.price ? `
    <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:16px 24px;border-radius:16px;font-size:28px;font-weight:bold;text-align:center;margin:16px 0;">
      💰 ${Number(ad.price).toLocaleString()} ${ad.currency || 'ج.م'}
    </div>
  ` : '';

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<meta name="keywords" content="${keywords}">
<meta name="description" content="${(ad.description || ad.title || '').slice(0, 160)}">
</head>
<body style="font-family:'Segoe UI',Arial,sans-serif;background:#0f0f1a;color:#e2e8f0;margin:0;padding:0;direction:rtl;">

<div style="max-width:800px;margin:0 auto;padding:20px;">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 100%);border-radius:20px;padding:24px;margin-bottom:24px;border:1px solid rgba(99,102,241,0.3);">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
      <span style="font-size:32px;">🏷️</span>
      <div>
        <h1 style="margin:0;font-size:24px;color:#fff;font-weight:800;">${ad.title}</h1>
        <div style="color:#a5b4fc;font-size:14px;margin-top:4px;">
          ${ad.city ? `📍 ${ad.city} &nbsp;|&nbsp;` : ''}
          ${ad.category ? `🏷️ ${ad.category} &nbsp;|&nbsp;` : ''}
          👁️ ${ad.views || 0} مشاهدة
        </div>
      </div>
    </div>
    ${priceHtml}
  </div>

  <!-- Images -->
  ${imagesHtml ? `
  <div style="background:#1a1a2e;border-radius:16px;padding:16px;margin-bottom:24px;border:1px solid rgba(99,102,241,0.2);">
    <h3 style="color:#a5b4fc;margin:0 0 12px;">📸 صور الإعلان</h3>
    <div style="text-align:center;">${imagesHtml}</div>
  </div>
  ` : ''}

  <!-- Video -->
  ${videoHtml}

  <!-- Description -->
  ${ad.description ? `
  <div style="background:#1a1a2e;border-radius:16px;padding:20px;margin-bottom:24px;border:1px solid rgba(99,102,241,0.2);">
    <h3 style="color:#a5b4fc;margin:0 0 12px;">📝 تفاصيل الإعلان</h3>
    <p style="color:#e2e8f0;line-height:1.8;font-size:16px;margin:0;">${ad.description}</p>
  </div>
  ` : ''}

  <!-- Seller info -->
  <div style="background:#1a1a2e;border-radius:16px;padding:16px;margin-bottom:24px;border:1px solid rgba(99,102,241,0.2);">
    <h3 style="color:#a5b4fc;margin:0 0 12px;">👤 معلومات البائع</h3>
    <div style="color:#e2e8f0;">
      ${ad.sellerName ? `<strong>${ad.sellerName}</strong>` : 'بائع موثوق على XTOX'}
      ${ad.city ? `<br>📍 ${ad.city}` : ''}
    </div>
  </div>

  <!-- CTA Buttons -->
  <div style="text-align:center;margin:32px 0;">
    <a href="${adDeepLink}"
       style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:18px 40px;border-radius:50px;font-size:18px;font-weight:bold;margin:8px;box-shadow:0 8px 32px rgba(99,102,241,0.4);">
      🔍 عرض الإعلان في التطبيق
    </a>
    <br>
    <a href="${installUrl}"
       style="display:inline-block;background:linear-gradient(135deg,#059669,#10b981);color:#fff;text-decoration:none;padding:14px 32px;border-radius:50px;font-size:16px;font-weight:bold;margin:8px;">
      📲 تحميل تطبيق XTOX مجاناً
    </a>
  </div>

  <!-- About XTOX -->
  <div style="background:linear-gradient(135deg,#1e1b4b,#312e81);border-radius:16px;padding:20px;margin-bottom:24px;border:1px solid rgba(99,102,241,0.3);">
    <h3 style="color:#fbbf24;margin:0 0 12px;">⭐ لماذا XTOX؟</h3>
    <ul style="color:#e2e8f0;line-height:2;padding-right:20px;margin:0;">
      <li>🆓 النشر مجاني — لا عمولة</li>
      <li>📞 تواصل مباشر مع البائع عبر المحادثة أو المكالمة الصوتية</li>
      <li>🔔 إشعارات فورية للرسائل والمكالمات</li>
      <li>⭐ نظام تقييم وسمعة البائعين</li>
      <li>🏆 مسابقة بائع الشهر مع جوائز حقيقية</li>
      <li>🌍 إعلانات من جميع الدول العربية</li>
    </ul>
  </div>

  <!-- Keywords (hidden for SEO) -->
  <div style="color:#0f0f1a;font-size:1px;line-height:1;">${keywords}</div>

  <!-- Footer -->
  <div style="text-align:center;color:#6b7280;font-size:13px;padding:16px 0;border-top:1px solid rgba(99,102,241,0.2);">
    نُشر على <a href="${appUrl}" style="color:#6366f1;">XTOX</a> — السوق المحلي العربي الذكي
    <br>
    <a href="${installUrl}" style="color:#6366f1;">حمّل التطبيق الآن</a>
  </div>

</div>
</body>
</html>`;
}

export async function createBloggerPost(ad) {
  if (!BLOG_ID || !process.env.BLOGGER_REFRESH_TOKEN) return null;
  try {
    const blogger = getBloggerClient();
    const title = generatePostTitle(ad);
    const content = generatePostBody(ad);
    const labels = generateKeywords(ad).split(', ').slice(0, 20);

    const res = await blogger.posts.insert({
      blogId: BLOG_ID,
      requestBody: { title, content, labels, status: 'LIVE' },
    });

    console.log(`[Blogger] Post created: ${res.data.url}`);
    return { postId: res.data.id, postUrl: res.data.url };
  } catch (e) {
    console.error('[Blogger] Failed to create post:', e.message);
    return null;
  }
}

export async function deleteBloggerPost(postId) {
  if (!BLOG_ID || !process.env.BLOGGER_REFRESH_TOKEN || !postId) return;
  try {
    const blogger = getBloggerClient();
    await blogger.posts.delete({ blogId: BLOG_ID, postId });
    console.log(`[Blogger] Post deleted: ${postId}`);
  } catch (e) {
    console.error('[Blogger] Failed to delete post:', e.message);
  }
}

export async function updateBloggerPost(postId, ad) {
  if (!BLOG_ID || !process.env.BLOGGER_REFRESH_TOKEN || !postId) return;
  try {
    const blogger = getBloggerClient();
    await blogger.posts.update({
      blogId: BLOG_ID,
      postId,
      requestBody: {
        title: generatePostTitle(ad),
        content: generatePostBody(ad),
        labels: generateKeywords(ad).split(', ').slice(0, 20),
      },
    });
    console.log(`[Blogger] Post updated: ${postId}`);
  } catch (e) {
    console.error('[Blogger] Failed to update post:', e.message);
  }
}

export { generateKeywords, generatePostTitle };
