'use client';
import { useLanguage } from '../context/LanguageContext';

export default function TranslationLoader() {
  const { translationsReady } = useLanguage();

  if (translationsReady) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      height: 3,
      background: 'linear-gradient(90deg, #002f34, #6366f1, #002f34)',
      backgroundSize: '200% 100%',
      animation: 'translationLoading 1.5s infinite',
      zIndex: 9999,
    }}>
      <style>{`
        @keyframes translationLoading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
