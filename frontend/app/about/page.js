export const metadata = {
  title: 'عن XTOX — السوق المحلي الذكي | Buy Sell Trade Near You',
  description: 'XTOX هو أذكى سوق محلي — بيع واشتري بسهولة في منطقتك. إعلانات مجانية، ذكاء اصطناعي، محادثة مباشرة، مكالمات صوتية. XTOX is the smartest local marketplace to buy, sell and find deals near you.',
  keywords: 'سوق, بيع, شراء, إعلانات مجانية, xtox, marketplace, buy sell, classified ads, عربية للبيع, شقق, وظائف, خدمات, سوبرماركت, صيدلية, طعام سريع'
};

export default function AboutPage() {
  const hashtags = [
    '#XTOX', '#سوق_محلي', '#بيع_وشراء', '#إعلانات_مجانية',
    '#MarketplaceApp', '#BuySellNearYou', '#LocalMarket',
    '#سيارات_للبيع', '#شقق_للإيجار', '#وظائف', '#خدمات_منزلية',
    '#سوبرماركت', '#صيدلية', '#طعام_سريع', '#تسوق_اونلاين',
    '#AIMartketplace', '#SmartAds', '#FreeListing', '#Egypt',
    '#SaudiArabia', '#UAE', '#ذكاء_اصطناعي', '#تسوق_ذكي',
    '#مصر', '#السعودية', '#الإمارات', '#بيع_اونلاين',
    '#ClassifiedAds', '#OLXAlternative', '#DubizzleAlternative',
    '#فرصة_عمل', '#تأجير_شقق', '#سلع_مستعملة', '#الكترونيات'
  ];

  const features = [
    { icon: '🤖', title: 'ذكاء اصطناعي حقيقي', title_en: 'Real AI Power', desc: 'صوّر منتجك — الذكاء الاصطناعي يكتب الإعلان كاملاً تلقائياً', desc_en: 'Photo your product — AI writes the full ad automatically' },
    { icon: '💬', title: 'تواصل فوري', title_en: 'Instant Contact', desc: 'محادثة نصية + مكالمة صوتية مباشرة بين البائع والمشتري', desc_en: 'Text chat + P2P voice calls between buyer and seller' },
    { icon: '📍', title: 'قريب منك', title_en: 'Near You', desc: 'إعلانات منطقتك فقط — مرتبة بالأقرب إليك جغرافياً', desc_en: 'Only your region ads — sorted by nearest to you' },
    { icon: '🔒', title: 'آمن ومحلي', title_en: 'Safe & Local', desc: 'قفل الدولة — لا يرى إعلانات غير بلده. تشفير كامل للمحادثات', desc_en: 'Country lock — users only see their country. Full chat encryption' },
    { icon: '⭐', title: 'تقييم البائعين', title_en: 'Seller Ratings', desc: 'نجوم وتعليقات حقيقية على كل بائع — تعرف مع من تتعامل', desc_en: 'Real stars and reviews on every seller — know who you deal with' },
    { icon: '📱', title: 'يعمل كتطبيق', title_en: 'Works as App', desc: 'ثبّته على هاتفك من المتصفح مباشرة — بدون متجر تطبيقات', desc_en: 'Install on your phone directly from browser — no app store needed' },
  ];

  const categories = [
    { icon: '🚗', name: 'سيارات ومركبات', en: 'Vehicles', keys: 'عربية, سيارة, دراجة, شاحنة' },
    { icon: '📱', name: 'إلكترونيات', en: 'Electronics', keys: 'موبايل, لابتوب, تليفزيون, آيفون, سامسونج' },
    { icon: '🏠', name: 'عقارات', en: 'Real Estate', keys: 'شقة, فيلا, أرض, إيجار, بيع' },
    { icon: '💼', name: 'وظائف', en: 'Jobs', keys: 'تعيين, فرصة عمل, مطلوب, شاغر' },
    { icon: '🔧', name: 'خدمات وعمال', en: 'Services', keys: 'سباك, كهربائي, نجار, دهان, تنظيف' },
    { icon: '🛒', name: 'سوبرماركت', en: 'Supermarket', keys: 'بقالة, خضار, مواد غذائية' },
    { icon: '💊', name: 'صيدلية', en: 'Pharmacy', keys: 'دواء, صيدلية, مستلزمات طبية' },
    { icon: '🍕', name: 'طعام سريع', en: 'Fast Food', keys: 'مطعم, توصيل, أكل, وجبات' },
    { icon: '👗', name: 'موضة', en: 'Fashion', keys: 'ملابس رجالي, ملابس نسائي, أحذية' },
  ];

  return (
    <div style={{ fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif", background: '#f5f5f5', minHeight: '100vh' }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #002f34 0%, #004d40 100%)', color: 'white', padding: '60px 20px', textAlign: 'center', position: 'relative' }}>
        <a href="/" style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 14, textDecoration: 'none' }}>← رجوع</a>
        <div style={{ fontSize: 72, marginBottom: 16 }}>🛒</div>
        <h1 style={{ fontSize: 48, fontWeight: 'bold', margin: '0 0 8px', letterSpacing: 2 }}>XTOX</h1>
        <p style={{ fontSize: 20, opacity: 0.9, margin: '0 0 8px' }}>السوق المحلي الذكي</p>
        <p style={{ fontSize: 16, opacity: 0.7, margin: 0 }}>The Smartest Local Marketplace — Powered by AI</p>

        {/* Hashtags cloud */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 28, maxWidth: 700, margin: '28px auto 0' }}>
          {hashtags.map((tag, i) => (
            <span key={i} style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.9)', padding: '4px 12px', borderRadius: 20, fontSize: 13, border: '1px solid rgba(255,255,255,0.2)' }}>
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px' }}>

        {/* What is XTOX */}
        <div style={{ background: 'white', borderRadius: 20, padding: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: 24 }}>
          <h2 style={{ color: '#002f34', fontSize: 26, marginBottom: 16 }}>ما هو XTOX؟</h2>
          <p style={{ color: '#444', fontSize: 16, lineHeight: 1.9, marginBottom: 16 }}>
            <strong>XTOX</strong> هو منصة سوق محلي ذكي تجمع بين قوة الذكاء الاصطناعي وسهولة الإعلانات المبوبة.
            بيع أي شيء في ثوانٍ — صوّر المنتج والذكاء الاصطناعي يكمل الباقي: العنوان، الوصف، الفئة، وحتى السعر المقترح.
            تواصل مباشرة مع البائع عبر المحادثة أو المكالمة الصوتية الفورية.
          </p>
          <p style={{ color: '#666', fontSize: 15, lineHeight: 1.9, margin: 0 }}>
            <strong>XTOX</strong> is a smart local marketplace that combines AI power with the simplicity of classified ads.
            Sell anything in seconds — photo your product and AI fills in everything: title, description, category, and even a suggested price.
            Connect instantly with buyers via chat or direct P2P voice call.
          </p>
        </div>

        {/* Features Grid */}
        <h2 style={{ color: '#002f34', fontSize: 24, marginBottom: 16 }}>🚀 مميزات XTOX</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginBottom: 32 }}>
          {features.map((f, i) => (
            <div key={i} style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>{f.icon}</div>
              <h3 style={{ color: '#002f34', margin: '0 0 4px', fontSize: 17 }}>{f.title}</h3>
              <p style={{ color: '#888', fontSize: 12, margin: '0 0 8px' }}>{f.title_en}</p>
              <p style={{ color: '#444', fontSize: 14, margin: '0 0 4px', lineHeight: 1.6 }}>{f.desc}</p>
              <p style={{ color: '#888', fontSize: 12, margin: 0, fontStyle: 'italic' }}>{f.desc_en}</p>
            </div>
          ))}
        </div>

        {/* Categories */}
        <div style={{ background: 'white', borderRadius: 20, padding: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: 24 }}>
          <h2 style={{ color: '#002f34', fontSize: 24, marginBottom: 20 }}>📂 الأقسام المتاحة</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {categories.map((c, i) => (
              <div key={i} style={{ padding: '14px 16px', background: '#f8f8f8', borderRadius: 12, borderRight: '3px solid #002f34' }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{c.icon}</div>
                <p style={{ fontWeight: 'bold', color: '#002f34', margin: '0 0 2px', fontSize: 15 }}>{c.name}</p>
                <p style={{ color: '#888', fontSize: 12, margin: '0 0 4px' }}>{c.en}</p>
                <p style={{ color: '#aaa', fontSize: 11, margin: 0 }}>{c.keys}</p>
              </div>
            ))}
          </div>
        </div>

        {/* SEO Keywords section */}
        <div style={{ background: 'white', borderRadius: 20, padding: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: 24 }}>
          <h2 style={{ color: '#002f34', fontSize: 22, marginBottom: 16 }}>🔍 ابحث عنا بـ</h2>
          <p style={{ color: '#666', fontSize: 14, lineHeight: 1.8, marginBottom: 12 }}>
            سوق محلي · بيع وشراء · إعلانات مجانية · أوكازيون · سيارات للبيع · شقق للإيجار · وظائف شاغرة ·
            خدمات منزلية · سباك · كهربائي · طعام سريع · توصيل · دواء · صيدلية · ملابس ·
            إلكترونيات · موبايل للبيع · لابتوب مستعمل · آيفون · أثاث · بيع اونلاين ·
            تسوق ذكي · ذكاء اصطناعي · تطبيق بيع وشراء
          </p>
          <p style={{ color: '#888', fontSize: 13, lineHeight: 1.8, margin: 0 }}>
            Local marketplace · Buy and sell · Free ads · Classifieds · Cars for sale · Apartments for rent ·
            Job vacancies · Home services · Electronics · Mobile phones · Laptops · Fashion ·
            Fast food delivery · Pharmacy · AI marketplace · Smart buying · Sell near me · Find deals ·
            OLX alternative · Dubizzle alternative · Egyptian market · Arab marketplace
          </p>
        </div>

        {/* How it works */}
        <div style={{ background: 'linear-gradient(135deg, #002f34, #004d40)', borderRadius: 20, padding: 32, color: 'white', marginBottom: 24 }}>
          <h2 style={{ fontSize: 24, marginBottom: 20 }}>⚡ كيف يعمل XTOX؟</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 }}>
            {[
              { step: '1', icon: '📸', text: 'صوّر المنتج أو اكتب وصفه' },
              { step: '2', icon: '🤖', text: 'الذكاء الاصطناعي يحلل ويملأ كل البيانات' },
              { step: '3', icon: '✅', text: 'راجع الإعلان وانشره في ثانية' },
              { step: '4', icon: '💬', text: 'المشترون يتواصلون معك مباشرة' },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 18, margin: '0 auto 10px' }}>{s.step}</div>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
                <p style={{ margin: 0, opacity: 0.9, fontSize: 14, lineHeight: 1.5 }}>{s.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center', padding: '32px 20px', background: 'white', borderRadius: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h2 style={{ color: '#002f34', fontSize: 26, marginBottom: 8 }}>ابدأ الآن — مجاناً تماماً</h2>
          <p style={{ color: '#666', marginBottom: 24 }}>Start now — 100% Free · لا بطاقة بنكية مطلوبة · No credit card required</p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/sell" style={{ background: '#002f34', color: 'white', padding: '14px 32px', borderRadius: 14, textDecoration: 'none', fontWeight: 'bold', fontSize: 16 }}>+ انشر إعلانك الآن</a>
            <a href="/" style={{ background: '#f0f0f0', color: '#002f34', padding: '14px 32px', borderRadius: 14, textDecoration: 'none', fontWeight: 'bold', fontSize: 16 }}>تصفح الإعلانات</a>
          </div>
          <p style={{ color: '#999', fontSize: 13, marginTop: 20 }}>📧 ahmed_sharnou@yahoo.com</p>
        </div>

      </div>
    </div>
  );
}
