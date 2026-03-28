'use client';

export default function GlobalError({ error, reset }) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, fontFamily: "'Cairo', system-ui", background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 20 }}>
        <div style={{ background: 'white', borderRadius: 20, padding: 40, maxWidth: 400, textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: 60 }}>🛒</div>
          <h1 style={{ color: '#002f34', margin: '12px 0 8px' }}>XTOX</h1>
          <p style={{ color: '#666', marginBottom: 24 }}>حدث خطأ في التطبيق. يرجى إعادة المحاولة.</p>
          <button onClick={reset}
            style={{ background: '#002f34', color: 'white', border: 'none', padding: '12px 28px', borderRadius: 12, cursor: 'pointer', fontSize: 15, fontWeight: 'bold' }}>
            إعادة المحاولة
          </button>
        </div>
      </body>
    </html>
  );
}
