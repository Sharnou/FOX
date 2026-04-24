'use client';
import { useLanguage } from '../context/LanguageContext';

/**
 * LanguageToggle — 3-way toggle: AR → EN → FR → AR
 * Shows the current language label.
 * Each click cycles to the next language.
 */
export default function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();

  // Label map: what to show for current language
  const labelMap = {
    ar: 'عر',
    en: 'EN',
    fr: 'FR',
  };

  const label = labelMap[language] || language.toUpperCase();

  // Next language label for aria
  const nextMap = { ar: 'EN', en: 'FR', fr: 'عر' };
  const nextLabel = nextMap[language] || 'EN';

  return (
    <button
      onClick={toggleLanguage}
      aria-label={`Switch to ${nextLabel}`}
      title={`Switch to ${nextLabel}`}
      style={{
        background: 'transparent',
        border: '1.5px solid rgba(255, 255, 255, 0.55)',
        borderRadius: '8px',
        padding: '4px 10px',
        fontSize: '13px',
        fontWeight: '700',
        cursor: 'pointer',
        fontFamily: 'inherit',
        lineHeight: '1.4',
        minWidth: '36px',
        color: 'white',
        transition: 'opacity 0.15s, border-color 0.15s',
        flexShrink: 0,
      }}
    >
      {label}
    </button>
  );
}
