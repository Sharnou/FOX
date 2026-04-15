import express from 'express';
import nodeFetch from 'node-fetch';

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
    const tokenRes = await nodeFetch('https://public-api.wordpress.com/oauth2/token', {
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
    const testRes = await nodeFetch('https://public-api.wordpress.com/rest/v1.1/me/', {
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

export default router;
