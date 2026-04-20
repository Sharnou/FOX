'use client';
import { useEffect, useState } from 'react';

// Error messages for all 8 supported languages
// This file is an error boundary — it renders OUTSIDE the React context tree
// and CANNOT use useLanguage(). Language is read directly from localStorage.
const ERROR_MESSAGES = {
  ar: {
    title: 'حدث خطأ في التحميل',
    body: 'فشل تحميل هذه الصفحة. يرجى المحاولة مجدداً.',
    retry: 'إعادة المحاولة',
    clear: 'مسح البيانات والمحاولة',
    fixing: '⏳ جاري الإصلاح...',
    home: '← الرئيسية',
  },
  en: {
    title: 'Loading failed',
    body: 'This page failed to load. Please try again.',
    retry: 'Try again',
    clear: 'Clear data & retry',
    fixing: '⏳ Fixing...',
    home: '← Home',
  },
  fr: {
    title: 'Échec du chargement',
    body: 'Cette page n\'a pas pu se charger. Veuillez réessayer.',
    retry: 'Réessayer',
    clear: 'Effacer et réessayer',
    fixing: '⏳ Correction...',
    home: '← Accueil',
  },
  ru: {
    title: 'Ошибка загрузки',
    body: 'Страница не загрузилась. Попробуйте снова.',
    retry: 'Повторить',
    clear: 'Очистить и повторить',
    fixing: '⏳ Исправление...',
    home: '← Главная',
  },
  de: {
    title: 'Ladefehler',
    body: 'Diese Seite konnte nicht geladen werden. Bitte erneut versuchen.',
    retry: 'Erneut versuchen',
    clear: 'Daten löschen & erneut versuchen',
    fixing: '⏳ Wird behoben...',
    home: '← Startseite',
  },
  es: {
    title: 'Error de carga',
    body: 'Esta página no se pudo cargar. Por favor intenta de nuevo.',
    retry: 'Intentar de nuevo',
    clear: 'Borrar datos e intentar',
    fixing: '⏳ Corrigiendo...',
    home: '← Inicio',
  },
  tr: {
    title: 'Yükleme hatası',
    body: 'Bu sayfa yüklenemedi. Lütfen tekrar deneyin.',
    retry: 'Tekrar dene',
    clear: 'Verileri temizle ve dene',
    fixing: '⏳ Düzeltiliyor...',
    home: '← Ana Sayfa',
  },
  zh: {
    title: '加载失败',
    body: '此页面无法加载，请重试。',
    retry: '重试',
    clear: '清除数据并重试',
    fixing: '⏳ 修复中...',
    home: '← 首页',
  },
};

function getLang() {
  try {
    return (
      localStorage.getItem('xtox_language') ||
      localStorage.getItem('xtox_lang') ||
      localStorage.getItem('lang') ||
      navigator.language?.split('-')[0] ||
      'ar'
    );
  } catch {
    return 'ar';
  }
}

export default function Error({ error, reset }) {
  const [lang, setLang] = useState('ar');
  const [retryCount, setRetryCount] = useState(0);
  const [isFixing, setIsFixing] = useState(false);

  useEffect(() => {
    setLang(getLang());
    console.error('[XTOX Page Error]', error?.message, error?.digest);
  }, [error]);

  const msgs = ERROR_MESSAGES[lang] || ERROR_MESSAGES.ar;
  const isRTL = ['ar'].includes(lang);

  // Smart retry: diagnose + auto-fix before calling reset()
  async function handleSmartRetry() {
    setIsFixing(true);
    setRetryCount(c => c + 1);

    try {
      // Step 1: Clear stale SW/CDN caches
      if ('serviceWorker' in navigator && 'caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }

      // Step 2: Check if token is expired — clear it
      const token = localStorage.getItem('xtox_token') || localStorage.getItem('token');
      if (token) {
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            if (payload.exp && payload.exp * 1000 < Date.now()) {
              localStorage.removeItem('xtox_token');
              localStorage.removeItem('token');
              localStorage.removeItem('user');
            }
          }
        } catch {}
      }

      // Step 3: Wait for network if offline
      if (!navigator.onLine) {
        await new Promise(resolve => {
          window.addEventListener('online', resolve, { once: true });
          setTimeout(resolve, 5000);
        });
      }

      // Step 4: Activate waiting SW (if any)
      if ('serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg?.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        } catch {}
      }

      // Small backoff before reset
      await new Promise(r => setTimeout(r, 400));

    } catch (e) {
      console.warn('[XTOX] Smart retry cleanup failed:', e);
    }

    setIsFixing(false);
    reset();
  }

  // Hard reset: clear non-essential localStorage, then reload
  function handleClearAndRetry() {
    try {
      const token = localStorage.getItem('xtox_token') || localStorage.getItem('token');
      const savedLang = localStorage.getItem('xtox_language') || localStorage.getItem('xtox_lang');
      localStorage.clear();
      if (token) localStorage.setItem('xtox_token', token);
      if (savedLang) localStorage.setItem('xtox_language', savedLang);
    } catch {}
    window.location.reload();
  }

  const emoji = retryCount === 0 ? '⚠️' : retryCount < 3 ? '🔄' : '❌';

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        textAlign: 'center',
        fontFamily: 'Cairo, Tajawal, system-ui, sans-serif',
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 16 }}>{emoji}</div>
      <h2 style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8, color: '#111', margin: '0 0 8px' }}>
        {msgs.title}
      </h2>
      <p style={{ color: '#6b7280', marginBottom: 8, fontSize: 13, maxWidth: 300, lineHeight: 1.5 }}>
        {msgs.body}
      </p>
      {error?.message && (
        <p
          style={{
            color: '#9ca3af',
            fontSize: 11,
            marginBottom: 20,
            fontFamily: 'monospace',
            maxWidth: 320,
            wordBreak: 'break-all',
            background: '#f9fafb',
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid #e5e7eb',
          }}
        >
          {error.message}
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 280 }}>
        <button
          onClick={handleSmartRetry}
          disabled={isFixing}
          style={{
            background: isFixing ? '#9ca3af' : '#002f34',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            padding: '12px 24px',
            fontSize: 14,
            fontWeight: 'bold',
            cursor: isFixing ? 'not-allowed' : 'pointer',
            width: '100%',
            fontFamily: 'inherit',
            transition: 'opacity 0.2s',
          }}
        >
          {isFixing ? msgs.fixing : `🔄 ${msgs.retry}`}
        </button>
        {retryCount >= 2 && (
          <button
            onClick={handleClearAndRetry}
            style={{
              background: '#fff',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: 10,
              padding: '10px 24px',
              fontSize: 13,
              cursor: 'pointer',
              width: '100%',
              fontFamily: 'inherit',
            }}
          >
            🗑️ {msgs.clear}
          </button>
        )}
        <a
          href="/"
          style={{
            color: '#6b7280',
            fontSize: 13,
            textDecoration: 'none',
            marginTop: 4,
            display: 'block',
          }}
        >
          {msgs.home}
        </a>
      </div>
    </div>
  );
}
