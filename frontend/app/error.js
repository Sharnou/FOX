'use client';
import { useLanguage } from './context/LanguageContext';

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
  const { t } = useLanguage();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cairo', system-ui", background: '#f5f5f5', padding: 20, textAlign: 'center' }}>
      <div style={{ background: 'white', borderRadius: 20, padding: 40, maxWidth: 420, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ color: '#002f34', marginBottom: 12 }}>{t('err_occurred')}</h2>
        <p style={{ color: '#666', marginBottom: 24, fontSize: 14, lineHeight: 1.6 }}>
          {error?.message || t('err_unexpected')}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={reset}
            style={{ background: '#002f34', color: 'white', border: 'none', padding: '12px 24px', borderRadius: 12, cursor: 'pointer', fontSize: 15, fontFamily: 'inherit', fontWeight: 'bold' }}>
            {t('btn_retry')}
          </button>
          <button onClick={clearAndReload}
            style={{ background: '#6366f1', color: 'white', border: 'none', padding: '11px 24px', borderRadius: 12, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit', fontWeight: 'bold' }}>
            {t('btn_clear_cache')}
          </button>
          <a href="/"
            style={{ color: '#002f34', fontSize: 13, marginTop: 4, display: 'inline-block', textDecoration: 'underline' }}>
            {t('err_go_home')}
          </a>
        </div>
      </div>
    </div>
  );
}
