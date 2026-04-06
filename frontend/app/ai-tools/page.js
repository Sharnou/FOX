import Link from 'next/link';

const AI_TOOLS = [
  {
    title: 'FOX AI Assistant',
    titleAr: 'مساعد FOX الذكي',
    description: 'Chat with AI to get help posting ads, safety tips, pricing advice, and navigating the platform.',
    descriptionAr: 'تحدث مع الذكاء الاصطناعي للحصول على مساعدة في نشر الإعلانات ونصائح الأمان وتسعير المنتجات.',
    icon: '🤖',
    href: '/ai-assistant',
    color: '#2563eb',
    bg: '#eff6ff',
  },
  {
    title: 'AI Ad Improver',
    titleAr: 'محسّن الإعلانات AI',
    description: 'AI analyzes your ad and suggests better titles, descriptions, and highlights issues. Score your listing quality.',
    descriptionAr: 'يحلل الذكاء الاصطناعي إعلانك ويقترح عناوين ووصفاً أفضل ويكتشف المشكلات.',
    icon: '✨',
    href: '/sell',
    color: '#7c3aed',
    bg: '#f5f3ff',
  },
  {
    title: 'AI Fraud Alert',
    titleAr: 'كاشف الاحتيال AI',
    description: 'Automatically scans listings for fraud patterns, suspicious pricing, and policy violations before you buy.',
    descriptionAr: 'يفحص الإعلانات تلقائياً بحثاً عن أنماط الاحتيال والأسعار المشبوهة قبل الشراء.',
    icon: '🛡️',
    href: '/ads',
    color: '#059669',
    bg: '#ecfdf5',
  },
  {
    title: 'AI Listing Generator',
    titleAr: 'مولّد الإعلانات AI',
    description: 'Upload a photo or describe your item — AI instantly generates a complete, professional listing.',
    descriptionAr: 'ارفع صورة أو صف منتجك — الذكاء الاصطناعي ينشئ إعلاناً كاملاً واحترافياً فوراً.',
    icon: '⚡',
    href: '/sell/ai-generate',
    color: '#d97706',
    bg: '#fffbeb',
  },
];

export const metadata = {
  title: 'أدوات الذكاء الاصطناعي | FOX',
  description: 'استخدم قوة الذكاء الاصطناعي في سوق FOX',
};

export default function AIToolsPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', direction: 'rtl', fontFamily: 'inherit', padding: '24px 16px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🦊</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
            أدوات الذكاء الاصطناعي في FOX
          </h1>
          <p style={{ color: '#6b7280', fontSize: 16, margin: 0 }}>
            AI Tools for FOX Marketplace
          </p>
          <p style={{ color: '#9ca3af', fontSize: 14, marginTop: 8 }}>
            استخدم الذكاء الاصطناعي لبيع أسرع وشراء أكثر أماناً
          </p>
        </div>

        {/* Tools Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 20 }}>
          {AI_TOOLS.map(tool => (
            <div key={tool.title} style={{
              background: 'white', borderRadius: 16, padding: 24,
              border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              transition: 'box-shadow 0.2s',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
                <div style={{
                  width: 56, height: 56, background: tool.bg, borderRadius: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0,
                }}>
                  {tool.icon}
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 2px' }}>{tool.titleAr}</h2>
                  <p style={{ fontSize: 13, color: tool.color, margin: 0, fontWeight: 500 }}>{tool.title}</p>
                </div>
              </div>
              <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, margin: '0 0 8px' }}>{tool.descriptionAr}</p>
              <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, margin: '0 0 20px' }}>{tool.description}</p>
              <Link href={tool.href} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: tool.color, color: 'white', textDecoration: 'none',
                borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600,
              }}>
                جرّبه الآن / Try it →
              </Link>
            </div>
          ))}
        </div>

        {/* Info section */}
        <div style={{ marginTop: 40, background: 'white', borderRadius: 16, padding: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 12px' }}>
            🔑 كيف تعمل أدوات الذكاء الاصطناعي؟
          </h3>
          <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.7, margin: '0 0 12px' }}>
            تعمل أدوات FOX AI باستخدام نماذج ذكاء اصطناعي متعددة (Gemini، Groq، OpenAI) مع نظام تحويل تلقائي بينها.
            لتفعيل الميزات الكاملة، أضف مفتاح API واحداً على الأقل في ملف .env:
          </p>
          <pre style={{ background: '#f3f4f6', borderRadius: 8, padding: 12, fontSize: 12, color: '#374151', overflow: 'auto' }}>
{'NEXT_PUBLIC_GEMINI_API_KEY=your_key_here\nNEXT_PUBLIC_GROQ_API_KEY=your_key_here\nNEXT_PUBLIC_OPENAI_API_KEY=your_key_here'}
          </pre>
          <p style={{ fontSize: 13, color: '#9ca3af', margin: '12px 0 0' }}>
            بدون مفتاح API، تعمل الأدوات بوضع محاكاة للعرض التوضيحي.
          </p>
        </div>

        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <Link href="/" style={{ color: '#2563eb', textDecoration: 'none', fontSize: 14 }}>
            ← العودة إلى الصفحة الرئيسية / Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
