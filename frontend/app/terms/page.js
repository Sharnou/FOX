export const metadata = {
  title: 'شروط الاستخدام | XTOX',
  description: 'شروط الاستخدام لسوق XTOX - اقرأ قواعد الاستخدام',
  openGraph: {
    title: 'شروط الاستخدام | XTOX',
    description: 'شروط الاستخدام لسوق XTOX - اقرأ قواعد الاستخدام',
    siteName: 'XTOX',
    locale: 'ar_EG',
    type: 'website',
  },
};

export default function TermsPage() {
  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 24, fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif", minHeight: '100vh', background: '#f5f5f5' }}>
      <a href="/" style={{ display: 'inline-block', color: '#002f34', fontWeight: 'bold', fontSize: 18, textDecoration: 'none', marginBottom: 20 }}>← رجوع</a>
      <div style={{ background: 'white', borderRadius: 20, padding: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <h1 style={{ color: '#002f34', fontSize: 24, fontWeight: 'bold', marginBottom: 24 }}>📋 شروط الاستخدام</h1>
        <div style={{ lineHeight: 2, color: '#444', fontSize: 14 }}>
          <h3 style={{ color: '#002f34' }}>1. الاستخدام المسموح</h3>
          <ul>
            <li>نشر إعلانات حقيقية فقط بمنتجات/خدمات حقيقية</li>
            <li>الالتزام بقوانين البلد المحدد</li>
          </ul>
          <h3 style={{ color: '#002f34' }}>2. الإعلانات المحظورة</h3>
          <ul>
            <li>❌ الأسلحة والمخدرات والمواد المحظورة</li>
            <li>❌ المحتوى الجنسي أو العنيف</li>
            <li>❌ الاحتيال والنصب</li>
          </ul>
          <h3 style={{ color: '#002f34' }}>3. العقوبات</h3>
          <ul>
            <li>تحذير أول: إخفاء الإعلان</li>
            <li>تحذير ثانٍ: حظر 24 ساعة</li>
            <li>ثالثاً: حظر دائم</li>
          </ul>
          <h3 style={{ color: '#002f34' }}>4. المسؤولية</h3>
          <p>XTOX وسيط فقط. المسؤولية الكاملة عن المعاملات تقع على طرفي الصفقة.</p>
        </div>
      </div>
    </div>
  );
}
