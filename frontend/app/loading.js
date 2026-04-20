'use client';
import { useEffect, useState } from 'react';

// loading.js is a Next.js Suspense fallback — it renders inside the layout
// but may load before the LanguageProvider is fully hydrated on first render.
// Reading from localStorage directly gives instant, flicker-free language detection.
function getLang() {
  try {
    return (
      localStorage.getItem('xtox_language') ||
      localStorage.getItem('xtox_lang') ||
      localStorage.getItem('lang') ||
      'ar'
    );
  } catch {
    return 'ar';
  }
}

const LOADING_TEXT = {
  ar: 'جارٍ التحميل...',
  en: 'Loading...',
  fr: 'Chargement...',
  ru: 'Загрузка...',
  de: 'Laden...',
  es: 'Cargando...',
  tr: 'Yükleniyor...',
  zh: '加载中...',
};

export default function Loading() {
  const [lang, setLang] = useState('ar');

  useEffect(() => {
    setLang(getLang());
  }, []);

  const text = LOADING_TEXT[lang] || LOADING_TEXT.ar;

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        flexDirection: 'column',
        gap: 16,
        fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: '3px solid rgba(99,102,241,0.2)',
          borderTopColor: '#6366f1',
          animation: 'xtox-spin 0.8s linear infinite',
        }}
      />
      <span style={{ color: '#94a3b8', fontSize: 14 }}>{text}</span>
      <style>{`@keyframes xtox-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
