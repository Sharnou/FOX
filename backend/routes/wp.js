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

    console.log('[WP OAuth] ✅ Got access token');

    // Return the token clearly so user can copy it to Railway
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
      res.status(500).json({ error: 'createWPPost returned null — check Railway logs' });
    }
  } catch (e) {
    console.error('[WP sync-ad] Error:', e.message, e.stack);
    res.status(500).json({ error: e.message, stack: e.stack });
  }
});

// POST /api/wp/sync-all — sync all active ads that don't have wpPostId yet
router.post('/sync-all', async (req, res) => {
  try {
    const { default: Ad } = await import('../models/Ad.js');
    const { createWPPost } = await import('../utils/wordpress.js');

    const ads = await Ad.find({ isDeleted: { $ne: true }, isExpired: { $ne: true }, wpPostId: null }).limit(50);
    res.json({ message: `Syncing ${ads.length} ads in background...`, count: ads.length });

    // Process in background
    (async () => {
      let success = 0, fail = 0;
      for (const ad of ads) {
        try {
          const result = await createWPPost(ad.toObject());
          if (result) {
            await Ad.findByIdAndUpdate(ad._id, { wpPostId: result.wpPostId, wpPostUrl: result.wpPostUrl });
            success++;
            console.log(`[WordPress] Synced "${ad.title}" → ${result.wpPostUrl}`);
          } else {
            fail++;
            console.warn(`[WordPress] sync-all: null result for ad ${ad._id}`);
          }
          // Rate limit: 1 post per 2 seconds to avoid WordPress API throttling
          await new Promise(r => setTimeout(r, 2000));
        } catch (e) {
          fail++;
          console.error('[WordPress] Sync error for', ad._id, e.message);
        }
      }
      console.log(`[WordPress] Bulk sync done: ${success} success, ${fail} fail`);
    })();
  } catch (e) {
    console.error('[WP sync-all] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});


// GET /api/wp/get-token — Try to get WP token via password grant (fallback when OAuth not possible)
// This is useful for initial setup on Railway — visit this URL once to auto-set token in memory
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
    // Set token in process env (persists for this process lifetime)
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


// POST /api/wp/setup-site — Comprehensive WordPress site setup (C1-C5)
// Requires WP_ACCESS_TOKEN to be set in env
router.post('/setup-site', async (req, res) => {
  const token = process.env.WP_ACCESS_TOKEN;
  if (!token) {
    return res.status(400).json({ 
      error: 'WP_ACCESS_TOKEN not set',
      hint: 'Visit /api/wp/auth or POST /api/wp/get-token to get a token first'
    });
  }

  const WP_API = `https://public-api.wordpress.com/rest/v1.1/sites/${SITE}`;
  const authH = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const formH = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' };
  const results = [];

  async function wpPost(endpoint, body, useForm = false) {
    const res = await fetch(WP_API + endpoint, {
      method: 'POST',
      headers: useForm ? formH : authH,
      body: useForm ? new URLSearchParams(body).toString() : JSON.stringify(body),
    });
    const data = await res.json();
    return { ok: res.ok, data };
  }

  async function wpGet(endpoint) {
    const res = await fetch(WP_API + endpoint, { headers: authH });
    return res.ok ? await res.json() : null;
  }

  res.json({ message: 'WordPress site setup started in background. Check Railway logs for progress.' });

  // Run setup in background
  (async () => {
    console.log('[WP Setup] Starting comprehensive site setup...');

    // C1: Update site settings
    try {
      const r = await wpPost('/settings', { blogname: 'XTOX - سوق محلي عربي', blogdescription: 'أكبر سوق محلي عربي - بيع واشتري بكل سهولة', lang_id: 'ar' }, true);
      if (r.ok) console.log('[WP Setup] ✅ Site settings updated');
      else console.error('[WP Setup] ❌ Settings failed:', r.data);
    } catch(e) { console.error('[WP Setup] Settings error:', e.message); }

    // C2: Check and create pages
    try {
      const pagesData = await wpGet('/pages/?number=50');
      const pages = (pagesData && pagesData.pages) || [];
      const titles = pages.map(p => (p.title || '').toLowerCase());

      if (!titles.some(t => t.includes('من نحن') || t.includes('about'))) {
        const r = await wpPost('/posts/new', { title: 'من نحن', type: 'page', status: 'publish', content: '<div dir="rtl"><h1>مرحباً بك في XTOX</h1><p>XTOX هو سوق محلي عربي مجاني. <a href="https://fox-kohl-eight.vercel.app">ابدأ الآن →</a></p></div>' });
        if (r.ok) console.log('[WP Setup] ✅ About page created:', r.data.URL);
      }

      if (!titles.some(t => t.includes('تواصل') || t.includes('contact'))) {
        const r = await wpPost('/posts/new', { title: 'تواصل معنا', type: 'page', status: 'publish', content: '<div dir="rtl"><h1>تواصل معنا</h1><p>📧 <a href="mailto:xtox.noreply@gmail.com">xtox.noreply@gmail.com</a></p></div>' });
        if (r.ok) console.log('[WP Setup] ✅ Contact page created');
      }

      if (!titles.some(t => t.includes('تطبيق') || t.includes('download'))) {
        const r = await wpPost('/posts/new', { title: 'حمّل التطبيق', type: 'page', status: 'publish', content: '<div dir="rtl"><h1>حمّل تطبيق XTOX</h1><p><a href="https://fox-kohl-eight.vercel.app">افتح التطبيق →</a></p></div>' });
        if (r.ok) console.log('[WP Setup] ✅ Download page created');
      }
    } catch(e) { console.error('[WP Setup] Pages error:', e.message); }

    // C3/C4: Handle posts
    try {
      const postsData = await wpGet('/posts/?number=10&type=post');
      const posts = (postsData && postsData.posts) || [];

      if (posts.length > 0) {
        // Make first post sticky
        if (!posts[0].sticky) {
          const r = await wpPost(`/posts/${posts[0].ID}`, { sticky: '1' }, true);
          if (r.ok) console.log('[WP Setup] ✅ First post set as sticky');
        }
        // C5: Update posts without tags
        for (const post of posts) {
          if (!post.tags || Object.keys(post.tags).length === 0) {
            await wpPost(`/posts/${post.ID}`, { tags: 'سوق,بيع,شراء,إعلانات,عربي' }, true);
            console.log('[WP Setup] ✅ Updated tags for:', post.title.slice(0, 40));
            await new Promise(r => setTimeout(r, 500));
          }
        }
      } else {
        // C4: Create welcome post
        const r = await wpPost('/posts/new', {
          title: 'مرحباً بك في XTOX - السوق المحلي العربي الجديد',
          status: 'publish',
          format: 'standard',
          tags: 'سوق,بيع,شراء,إعلانات,عربي,مجاني',
          sticky: true,
          content: '<div dir="rtl"><h1>🌟 مرحباً بك في XTOX!</h1><p>XTOX هو السوق المحلي العربي الذي يربط البائعين بالمشترين في جميع أنحاء العالم العربي. مجاني 100%، آمن وسهل الاستخدام.</p><p><a href="https://fox-kohl-eight.vercel.app">ابدأ الآن مجاناً →</a></p></div>',
        });
        if (r.ok) console.log('[WP Setup] ✅ Welcome post created:', r.data.URL);
        else console.error('[WP Setup] ❌ Welcome post failed:', r.data);
      }
    } catch(e) { console.error('[WP Setup] Posts error:', e.message); }

    console.log('[WP Setup] ✅ Setup complete!');
  })();
});

export default router;
