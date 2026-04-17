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

// Note: global-error renders outside the LanguageProvider tree,
// so it uses a simple localStorage fallback for language detection.
function getStoredLang() {
  if (typeof window === 'undefined') return 'ar';
  try { return localStorage.getItem('xtox_language') || 'ar'; } catch { return 'ar'; }
}

const MSGS = {
  retry: { ar: 'إعادة المحاولة', en: 'Try Again', fr: 'Réessayer' },
  clear: { ar: '🔄 مسح الكاش وإعادة التحميل', en: '🔄 Clear Cache & Reload', fr: '🔄 Vider le cache et recharger' },
  home:  { ar: '← الرئيسية', en: '← Home', fr: '← Accueil' },
  err:   { ar: 'حدث خطأ في التطبيق. يرجى إعادة المحاولة.', en: 'App error. Please try again.', fr: "Erreur d'application. Veuillez réessayer." },
};

function m(key) {
  const lang = getStoredLang();
  return (MSGS[key] && MSGS[key][lang]) || (MSGS[key] && MSGS[key]['ar']) || key;
}

export default function GlobalError({ error, reset }) {
  return (
    <html>
      <body style={{ margin: 0, fontFamily: "'Cairo', system-ui", background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 20 }}>
        <div style={{ background: 'white', borderRadius: 20, padding: 40, maxWidth: 420, textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: 60 }}>🛒</div>
          <h1 style={{ color: '#002f34', margin: '12px 0 8px' }}>XTOX</h1>
          <p style={{ color: '#666', marginBottom: 24, fontSize: 14, lineHeight: 1.6 }}>
            {error?.message || m('err')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={reset}
              style={{ background: '#002f34', color: 'white', border: 'none', padding: '12px 28px', borderRadius: 12, cursor: 'pointer', fontSize: 15, fontWeight: 'bold', fontFamily: 'inherit' }}>
              {m('retry')}
            </button>
            <button onClick={clearAndReload}
              style={{ background: '#6366f1', color: 'white', border: 'none', padding: '11px 28px', borderRadius: 12, cursor: 'pointer', fontSize: 14, fontWeight: 'bold', fontFamily: 'inherit' }}>
              {m('clear')}
            </button>
            <a href="/"
              style={{ color: '#002f34', fontSize: 13, marginTop: 4, display: 'inline-block', textDecoration: 'underline' }}>
              {m('home')}
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
