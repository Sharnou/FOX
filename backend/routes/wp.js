import express from 'express';
// Using global fetch (Node 18+ built-in) — avoids node-fetch ESM import issues

const router = express.Router();

const CLIENT_ID = '137369';
const CLIENT_SECRET = 'dpPAaW4LFZIGd9j7Q8ElnIdLge7yfaSvlQhaioDxG080kgR3Dy3QLALLR5AAcxUb';
const REDIRECT_URI = 'https://xtox-production.up.railway.app/api/wp/callback';
const SITE = 'xt0x.wordpress.com';

// Step 1: Visit this URL to start authorization
// GET /api/wp/auth
router.get('/auth', (req, res) => {
  const authUrl = new URL('https://public-api.wordpress.com/oauth2/authorize');
  authUrl.searchParams.set('client_id', CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('blog', SITE);
  authUrl.searchParams.set('scope', 'global');
  res.redirect(authUrl.toString());
});

// Step 2: WordPress.com redirects here with ?code=...
// GET /api/wp/callback
router.get('/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send('Missing code parameter');
  }

  try {
    const tokenRes = await fetch('https://public-api.wordpress.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        code,
        grant_type: 'authorization_code',
      }),
    });

    const data = await tokenRes.json();

    if (!tokenRes.ok || !data.access_token) {
      console.error('[WP OAuth] Token error:', data);
      return res.status(500).json({ error: 'Failed to get token', details: data });
    }

    // Auto-set in process env
    process.env.WP_ACCESS_TOKEN = data.access_token;
    console.log('[WP OAuth] ✅ Got access token and set in process.env');

    res.send(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head><meta charset="UTF-8"><title>XTOX — WordPress Connected!</title>
      <style>
        body { font-family: Arial, sans-serif; background: #0f0f1a; color: #e2e8f0; padding: 40px; text-align: center; }
        .card { background: #1a1a2e; border: 2px solid #6366f1; border-radius: 20px; padding: 32px; max-width: 600px; margin: 0 auto; }
        h1 { color: #6366f1; }
        .token { background: #0f0f1a; border: 1px solid #6366f1; border-radius: 8px; padding: 16px; font-family: monospace; font-size: 13px; word-break: break-all; margin: 16px 0; color: #fbbf24; }
        .step { background: rgba(99,102,241,0.1); border-radius: 12px; padding: 12px 16px; margin: 8px 0; text-align: right; }
      </style>
      </head>
      <body>
        <div class="card">
          <div style="font-size:48px">✅</div>
          <h1>WordPress.com متصل بنجاح!</h1>
          <p>انسخ هذا التوكن وأضفه إلى Railway كـ env var:</p>
          
          <div class="step"><strong>اسم المتغير:</strong> WP_ACCESS_TOKEN</div>
          <div class="token">${data.access_token}</div>
          
          <p style="color:#9ca3af;font-size:13px;">بعد إضافته إلى Railway، سيتم نشر كل إعلان تلقائياً على WordPress!</p>
          
          <div style="margin-top:24px;padding:16px;background:rgba(251,191,36,0.1);border-radius:12px;text-align:right;">
            <strong style="color:#fbbf24;">📋 خطوات Railway:</strong><br>
            1. اذهب إلى Railway → مشروع XTOX → Variables<br>
            2. أضف: <code>WP_ACCESS_TOKEN</code> = القيمة أعلاه<br>
            3. احفظ → سيتم إعادة تشغيل الخادم تلقائياً
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (e) {
    console.error('[WP OAuth] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/wp/status — check if connected and test posting
router.get('/status', async (req, res) => {
  const token = process.env.WP_ACCESS_TOKEN;
  if (!token) {
    return res.json({
      connected: false,
      message: 'WP_ACCESS_TOKEN not set. Visit /api/wp/auth to connect.',
      authUrl: 'https://xtox-production.up.railway.app/api/wp/auth',
    });
  }

  try {
    const testRes = await fetch('https://public-api.wordpress.com/rest/v1.1/me/', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const me = await testRes.json();
    res.json({
      connected: true,
      wpUser: me.display_name || me.username,
      wpEmail: me.email,
      site: 'xt0x.wordpress.com',
      message: '✅ WordPress.com connected and ready!',
    });
  } catch (e) {
    res.status(500).json({ connected: false, error: e.message });
  }
});

// POST /api/wp/sync-ad/:id — manually sync a specific ad to WordPress (for testing)
router.post('/sync-ad/:id', async (req, res) => {
  try {
    const { default: Ad } = await import('../models/Ad.js');
    const { createWPPost } = await import('../utils/wordpress.js');

    const ad = await Ad.findById(req.params.id);
    if (!ad) return res.status(404).json({ error: 'Ad not found' });

    console.log('[WordPress] Manual sync for ad:', ad._id, ad.title);
    const result = await createWPPost(ad.toObject());

    if (result) {
      await Ad.findByIdAndUpdate(ad._id, {
        wpPostId: result.wpPostId,
        wpPostUrl: result.wpPostUrl,
      });
      res.json({ ok: true, wpPostId: result.wpPostId, wpPostUrl: result.wpPostUrl });
    } else {
      res.status(500).json({ error: 'createWPPost returned null — check Railway logs. Ensure WP_ACCESS_TOKEN is set.' });
    }
  } catch (e) {
    console.error('[WP sync-ad] Error:', e.message, e.stack);
    res.status(500).json({ error: e.message, stack: e.stack });
  }
});

// 2K: POST /api/wp/sync-all — sync all active ads that don't have wpPostId yet
// Batches of 5, rate limit 1 per second, returns progress
router.post('/sync-all', async (req, res) => {
  try {
    const { default: Ad } = await import('../models/Ad.js');
    const { createWPPost } = await import('../utils/wordpress.js');

    if (!process.env.WP_ACCESS_TOKEN) {
      return res.status(400).json({ error: 'WP_ACCESS_TOKEN not set' });
    }

    const ads = await Ad.find({
      isDeleted: { $ne: true },
      isExpired: { $ne: true },
      $or: [{ wpPostId: null }, { wpPostId: { $exists: false } }],
    }).limit(200);

    const total = ads.length;
    res.json({
      message: `Syncing ${total} ads in background (batches of 5, 1/sec rate limit)...`,
      total,
    });

    // Process in background — batches of 5
    (async () => {
      let synced = 0, failed = 0;
      const BATCH_SIZE = 5;

      for (let i = 0; i < ads.length; i += BATCH_SIZE) {
        const batch = ads.slice(i, i + BATCH_SIZE);
        console.log(`[WP sync-all] Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (ads ${i + 1}-${Math.min(i + BATCH_SIZE, total)} of ${total})`);

        for (const ad of batch) {
          try {
            const result = await createWPPost(ad.toObject());
            if (result) {
              await Ad.findByIdAndUpdate(ad._id, {
                wpPostId: result.wpPostId,
                wpPostUrl: result.wpPostUrl,
              });
              synced++;
              console.log(`[WP sync-all] ✅ [${synced}/${total}] "${ad.title}" → ${result.wpPostUrl}`);
            } else {
              failed++;
              console.warn(`[WP sync-all] ⚠️ null result for ad ${ad._id} "${ad.title}"`);
            }
            // Rate limit: 1 per second between posts to avoid WP API throttling
            await new Promise(r => setTimeout(r, 1000));
          } catch (e) {
            failed++;
            console.error(`[WP sync-all] ❌ Error syncing ad ${ad._id}:`, e.message);
          }
        }

        // Brief pause between batches
        if (i + BATCH_SIZE < ads.length) {
          await new Promise(r => setTimeout(r, 2000));
        }
      }

      console.log(`[WP sync-all] ✅ Complete: synced=${synced}, failed=${failed}, total=${total}`);
    })();
  } catch (e) {
    console.error('[WP sync-all] Fatal error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/wp/get-token — Try to get WP token via password grant
router.post('/get-token', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password required' });
  }
  try {
    const tokenRes = await fetch('https://public-api.wordpress.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'password',
        username,
        password,
        blog: SITE,
      }),
    });
    const data = await tokenRes.json();
    if (!tokenRes.ok || !data.access_token) {
      console.error('[WP get-token] Failed:', data);
      return res.status(400).json({ error: 'Failed to get token', details: data });
    }
    process.env.WP_ACCESS_TOKEN = data.access_token;
    console.log('[WP get-token] ✅ Token obtained and set in process.env');
    res.json({
      success: true,
      message: 'Token obtained! Copy to Railway env var WP_ACCESS_TOKEN:',
      token: data.access_token,
      note: 'Token is set in memory for this session. Add to Railway env vars for persistence.',
    });
  } catch (e) {
    console.error('[WP get-token] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── 2J: Comprehensive WordPress site setup ────────────────────────────────
// Exported for use by server startup
export async function setupWordPressSite() {
  const token = process.env.WP_ACCESS_TOKEN;
  if (!token) {
    console.log('[WP Setup] Skipped — WP_ACCESS_TOKEN not set');
    return { skipped: true };
  }

  const WP_API_BASE = `https://public-api.wordpress.com/rest/v1.1/sites/${SITE}`;
  const authH = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const formH = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' };
  const results = [];

  async function wpPost(endpoint, body, useForm = false) {
    const r = await fetch(WP_API_BASE + endpoint, {
      method: 'POST',
      headers: useForm ? formH : authH,
      body: useForm ? new URLSearchParams(body).toString() : JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, data };
  }

  async function wpGet(endpoint) {
    const r = await fetch(WP_API_BASE + endpoint, { headers: authH });
    return r.ok ? await r.json().catch(() => null) : null;
  }

  console.log('[WP Setup] Starting comprehensive WordPress site setup...');

  // 1. Update site settings: name, tagline, language, timezone
  try {
    const r = await wpPost('/settings', {
      blogname: 'XTOX - سوق محلي عربي',
      blogdescription: 'أكبر سوق محلي عربي - بيع واشتري مجاناً | إعلانات مبوبة',
      lang_id: 'ar',
      timezone: 'Africa/Cairo',
    }, true);
    if (r.ok) {
      console.log('[WP Setup] ✅ Site settings updated (name, tagline, language=ar, timezone=Cairo)');
      results.push('settings: OK');
    } else {
      console.error('[WP Setup] ❌ Settings failed:', r.status, JSON.stringify(r.data).slice(0, 200));
      results.push('settings: FAILED');
    }
  } catch (e) { console.error('[WP Setup] Settings error:', e.message); results.push('settings: ERROR'); }

  // 2. Create categories: all 12 standard Arabic categories
  const CATEGORIES = ['سيارات', 'موبايلات', 'إلكترونيات', 'عقارات', 'أثاث', 'ملابس', 'وظائف', 'خدمات', 'حيوانات', 'رياضة', 'كتب', 'أخرى'];
  try {
    const existingCats = await wpGet('/categories?number=100');
    const existingNames = new Set((existingCats?.categories || []).map(c => c.name));
    let catCreated = 0;
    for (const catName of CATEGORIES) {
      if (!existingNames.has(catName)) {
        const r = await wpPost('/categories/new', { name: catName, description: `إعلانات ${catName} في XTOX` });
        if (r.ok) { catCreated++; console.log(`[WP Setup] ✅ Category created: ${catName}`); }
        else console.warn(`[WP Setup] Category "${catName}" failed:`, r.data?.message || r.status);
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    results.push(`categories: ${catCreated} created, ${CATEGORIES.length - catCreated} existed`);
  } catch (e) { console.error('[WP Setup] Categories error:', e.message); results.push('categories: ERROR'); }

  // 3. Create "من نحن" (About XTOX) page if missing
  try {
    const pagesData = await wpGet('/pages/?number=50');
    const pages = pagesData?.pages || [];
    const pageTitles = pages.map(p => (p.title || '').toLowerCase());

    if (!pageTitles.some(t => t.includes('من نحن') || t.includes('about'))) {
      const r = await wpPost('/posts/new', {
        title: 'من نحن | XTOX السوق المحلي العربي',
        type: 'page',
        status: 'publish',
        content: `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;">
<h1 style="color:#6366f1;">🌟 من نحن — XTOX</h1>
<p style="font-size:18px;line-height:2;">XTOX هو السوق المحلي العربي الأول الذي يربط البائعين بالمشترين في جميع أنحاء العالم العربي.</p>
<h2>🎯 مهمتنا</h2>
<p>نوفر منصة مجانية آمنة وسهلة لنشر الإعلانات المبوبة وإتمام الصفقات بشكل مباشر بين الأفراد.</p>
<h2>✨ مميزاتنا</h2>
<ul style="line-height:2.5;">
<li>🆓 <strong>مجاني 100%</strong> — بدون عمولات أو رسوم خفية</li>
<li>📞 <strong>مكالمات صوتية</strong> — تواصل مع البائع مباشرة</li>
<li>💬 <strong>دردشة آمنة</strong> — محادثات مشفرة</li>
<li>🏆 <strong>مسابقة بائع الشهر</strong> — جوائز نقدية للأفضل</li>
<li>🌍 <strong>جميع الدول العربية</strong> — مصر، السعودية، الإمارات وأكثر</li>
<li>📱 <strong>تطبيق PWA</strong> — يعمل على كل الأجهزة</li>
</ul>
<h2>📱 ابدأ الآن</h2>
<p><a href="https://fox-kohl-eight.vercel.app" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:16px;">🚀 افتح التطبيق مجاناً</a></p>
<p style="margin-top:20px;color:#6b7280;">📧 للتواصل: <a href="mailto:xtox.noreply@gmail.com">xtox.noreply@gmail.com</a></p>
</div>`,
      });
      if (r.ok) { console.log('[WP Setup] ✅ About page created:', r.data.URL); results.push('about-page: created'); }
      else { console.error('[WP Setup] About page failed:', r.data); results.push('about-page: FAILED'); }
    } else {
      results.push('about-page: existed');
    }

    // 4. Create "حمّل التطبيق" PWA install page
    if (!pageTitles.some(t => t.includes('تطبيق') || t.includes('download') || t.includes('install'))) {
      const r = await wpPost('/posts/new', {
        title: 'حمّل تطبيق XTOX مجاناً',
        type: 'page',
        status: 'publish',
        content: `<div dir="rtl" style="font-family:Arial,sans-serif;text-align:center;padding:40px 20px;">
<h1 style="color:#6366f1;font-size:32px;">📱 حمّل تطبيق XTOX</h1>
<p style="font-size:18px;">تطبيق PWA — يعمل على الموبايل والكمبيوتر بدون متجر تطبيقات</p>
<div style="margin:30px 0;">
<a href="https://fox-kohl-eight.vercel.app/install" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:16px 40px;border-radius:50px;font-size:20px;font-weight:bold;text-decoration:none;margin:10px;">
📲 تحميل XTOX الآن
</a>
</div>
<h2>كيفية التثبيت:</h2>
<ol style="text-align:right;max-width:400px;margin:0 auto;line-height:2.5;">
<li>افتح الرابط: <a href="https://fox-kohl-eight.vercel.app">fox-kohl-eight.vercel.app</a></li>
<li>اضغط على قائمة المتصفح (⋮)</li>
<li>اختر "إضافة إلى الشاشة الرئيسية"</li>
<li>اضغط "إضافة" ← تم!</li>
</ol>
</div>`,
      });
      if (r.ok) { console.log('[WP Setup] ✅ Install page created:', r.data.URL); results.push('install-page: created'); }
      else { results.push('install-page: FAILED'); }
    } else {
      results.push('install-page: existed');
    }
  } catch (e) { console.error('[WP Setup] Pages error:', e.message); results.push('pages: ERROR'); }

  // 5. Create/update welcome sticky post if no posts exist
  try {
    const postsData = await wpGet('/posts/?number=5&type=post');
    const posts = postsData?.posts || [];

    if (posts.length === 0) {
      const r = await wpPost('/posts/new', {
        title: 'مرحباً بك في XTOX - السوق المحلي العربي الجديد',
        status: 'publish',
        format: 'standard',
        tags: 'XTOX,سوق,بيع,شراء,إعلانات,عربي,مجاني,سوق محلي,إعلانات مبوبة',
        sticky: true,
        excerpt: 'XTOX هو السوق المحلي العربي الأول — بيع واشتري مجاناً بدون عمولة | إعلانات مبوبة في مصر والسعودية والإمارات وجميع الدول العربية',
        content: `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;">
<h1 style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:20px;border-radius:16px;text-align:center;">🌟 مرحباً بك في XTOX!</h1>
<p style="font-size:18px;line-height:2;text-align:center;">XTOX هو السوق المحلي العربي الذي يربط البائعين بالمشترين في جميع أنحاء العالم العربي. <strong>مجاني 100%، آمن وسهل الاستخدام.</strong></p>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:24px 0;">
<div style="background:#f0f7ff;border-radius:12px;padding:16px;"><h3>🛒 للمشترين</h3><p>تصفح آلاف الإعلانات، تواصل مباشرة، احصل على أفضل الأسعار.</p></div>
<div style="background:#f0fff4;border-radius:12px;padding:16px;"><h3>💼 للبائعين</h3><p>انشر إعلانك مجاناً، احصل على مشترين محتملين فوراً.</p></div>
</div>
<div style="text-align:center;margin:32px 0;">
<a href="https://fox-kohl-eight.vercel.app" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:16px 40px;border-radius:50px;font-size:20px;font-weight:bold;text-decoration:none;">🚀 ابدأ الآن مجاناً</a>
</div>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"WebSite","name":"XTOX","url":"https://fox-kohl-eight.vercel.app","description":"السوق المحلي العربي الأول للإعلانات المبوبة المجانية","potentialAction":{"@type":"SearchAction","target":"https://fox-kohl-eight.vercel.app/search?q={search_term_string}","query-input":"required name=search_term_string"}}
</script>
</div>`,
      });
      if (r.ok) { console.log('[WP Setup] ✅ Welcome post created:', r.data.URL); results.push('welcome-post: created'); }
      else { results.push('welcome-post: FAILED'); }
    } else {
      // Make first post sticky
      if (!posts[0].sticky) {
        await wpPost(`/posts/${posts[0].ID}`, { sticky: '1' }, true);
        console.log('[WP Setup] ✅ First post set as sticky');
      }
      results.push(`welcome-post: existed (${posts.length} posts)`);
    }
  } catch (e) { console.error('[WP Setup] Posts error:', e.message); results.push('posts: ERROR'); }

  console.log('[WP Setup] ✅ Setup complete! Results:', results.join(', '));
  // 3B: Apply professional Arabic RTL theme CSS
  try {
    const customCSS = `
/* XTOX WordPress Theme - Professional Arabic RTL */
body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif !important; direction: rtl !important; }
.entry-title { font-size: 1.8em; color: #1e3a5f; font-weight: 700; }
.entry-content { font-size: 1.1em; line-height: 1.8; color: #333; }
.site-title { font-size: 2em; font-weight: 900; color: #2563eb !important; }
.site-title a { color: #2563eb !important; text-decoration: none !important; }
.site-description { color: #666; font-size: 0.95em; }
.site-header { background: #0f172a !important; padding: 20px !important; border-bottom: 3px solid #2563eb; }
.site-header .site-title a { color: white !important; }
.site-header .site-description { color: #94a3b8 !important; }
.main-navigation a { color: #cbd5e1 !important; font-weight: 600; }
.main-navigation a:hover { color: #60a5fa !important; }
.entry-header { border-right: 4px solid #2563eb; padding-right: 16px; margin-bottom: 20px; }
img.attachment-post-thumbnail { border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); width: 100%; }
.widget-title { color: #2563eb; font-weight: 700; border-bottom: 2px solid #2563eb; padding-bottom: 8px; }
.wp-block-separator { border-color: #e2e8f0; }
a { color: #2563eb; }
a:hover { color: #1d4ed8; }
.site-footer { background: #0f172a !important; color: #94a3b8 !important; padding: 30px !important; text-align: center; }
.site-footer a { color: #60a5fa !important; }
.blog .entry-title { font-size: 1.3em; }
.blog .entry-summary { color: #555; font-size: 0.95em; line-height: 1.6; }
.widget_recent_entries ul li { text-align: right; }
.comment-list { direction: rtl; }
.comment-form { direction: rtl; }
.xtox-price-badge { background: #10b981; color: white; padding: 4px 12px; border-radius: 20px; font-weight: 700; display: inline-block; margin: 8px 0; }
.post-categories a { background: #eff6ff; color: #2563eb; padding: 3px 10px; border-radius: 12px; font-size: 0.85em; text-decoration: none; margin: 2px; display: inline-block; }
`;
    const cssRes = await fetch(`https://public-api.wordpress.com/rest/v1.1/sites/${SITE}/settings`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ 'custom_css': customCSS }).toString()
    });
    if (cssRes.ok) {
      console.log('[WP Setup] ✅ Custom CSS applied');
      results.push('custom-css: OK');
    } else {
      const cssErr = await cssRes.text().catch(() => '');
      console.warn('[WP Setup] Custom CSS failed:', cssRes.status, cssErr.slice(0, 200));
      results.push('custom-css: FAILED');
    }
  } catch (cssErr) {
    console.warn('[WP Setup] Custom CSS error (non-fatal):', cssErr.message);
    results.push('custom-css: ERROR');
  }

  return { ok: true, results };
}

// POST /api/wp/setup-site — HTTP endpoint (triggers setupWordPressSite)
router.post('/setup-site', async (req, res) => {
  const token = process.env.WP_ACCESS_TOKEN;
  if (!token) {
    return res.status(400).json({
      error: 'WP_ACCESS_TOKEN not set',
      hint: 'Visit /api/wp/auth or POST /api/wp/get-token to get a token first',
    });
  }

  // Respond immediately, run setup in background
  res.json({ message: 'WordPress site setup started in background. Check Railway logs for progress.' });

  setupWordPressSite().catch(e => console.error('[WP Setup] Fatal error:', e.message));
});

export default router;
