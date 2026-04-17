'use client';

async function clearAndReload() {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch (e) {
    console.warn('Cache clear error:', e);
  }
  window.location.reload(true);
}

export default function Error({ error, reset }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cairo', system-ui", background: '#f5f5f5', padding: 20, textAlign: 'center' }}>
      <div style={{ background: 'white', borderRadius: 20, padding: 40, maxWidth: 420, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ color: '#002f34', marginBottom: 12 }}>حدث خطأ</h2>
        <p style={{ color: '#666', marginBottom: 24, fontSize: 14, lineHeight: 1.6 }}>
          {error?.message || 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.'}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={reset}
            style={{ background: '#002f34', color: 'white', border: 'none', padding: '12px 24px', borderRadius: 12, cursor: 'pointer', fontSize: 15, fontFamily: 'inherit', fontWeight: 'bold' }}>
            حاول مجدداً
          </button>
          <button onClick={clearAndReload}
            style={{ background: '#6366f1', color: 'white', border: 'none', padding: '11px 24px', borderRadius: 12, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit', fontWeight: 'bold' }}>
            🔄 مسح الكاش وإعادة التحميل
          </button>
          <a href="/"
            style={{ color: '#002f34', fontSize: 13, marginTop: 4, display: 'inline-block', textDecoration: 'underline' }}>
            ← الرئيسية
          </a>
        </div>
      </div>
    </div>
  );
}
