'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

// Default context value — Egypt/Arabic
const LanguageContext = createContext({
  language: 'ar',
  isRTL: true,
  showToggle: true,
  nativeName: 'عر',
  nativeLang: 'ar',
  toggleLanguage: () => {},
  detectedCountry: 'EG',
});

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('ar');
  const [isRTL, setIsRTL] = useState(true);
  const [showToggle, setShowToggle] = useState(true);
  const [nativeName, setNativeName] = useState('عر');
  const [detectedCountry, setDetectedCountry] = useState('EG');
  const [nativeLang, setNativeLang] = useState('ar');

  function applyLangToDOM(lang, rtl) {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = lang;
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('data-lang', lang);
  }

  useEffect(() => {
    async function init() {
      // Read cached detection
      const storedCountry  = localStorage.getItem('xtox_detected_country');
      const storedToggle   = localStorage.getItem('xtox_show_toggle');
      const storedNative   = localStorage.getItem('xtox_native_lang');
      const storedName     = localStorage.getItem('xtox_native_name');
      const storedRTL      = localStorage.getItem('xtox_native_rtl');
      const savedLang      = localStorage.getItem('xtox_language');

      let country, toggle, native, name, nativeRtl;

      if (storedCountry && storedToggle !== null) {
        // Use cached values — never re-detect
        country   = storedCountry;
        toggle    = storedToggle === 'true';
        native    = storedNative || 'en';
        name      = storedName  || null;
        nativeRtl = storedRTL   === 'true';
      } else {
        // First visit — call backend /api/geo/detect
        try {
          const res  = await fetch(`${BACKEND_URL}/api/geo/detect`, { signal: AbortSignal.timeout(4000) });
          const data = await res.json();
          country   = data.country    || 'EG';
          toggle    = !!data.showToggle;
          native    = data.language   || 'en';
          name      = data.nativeName || null;
          nativeRtl = !!data.rtl;
        } catch {
          // Fallback to Egypt/Arabic
          country   = 'EG';
          toggle    = true;
          native    = 'ar';
          name      = 'عر';
          nativeRtl = true;
        }
        // Cache permanently in localStorage (country is immutable)
        localStorage.setItem('xtox_detected_country', country);
        localStorage.setItem('xtox_show_toggle',      String(toggle));
        localStorage.setItem('xtox_native_lang',      native);
        localStorage.setItem('xtox_native_name',      name || '');
        localStorage.setItem('xtox_native_rtl',       String(nativeRtl));
      }

      setDetectedCountry(country);
      setShowToggle(toggle);
      setNativeLang(native);
      setNativeName(name || '');

      // Determine which language to display
      let currentLang;
      if (!toggle) {
        // English-native country — always English, no toggle
        currentLang = 'en';
      } else {
        // Non-English country: use saved pref or default to native
        currentLang = (savedLang === 'en' || savedLang === native) ? savedLang : native;
      }

      localStorage.setItem('xtox_language', currentLang);
      setLanguage(currentLang);

      const currentRTL = (currentLang === native) ? nativeRtl : false;
      setIsRTL(currentRTL);
      applyLangToDOM(currentLang, currentRTL);
    }

    init();
  }, []);

  function toggleLanguage() {
    if (!showToggle) return;
    const nativeRtl = localStorage.getItem('xtox_native_rtl') === 'true';
    const newLang   = language === nativeLang ? 'en' : nativeLang;
    const newRTL    = newLang  === nativeLang ? nativeRtl : false;

    setLanguage(newLang);
    setIsRTL(newRTL);
    localStorage.setItem('xtox_language', newLang);
    applyLangToDOM(newLang, newRTL);
  }

  return (
    <LanguageContext.Provider
      value={{ language, isRTL, showToggle, nativeName, nativeLang, toggleLanguage, detectedCountry }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export default LanguageContext;
