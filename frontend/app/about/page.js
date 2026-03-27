export default function AboutPage() {
  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 24, fontFamily: 'system-ui, sans-serif', minHeight: '100vh', background: '#f5f5f5' }}>
      <button onClick={() => history.back()} style={{ background: 'none', border: 'none', color: '#002f34', fontWeight: 'bold', fontSize: 18, cursor: 'pointer', marginBottom: 20 }}>← رجوع</button>
      <div style={{ background: 'white', borderRadius: 20, padding: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 60, marginBottom: 12 }}>🛒</div>
          <h1 style={{ color: '#002f34', fontSize: 28, fontWeight: 'bold', margin: 0 }}>XTOX</h1>
          <p style={{ color: '#666', margin: '8px 0 0' }}>السوق المحلي الذكي</p>
        </div>
        <div style={{ lineHeight: 1.8, color: '#444', fontSize: 15 }}>
          <h2 style={{ color: '#002f34' }}>من نحن</h2>
          <p>XTOX هو سوق محلي ذكي يربط البائعين والمشترين في نفس المنطقة الجغرافية. نستخدم الذكاء الاصطناعي لتبسيط نشر الإعلانات وتحسين تجربة المستخدم.</p>
          <h2 style={{ color: '#002f34' }}>مميزاتنا</h2>
          <ul>
            <li>🤖 إنشاء إعلانات بالذكاء الاصطناعي — صوّر المنتج وسنكمل الباقي</li>
            <li>💬 محادثة فورية بين البائع والمشتري</li>
            <li>📞 مكالمات صوتية مباشرة (P2P)</li>
            <li>📍 إعلانات قريبة منك بناءً على موقعك</li>
            <li>🔒 قفل الدولة — إعلانات بلدك فقط</li>
            <li>⭐ نظام تقييم البائعين</li>
          </ul>
          <h2 style={{ color: '#002f34' }}>تواصل معنا</h2>
          <p>📧 ahmed_sharnou@yahoo.com</p>
        </div>
      </div>
    </div>
  );
}
