'use client';
import { useLanguage } from '../context/LanguageContext';

/**
 * LanguageToggle — shows ONE button to toggle between native language and English.
 * Hidden entirely for English-native countries (US, UK, AU, CA, etc.).
 *
 * Button label:
 *   - When in native language → "En"
 *   - When in English         → native short name (e.g. "عر" for Arabic)
 */
export default function LanguageToggle({ className = '' }) {
  const { language, showToggle, nativeName, nativeLang, toggleLanguage } = useLanguage();

  // Hide for English-native countries
  if (!showToggle) return null;

  // Label: currently in native → show "En"; currently in English → show native name
  const label = language === nativeLang ? 'En' : nativeName;

  return (
    <button
      onClick={toggleLanguage}
      className={className}
      style={{
        background: 'transparent',
        border: '1.5px solid rgba(255,255,255,0.55)',
        borderRadius: 8,
        padding: '4px 10px',
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit',
        lineHeight: 1.4,
        minWidth: 36,
        color: 'white',
        transition: 'opacity 0.15s, border-color 0.15s',
        flexShrink: 0,
      }}
      aria-label={language === nativeLang ? 'Switch to English' : 'Switch to native language'}
      title={language === nativeLang ? 'Switch to English' : 'Switch to native language'}
    >
      {label}
    </button>
  );
}
