export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 24, fontFamily: 'system-ui, sans-serif', minHeight: '100vh', background: '#f5f5f5' }}>
      <a href="/" style={{ display: 'inline-block', color: '#002f34', fontWeight: 'bold', fontSize: 18, textDecoration: 'none', marginBottom: 20 }}>← رجوع</a>
      <div style={{ background: 'white', borderRadius: 20, padding: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <h1 style={{ color: '#002f34', fontSize: 24, fontWeight: 'bold', marginBottom: 24 }}>🔒 سياسة الخصوصية</h1>
        <div style={{ lineHeight: 2, color: '#444', fontSize: 14 }}>
          <p><strong>آخر تحديث:</strong> مارس 2026</p>
          <h3 style={{ color: '#002f34' }}>1. البيانات التي نجمعها</h3>
          <ul>
            <li>الاسم والبريد الإلكتروني ورقم الهاتف (عند التسجيل)</li>
            <li>الموقع الجغرافي (فقط عند موافقتك)</li>
            <li>الإعلانات والصور التي تنشرها</li>
          </ul>
          <h3 style={{ color: '#002f34' }}>2. كيف نستخدم بياناتك</h3>
          <ul>
            <li>عرض الإعلانات المناسبة لموقعك</li>
            <li>تحسين خوارزمية البحث والترتيب</li>
          </ul>
          <h3 style={{ color: '#002f34' }}>3. حماية البيانات</h3>
          <p>نستخدم تشفير AES-256 للمحادثات وHTTPS لجميع الاتصالات.</p>
          <h3 style={{ color: '#002f34' }}>4. تواصل معنا</h3>
          <p>📧 ahmed_sharnou@yahoo.com</p>
        </div>
      </div>
    </div>
  );
}
