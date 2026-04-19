#!/usr/bin/env node
/**
 * WordPress Site Setup Script for xt0x.wordpress.com
 *
 * Run with:
 *   WP_ACCESS_TOKEN=your_token node backend/scripts/setup-wordpress.js
 *
 * Get a token:
 *   1. Visit: https://xtox-production.up.railway.app/api/wp/auth
 *   2. Or POST /api/wp/save-token with { token: "..." }
 *   3. Or use the Railway dashboard env var WP_ACCESS_TOKEN
 */

const TOKEN = process.env.WP_ACCESS_TOKEN;
const SITE  = 'xt0x.wordpress.com';
const API   = `https://public-api.wordpress.com/rest/v1.1/sites/${SITE}`;

if (!TOKEN) {
  console.error('❌ WP_ACCESS_TOKEN is not set!');
  console.log('   Get one at: https://xtox-production.up.railway.app/api/wp/auth');
  process.exit(1);
}

const jsonHeaders = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};
const formHeaders = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/x-www-form-urlencoded',
};

async function get(endpoint) {
  const res = await fetch(API + endpoint, { headers: jsonHeaders });
  const data = await res.json();
  if (data.error) { console.warn(`⚠️  GET ${endpoint}:`, data.error, data.message); return null; }
  return data;
}

async function post(endpoint, body) {
  const isForm = typeof body === 'string' || body instanceof URLSearchParams;
  const res = await fetch(API + endpoint, {
    method: 'POST',
    headers: isForm ? formHeaders : jsonHeaders,
    body: isForm ? body : JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    console.error(`❌ POST ${endpoint} failed:`, JSON.stringify(data).slice(0, 200));
    return null;
  }
  return data;
}

async function formPost(endpoint, params) {
  return post(endpoint, new URLSearchParams(params));
}

// ─── Helper: check if page with title exists ─────────────────────────────────
async function pageExists(pages, keywords) {
  return pages.some(p =>
    keywords.some(kw => (p.title || '').toLowerCase().includes(kw.toLowerCase()))
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 WordPress site setup starting for', SITE);
  console.log('   Token:', TOKEN.slice(0, 8) + '...' + TOKEN.slice(-4), '\n');

  // ── 1. Verify token ─────────────────────────────────────────────────────────
  console.log('🔑 1. Verifying token...');
  const me = await fetch('https://public-api.wordpress.com/rest/v1.1/me', {
    headers: jsonHeaders,
  }).then(r => r.json()).catch(() => null);
  if (me?.error) {
    console.error('❌ Token invalid or expired:', me.error, me.message);
    console.log('   Please re-authenticate: https://xtox-production.up.railway.app/api/wp/auth');
    process.exit(1);
  }
  console.log('✅ Token valid — user:', me?.display_name, '/', me?.email);

  // ── 2. Site identity ────────────────────────────────────────────────────────
  console.log('\n📝 2. Site identity settings...');
  const identity = await formPost('/settings', {
    blogname: 'XTOX - سوق محلي عربي',
    blogdescription: 'أكبر سوق إلكتروني عربي محلي — بيع واشتري بكل سهولة وأمان في مصر',
    blog_public: '1',
  });
  if (identity) console.log('✅ Site identity updated');

  // ── 3. Language & region ─────────────────────────────────────────────────────
  console.log('\n🌍 3. Language & region settings...');
  const lang = await formPost('/settings', {
    lang_id: '1',
    timezone_string: 'Africa/Cairo',
    date_format: 'd/m/Y',
    time_format: 'H:i',
    start_of_week: '6',
  });
  if (lang) console.log('✅ Language & region updated');

  // ── 4. Reading settings ──────────────────────────────────────────────────────
  console.log('\n📖 4. Reading settings...');
  const reading = await formPost('/settings', {
    posts_per_page: '12',
    default_category: '1',
  });
  if (reading) console.log('✅ Reading settings updated');

  // ── 5. Launch site (disable Coming Soon) ─────────────────────────────────────
  console.log('\n🚀 5. Launching site (disabling Coming Soon)...');
  const launch1 = await formPost('/settings', { blog_public: '1' });
  if (launch1) console.log('✅ blog_public = 1 set');

  // Try launch endpoint
  const launchRes = await fetch(`${API}/launch`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({}),
  }).then(r => r.json()).catch(() => null);
  if (launchRes && !launchRes.error) {
    console.log('✅ Site launched via launch endpoint');
  } else {
    console.log('ℹ️  Launch endpoint:', launchRes?.error || 'no response (may already be launched)');
  }

  // ── 6. Create / update pages ──────────────────────────────────────────────────
  console.log('\n📄 6. Creating pages...');
  const pagesRes = await get('/pages/?number=100&status=any');
  const existingPages = pagesRes?.pages || [];
  console.log('   Found', existingPages.length, 'existing pages');

  // Home page
  if (!await pageExists(existingPages, ['الرئيسية', 'home', 'welcome'])) {
    const home = await post('/posts/new', {
      title: 'الرئيسية',
      content: `<div dir="rtl" style="text-align:center;font-family:Arial,sans-serif;padding:40px">
<h1>XTOX - سوق محلي عربي</h1>
<p>أكبر سوق إلكتروني عربي محلي — بيع واشتري بكل سهولة وأمان</p>
<a href="https://fox-kohl-eight.vercel.app" style="display:inline-block;background:#002f34;color:white;padding:14px 28px;border-radius:10px;text-decoration:none;font-size:18px">افتح التطبيق →</a>
</div>`,
      type: 'page',
      status: 'publish',
    });
    if (home) console.log('✅ Home page created:', home.URL);
  } else {
    console.log('ℹ️  Home page exists');
  }

  // About page
  if (!await pageExists(existingPages, ['عن', 'about', 'من نحن'])) {
    const about = await post('/posts/new', {
      title: 'عن XTOX',
      content: `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:40px">
<h1>مرحباً بك في XTOX</h1>
<p>XTOX هو سوق محلي عربي مجاني يتيح لك بيع وشراء أي شيء بكل سهولة وأمان.</p>
<h2>ما يميزنا</h2>
<ul>
<li>📱 مجاني 100% — لا رسوم، لا عمولات</li>
<li>🌍 عربي بالكامل — دعم كامل للغة العربية</li>
<li>📞 مكالمات صوتية مجانية داخل التطبيق</li>
<li>⭐ نظام تقييمات موثوق للبائعين</li>
<li>🏆 نظام نقاط السمعة — تصدر الترتيب</li>
<li>💬 دردشة فورية مع البائعين</li>
</ul>
<p><a href="https://fox-kohl-eight.vercel.app">ابدأ الآن مجاناً →</a></p>
</div>`,
      type: 'page',
      status: 'publish',
    });
    if (about) console.log('✅ About page created:', about.URL);
  } else {
    console.log('ℹ️  About page exists');
  }

  // Privacy Policy page
  if (!await pageExists(existingPages, ['سياسة الخصوصية', 'privacy', 'خصوصية'])) {
    const privacy = await post('/posts/new', {
      title: 'سياسة الخصوصية',
      content: `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:40px">
<h1>سياسة الخصوصية</h1>
<p>آخر تحديث: ${new Date().toLocaleDateString('ar-EG')}</p>
<h2>المعلومات التي نجمعها</h2>
<p>نجمع فقط المعلومات الضرورية لتشغيل المنصة: الاسم، البريد الإلكتروني، ورقم الهاتف (اختياري).</p>
<h2>كيف نستخدم معلوماتك</h2>
<ul>
<li>لإنشاء وإدارة حسابك</li>
<li>للتواصل بين البائعين والمشترين</li>
<li>لتحسين تجربة الاستخدام</li>
</ul>
<h2>حماية المعلومات</h2>
<p>نستخدم تشفير SSL وإجراءات أمنية متقدمة لحماية بياناتك.</p>
<h2>حقوقك</h2>
<p>يمكنك طلب حذف حسابك وبياناتك في أي وقت عبر البريد: xtox.noreply@gmail.com</p>
<h2>الاتصال بنا</h2>
<p>📧 xtox.noreply@gmail.com</p>
</div>`,
      type: 'page',
      status: 'publish',
    });
    if (privacy) console.log('✅ Privacy Policy page created:', privacy.URL);
  } else {
    console.log('ℹ️  Privacy Policy page exists');
  }

  // ── 7. Site icon ────────────────────────────────────────────────────────────
  console.log('\n🎨 7. Site icon (informational)...');
  console.log('ℹ️  To set site icon: Dashboard → Appearance → Site Identity → Site Icon');
  console.log('   Icon URL: https://fox-kohl-eight.vercel.app/icon-512.png');

  // ── 8. Get final site info ───────────────────────────────────────────────────
  console.log('\n📊 8. Final site status...');
  const siteInfo = await get('/');
  if (siteInfo) {
    console.log('   Name:', siteInfo.name);
    console.log('   Description:', siteInfo.description);
    console.log('   URL:', siteInfo.URL);
    console.log('   Jetpack:', siteInfo.jetpack ? 'connected' : 'not connected');
    console.log('   Is Coming Soon:', siteInfo.options?.is_coming_soon ?? 'unknown');
    console.log('   blog_public:', siteInfo.options?.blog_public ?? 'unknown');
  }

  console.log('\n🎉 Setup complete!');
  console.log('   Next steps in dashboard: https://wordpress.com/home/xt0x.wordpress.com');
  console.log('   See wp-setup-guide.md for dashboard steps that require manual action');
}

main().catch(e => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});
