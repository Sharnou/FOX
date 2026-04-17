'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { makeT, CATEGORY_KEY_MAP, CITY_KEY_MAP, CONDITION_KEY_MAP } from '../translations/index';

const GEO_CACHE_VERSION = '2'; // bump this if detection logic changes

// Default t() using Arabic
const defaultT = makeT('ar');

// Default context value — Egypt/Arabic
const LanguageContext = createContext({
  language: 'ar',
  isRTL: true,
  showToggle: true,
  nativeName: 'عر',
  nativeLang: 'ar',
  toggleLanguage: () => {},
  detectedCountry: 'EG',
  t: defaultT,
  tCat: (v) => v,
  tCity: (v) => v,
  tCond: (v) => v,
});

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('ar');
  const [isRTL, setIsRTL] = useState(true);
  const [showToggle, setShowToggle] = useState(true);
  const [nativeName, setNativeName] = useState('عر');
  const [detectedCountry, setDetectedCountry] = useState('EG');
  const [nativeLang, setNativeLang] = useState('ar');

  // Memoised translation function — recreates only when language changes
  const t = useCallback((key) => {
    const dict = makeT(language);
    return dict(key);
  }, [language]);

  // Translate category/subcategory from Arabic DB value
  const tCat = useCallback((arabicName) => {
    if (!arabicName) return arabicName;
    const key = CATEGORY_KEY_MAP[arabicName] || CATEGORY_KEY_MAP[arabicName?.trim()];
    if (!key) return arabicName;
    const dict = makeT(language);
    return dict(key) || arabicName;
  }, [language]);

  // Translate city from Arabic DB value
  const tCity = useCallback((arabicCity) => {
    if (!arabicCity) return arabicCity;
    const key = CITY_KEY_MAP[arabicCity] || CITY_KEY_MAP[arabicCity?.trim()];
    if (!key) return arabicCity;
    const dict = makeT(language);
    return dict(key) || arabicCity;
  }, [language]);

  // Translate condition from Arabic/English value
  const tCond = useCallback((condition) => {
    if (!condition) return condition;
    const key = CONDITION_KEY_MAP[condition] || CONDITION_KEY_MAP[condition?.trim()];
    if (!key) return condition;
    const dict = makeT(language);
    return dict(key) || condition;
  }, [language]);

  function applyLangToDOM(lang, rtl) {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = lang;
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('data-lang', lang);
  }

  useEffect(() => {
    async function init() {
      // Cache-version check: discard stale data from old detection logic
      const cacheVersion = localStorage.getItem('xtox_geo_version');
      const storedCountry = cacheVersion === GEO_CACHE_VERSION
        ? localStorage.getItem('xtox_detected_country')
        : null; // force re-detect if version mismatch (fixes stale FR cache)

      const storedToggle   = storedCountry ? localStorage.getItem('xtox_show_toggle') : null;
      const storedNative   = storedCountry ? localStorage.getItem('xtox_native_lang') : null;
      const storedName     = storedCountry ? localStorage.getItem('xtox_native_name') : null;
      const storedRTL      = storedCountry ? localStorage.getItem('xtox_native_rtl') : null;
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
        // First visit or stale cache — call Next.js API route (reads Vercel CDN header)
        try {
          const res  = await fetch('/api/geo', { signal: AbortSignal.timeout(4000) });
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
        // Cache with version key so future bumps invalidate stale data
        localStorage.setItem('xtox_detected_country', country);
        localStorage.setItem('xtox_show_toggle',      String(toggle));
        localStorage.setItem('xtox_native_lang',      native);
        localStorage.setItem('xtox_native_name',      name || '');
        localStorage.setItem('xtox_native_rtl',       String(nativeRtl));
        localStorage.setItem('xtox_geo_version',      GEO_CACHE_VERSION);
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
      value={{ language, isRTL, showToggle, nativeName, nativeLang, toggleLanguage, detectedCountry, t, tCat, tCity, tCond }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export default LanguageContext;
