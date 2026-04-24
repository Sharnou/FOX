'use client';
import { useLanguage } from '../context/LanguageContext';
import { LANG_NAMES } from '../lib/countryLanguageMap';

export default function LanguageToggle() {
  const { lang, toggleLangs, toggleLanguage } = useLanguage();

  // English-only country — no toggle needed
  if (!toggleLangs || toggleLangs.length < 2) return null;

  // Show the OTHER language (what you'll switch TO)
  const otherLang = toggleLangs.find(l => l !== lang) || toggleLangs[0];
  const label = LANG_NAMES[otherLang]
    ? LANG_NAMES[otherLang].substring(0, 3)  // First 3 chars of native name
    : otherLang.toUpperCase();

  return (
    <button
      onClick={toggleLanguage}
      style={{
        background: 'rgba(99,102,241,0.12)',
        border: '1.5px solid rgba(99,102,241,0.3)',
        borderRadius: '8px',
        padding: '5px 12px',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: '700',
        color: '#6366f1',
        letterSpacing: '0.5px',
        transition: 'all 0.2s',
        minWidth: '44px',
      }}
      title={`Switch to ${LANG_NAMES[otherLang] || otherLang}`}
      aria-label={`Switch language to ${LANG_NAMES[otherLang] || otherLang}`}
    >
      {label}
    </button>
  );
}
