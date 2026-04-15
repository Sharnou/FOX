#!/usr/bin/env node
/**
 * WordPress Site Setup Script
 * Run this after setting WP_ACCESS_TOKEN in your environment:
 *   WP_ACCESS_TOKEN=your_token node backend/scripts/setup-wordpress.js
 * 
 * Or hit POST /api/wp/get-token with {username, password} first to get a token,
 * then set it in Railway env vars as WP_ACCESS_TOKEN.
 */

const TOKEN = process.env.WP_ACCESS_TOKEN;
const SITE = 'xt0x.wordpress.com';
const API = `https://public-api.wordpress.com/rest/v1.1/sites/${SITE}`;

if (!TOKEN) {
  console.error('❌ WP_ACCESS_TOKEN is not set!');
  console.log('Get a token by visiting: https://xtox-production.up.railway.app/api/wp/auth');
  console.log('Or POST /api/wp/get-token with {username: "xtox.noreply@gmail.com", password: "..."}');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

async function apiCall(endpoint, method = 'GET', body = null) {
  const res = await fetch(API + endpoint, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    console.error(`❌ ${method} ${endpoint} failed:`, data);
    return null;
  }
  return data;
}

async function formApiCall(endpoint, params) {
  const res = await fetch(API + endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error(`❌ POST ${endpoint} failed:`, data);
    return null;
  }
  return data;
}

async function main() {
  console.log('🚀 Setting up WordPress site...\n');

  // C1. Update site settings
  console.log('📝 C1: Updating site settings...');
  const settings = await formApiCall('/settings', {
    blogname: 'XTOX - سوق محلي عربي',
    blogdescription: 'أكبر سوق محلي عربي - بيع واشتري بكل سهولة',
    lang_id: 'ar',
  });
  if (settings) console.log('✅ Site settings updated');

  // C2. Check existing pages
  console.log('\n📝 C2: Checking existing pages...');
  const pagesRes = await apiCall('/pages/?number=50');
  const existingPages = (pagesRes && pagesRes.pages) || [];
  const pageTitles = existingPages.map(p => p.title.toLowerCase());
  console.log(`Found ${existingPages.length} existing pages`);

  // Create About page
  if (!pageTitles.some(t => t.includes('من نحن') || t.includes('about'))) {
    console.log('Creating "من نحن" page...');
    const aboutPage = await apiCall('/posts/new', 'POST', {
      title: 'من نحن',
      content: `<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
<h1>مرحباً بك في XTOX</h1>
<p>XTOX هو سوق محلي عربي مجاني يتيح لك بيع وشراء أي شيء بكل سهولة وأمان.</p>
<h2>مميزاتنا</h2>
<ul>
<li>📱 <strong>مجاني 100%</strong> — لا رسوم، لا عمولات</li>
<li>🌍 <strong>عربي بالكامل</strong> — دعم كامل للغة العربية والعالم العربي</li>
<li>📞 <strong>مكالمات صوتية مجانية</strong> — تحدث مع البائع مباشرة</li>
<li>⭐ <strong>نظام سمعة</strong> — تقييمات موثوقة للبائعين</li>
<li>🏆 <strong>نقاط السمعة</strong> — ابنِ سمعتك وكن المتصدر</li>
<li>💬 <strong>دردشة فورية</strong> — تواصل مع البائعين مباشرة</li>
</ul>
<h2>كيف تبدأ؟</h2>
<p>قم بزيارة <a href="https://fox-kohl-eight.vercel.app">التطبيق</a>، سجّل حساباً مجانياً، وابدأ البيع والشراء الآن!</p>
<p>التطبيق متاح على جميع الأجهزة — موبايل، تابلت، كمبيوتر.</p>
</div>`,
      type: 'page',
      status: 'publish',
    });
    if (aboutPage) console.log('✅ About page created:', aboutPage.URL);
  } else {
    console.log('ℹ️ About page already exists');
  }

  // Create Download App page
  if (!pageTitles.some(t => t.includes('حمّل') || t.includes('تطبيق') || t.includes('download'))) {
    console.log('Creating "حمّل التطبيق" page...');
    const appPage = await apiCall('/posts/new', 'POST', {
      title: 'حمّل التطبيق',
      content: `<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; text-align: center;">
<h1>📱 حمّل تطبيق XTOX</h1>
<p>XTOX هو تطبيق ويب متقدم (PWA) يعمل على جميع الأجهزة بدون الحاجة لمتجر التطبيقات!</p>
<h2>كيف تثبت التطبيق؟</h2>
<h3>على الموبايل (iPhone/Android):</h3>
<ol style="text-align: right;">
<li>افتح المتصفح وانتقل إلى <a href="https://fox-kohl-eight.vercel.app">fox-kohl-eight.vercel.app</a></li>
<li>اضغط على زر المشاركة (iPhone) أو القائمة (Android)</li>
<li>اختر "إضافة إلى الشاشة الرئيسية"</li>
<li>اضغط "إضافة" — التطبيق جاهز!</li>
</ol>
<h3>على الكمبيوتر:</h3>
<ol style="text-align: right;">
<li>افتح Chrome وانتقل إلى <a href="https://fox-kohl-eight.vercel.app">fox-kohl-eight.vercel.app</a></li>
<li>انقر على أيقونة التثبيت في شريط العنوان</li>
<li>اضغط "تثبيت"</li>
</ol>
<a href="https://fox-kohl-eight.vercel.app/install" style="display: inline-block; background: #002f34; color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-size: 18px; margin-top: 20px;">🚀 ابدأ الآن</a>
</div>`,
      type: 'page',
      status: 'publish',
    });
    if (appPage) console.log('✅ Download App page created:', appPage.URL);
  } else {
    console.log('ℹ️ Download App page already exists');
  }

  // Create Contact page
  if (!pageTitles.some(t => t.includes('تواصل') || t.includes('contact'))) {
    console.log('Creating "تواصل معنا" page...');
    const contactPage = await apiCall('/posts/new', 'POST', {
      title: 'تواصل معنا',
      content: `<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
<h1>📬 تواصل معنا</h1>
<p>نحن هنا لمساعدتك! تواصل معنا عبر:</p>
<h2>البريد الإلكتروني</h2>
<p>📧 <a href="mailto:xtox.noreply@gmail.com">xtox.noreply@gmail.com</a></p>
<h2>التطبيق</h2>
<p>يمكنك التواصل معنا مباشرة من خلال نظام الدردشة في التطبيق.</p>
<p><a href="https://fox-kohl-eight.vercel.app">افتح التطبيق →</a></p>
<h2>ساعات العمل</h2>
<p>نرد على الرسائل خلال 24 ساعة في أيام العمل.</p>
</div>`,
      type: 'page',
      status: 'publish',
    });
    if (contactPage) console.log('✅ Contact page created:', contactPage.URL);
  } else {
    console.log('ℹ️ Contact page already exists');
  }

  // C3/C4. Check posts and create welcome post if none exist
  console.log('\n📝 C3/C4: Checking existing posts...');
  const postsRes = await apiCall('/posts/?number=10&type=post');
  const existingPosts = (postsRes && postsRes.posts) || [];
  console.log(`Found ${existingPosts.length} existing posts`);

  // Make first/promo post sticky if exists
  if (existingPosts.length > 0) {
    const firstPost = existingPosts[0];
    if (!firstPost.sticky) {
      console.log(`Making post "${firstPost.title}" sticky...`);
      const stickyRes = await formApiCall(`/posts/${firstPost.ID}`, { sticky: '1' });
      if (stickyRes) console.log('✅ Post set as sticky');
    } else {
      console.log('ℹ️ First post already sticky');
    }

    // C5. Update posts with categories/tags if missing
    console.log('\n📝 C5: Updating existing posts with categories/tags...');
    for (const post of existingPosts.slice(0, 10)) {
      if (!post.tags || Object.keys(post.tags).length === 0) {
        const updateRes = await formApiCall(`/posts/${post.ID}`, {
          tags: 'سوق,بيع,شراء,إعلانات,عربي',
          categories: 'عام',
        });
        if (updateRes) console.log(`✅ Updated tags for post: ${post.title.slice(0, 40)}`);
        await new Promise(r => setTimeout(r, 500));
      }
    }
  }

  if (existingPosts.length === 0) {
    // C4. Create welcome post
    console.log('Creating welcome post...');
    const welcomePost = await apiCall('/posts/new', 'POST', {
      title: 'مرحباً بك في XTOX - السوق المحلي العربي الجديد',
      content: `<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
<h1>🌟 مرحباً بك في XTOX!</h1>
<p><strong>XTOX</strong> هو السوق المحلي العربي الجديد الذي يربط البائعين بالمشترين في جميع أنحاء العالم العربي.</p>

<h2>🚀 لماذا XTOX؟</h2>
<ul>
<li><strong>مجاني 100%</strong> — لا رسوم، لا عمولات، لا مفاجآت</li>
<li><strong>سهل الاستخدام</strong> — انشر إعلانك في أقل من دقيقة</li>
<li><strong>آمن وموثوق</strong> — نظام تقييمات ومراجعات شفاف</li>
<li><strong>مكالمات مجانية</strong> — تحدث مع البائع مباشرة من التطبيق</li>
<li><strong>دردشة فورية</strong> — راسل البائع في أي وقت</li>
<li><strong>نقاط السمعة</strong> — ابنِ سمعتك وتصدر الترتيب</li>
</ul>

<h2>📱 كيف تبدأ؟</h2>
<ol>
<li>انتقل إلى <a href="https://fox-kohl-eight.vercel.app">fox-kohl-eight.vercel.app</a></li>
<li>سجّل حساباً مجانياً</li>
<li>انشر إعلانك الأول</li>
<li>ابدأ البيع والشراء!</li>
</ol>

<h2>🏆 نظام نقاط السمعة</h2>
<p>كل تعامل ناجح يكسبك نقاطاً للسمعة:</p>
<ul>
<li>⭐⭐⭐⭐⭐ تقييم 5 نجوم = +10 نقطة</li>
<li>⭐⭐⭐⭐ تقييم 4 نجوم = +7 نقطة</li>
<li>⭐⭐⭐ تقييم 3 نجوم = +3 نقطة</li>
<li>💰 إعلان مميز = +5 نقطة</li>
</ul>
<p>المستخدمون الأعلى نقاطاً يحصلون على شارات خاصة ومكافآت شهرية!</p>

<p style="text-align: center; margin-top: 30px;">
<a href="https://fox-kohl-eight.vercel.app" style="background: #002f34; color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-size: 16px;">ابدأ الآن مجاناً →</a>
</p>
</div>`,
      status: 'publish',
      format: 'standard',
      tags: 'سوق,بيع,شراء,إعلانات,عربي,مجاني,سوق عربي',
      categories: 'عام,أخبار',
      sticky: true,
    });
    if (welcomePost) {
      console.log('✅ Welcome post created:', welcomePost.URL);
    }
  }

  console.log('\n🎉 WordPress site setup complete!');
}

main().catch(e => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});
