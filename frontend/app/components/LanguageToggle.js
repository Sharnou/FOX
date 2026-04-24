'use client';
import { useLanguage } from '../context/LanguageContext';

/**
 * LanguageToggle — AR/EN only toggle button.
 * Label shows the language you can switch TO:
 *   - Current = AR  →  shows "EN"
 *   - Current = EN  →  shows "عر"
 */
export default function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();

  // Show the language you can switch TO
  const label = language === 'ar' ? 'EN' : 'عر';

  return (
    <button
      onClick={toggleLanguage}
      aria-label={language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
      title={language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
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
