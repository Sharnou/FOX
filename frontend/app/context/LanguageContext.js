'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import translations, { CATEGORY_KEY_MAP, CITY_KEY_MAP, CONDITION_KEY_MAP } from '../translations/index';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';
const GEO_CACHE_VERSION = '5';  // bumped to v5 — forces nuclear clear of stale FR data
const TRANS_CACHE_VERSION = '1'; // bump to force re-fetch of dynamic translations

// Languages served from the static bundle (no API fetch needed)
const STATIC_LANGS = new Set(['ar', 'en', 'de', 'es', 'tr', 'ru', 'zh']);

const LanguageContext = createContext({
  language: 'ar', isRTL: true, showToggle: true,
  nativeName: 'عر', toggleLanguage: () => {},
  detectedCountry: 'EG', nativeLang: 'ar',
  t: (key) => translations['ar']?.[key] || key,
  tCat: (name) => name, tCity: (name) => name, tCond: (val) => val,
  translationsReady: true,
});

function makeT(lang, dynamicTranslations) {
  return (key) => {
    // Check dynamic translations first (for non-static languages)
    if (dynamicTranslations && dynamicTranslations[key]) return dynamicTranslations[key];
    // Fall back to static translations
    const dict = translations[lang] || translations['en'] || translations['ar'];
    return dict?.[key] ?? translations['en']?.[key] ?? translations['ar']?.[key] ?? key;
  };
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('ar');
  const [isRTL, setIsRTL] = useState(true);
  const [showToggle, setShowToggle] = useState(true);
  const [nativeName, setNativeName] = useState('عر');
  const [detectedCountry, setDetectedCountry] = useState('EG');
  const [nativeLang, setNativeLang] = useState('ar');
  const [dynamicTranslations, setDynamicTranslations] = useState(null);
  const [translationsReady, setTranslationsReady] = useState(true);

  // Fetch dynamic translations for non-static languages
  async function fetchDynamicTranslations(lang) {
    if (STATIC_LANGS.has(lang)) {
      setDynamicTranslations(null);
      setTranslationsReady(true);
      return;
    }

    // Check localStorage cache
    const cacheKey = `xtox_trans_${lang}`;
    const cacheVersionKey = `xtox_trans_v_${lang}`;
    const cached = localStorage.getItem(cacheKey);
    const cachedVersion = localStorage.getItem(cacheVersionKey);

    if (cached && cachedVersion === TRANS_CACHE_VERSION) {
      try {
        setDynamicTranslations(JSON.parse(cached));
        setTranslationsReady(true);
        return;
      } catch {}
    }

    // Fetch from backend (will generate via OpenAI if not in MongoDB)
    setTranslationsReady(false);
    try {
      const res = await fetch(`${BACKEND_URL}/api/translations/${lang}`, {
        signal: AbortSignal.timeout(20000), // 20s timeout for OpenAI generation
      });
      const data = await res.json();

      if (data.translations) {
        // Cache in localStorage
        try {
          localStorage.setItem(cacheKey, JSON.stringify(data.translations));
          localStorage.setItem(cacheVersionKey, TRANS_CACHE_VERSION);
        } catch {}
        setDynamicTranslations(data.translations);
      }
    } catch (err) {
      console.warn('[i18n] Failed to fetch dynamic translations, using fallback:', err.message);
      // Fail silently — t() will fall back to English
    } finally {
      setTranslationsReady(true);
    }
  }

  function applyLangToDOM(lang, rtl) {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = lang;
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('data-lang', lang);
  }

  useEffect(() => {
    async function init() {
      const cacheVersion = localStorage.getItem('xtox_geo_version');

      // Nuclear clear: if version doesn't match, wipe ALL stale geo + lang data.
      // This fixes Egyptian users who got version '2' cached WITH wrong 'fr' data
      // from the Railway-IP detection bug (before the geo fix was live).
      if (cacheVersion !== GEO_CACHE_VERSION) {
        // Only clear geo detection cache — never the user's explicit language choice.
        // Bumping GEO_CACHE_VERSION forces fresh geo detection but PRESERVES user language pref.
        [
          'xtox_detected_country', 'xtox_show_toggle', 'xtox_native_lang',
          'xtox_native_name', 'xtox_native_rtl', 'xtox_geo_version',
          // 'xtox_language' intentionally excluded — user choice is never auto-reset
          'xtox_trans_fr', 'xtox_trans_v_fr',
        ].forEach(k => localStorage.removeItem(k));
        // Also clear language if it's French (no longer supported)
        const storedLangCheck = localStorage.getItem('xtox_language');
        if (storedLangCheck === 'fr') localStorage.removeItem('xtox_language');
      }

      // After possible clear, read from localStorage (null if we just cleared)
      const storedCountry = localStorage.getItem('xtox_detected_country');
      const storedToggle  = storedCountry ? localStorage.getItem('xtox_show_toggle') : null;
      const storedNative  = storedCountry ? localStorage.getItem('xtox_native_lang') : null;
      const storedName    = storedCountry ? localStorage.getItem('xtox_native_name') : null;
      const storedRTL     = storedCountry ? localStorage.getItem('xtox_native_rtl') : null;
      const savedLang     = localStorage.getItem('xtox_language');

      let country, toggle, native, name, nativeRtl;

      if (storedCountry && storedToggle !== null) {
        country   = storedCountry;
        toggle    = storedToggle === 'true';
        native    = storedNative || 'ar';
        name      = storedName  || null;
        nativeRtl = storedRTL   === 'true';
      } else {
        try {
          const res  = await fetch('/api/geo', { signal: AbortSignal.timeout(4000) });
          const data = await res.json();
          country   = data.country    || 'EG';
          toggle    = !!data.showToggle;
          native    = data.language   || 'ar';
          name      = data.nativeName || null;
          nativeRtl = !!data.rtl;
        } catch {
          country   = 'EG';
          toggle    = true;
          native    = 'ar';
          name      = 'عر';
          nativeRtl = true;
        }
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

      let currentLang;
      if (!toggle) {
        currentLang = 'en'; // English-native country → always English
      } else if (!savedLang) {
        currentLang = native; // No preference saved → use detected native lang
      } else if (savedLang === 'en' || savedLang === native) {
        currentLang = savedLang; // Valid user preference → keep it
      } else {
        currentLang = native; // Stale/invalid preference → reset to native
        localStorage.removeItem('xtox_language');
      }

      localStorage.setItem('xtox_language', currentLang);
      setLanguage(currentLang);

      const currentRTL = (currentLang === native) ? nativeRtl : false;
      setIsRTL(currentRTL);
      applyLangToDOM(currentLang, currentRTL);

      // Fetch dynamic translations if needed
      await fetchDynamicTranslations(currentLang);
    }

    init();
  }, []);

  async function toggleLanguage() {
    if (!showToggle) return;
    const nativeRtl = localStorage.getItem('xtox_native_rtl') === 'true';
    const newLang   = language === nativeLang ? 'en' : nativeLang;
    const newRTL    = newLang  === nativeLang ? nativeRtl : false;

    setLanguage(newLang);
    setIsRTL(newRTL);
    localStorage.setItem('xtox_language', newLang);
    applyLangToDOM(newLang, newRTL);

    // Fetch dynamic translations for the toggled language if needed
    await fetchDynamicTranslations(newLang);
  }

  const t = useCallback(
    (key) => makeT(language, dynamicTranslations)(key),
    [language, dynamicTranslations]
  );

  const tCat = useCallback((arabicName) => {
    if (!arabicName) return arabicName;
    const key = CATEGORY_KEY_MAP?.[arabicName] || CATEGORY_KEY_MAP?.[arabicName?.trim()];
    if (!key) return arabicName;
    return t(key);
  }, [t]);

  const tCity = useCallback((arabicCity) => {
    if (!arabicCity) return arabicCity;
    const key = CITY_KEY_MAP?.[arabicCity] || CITY_KEY_MAP?.[arabicCity?.trim()];
    if (!key) return arabicCity;
    return t(key);
  }, [t]);

  const tCond = useCallback((condition) => {
    if (!condition) return condition;
    const key = CONDITION_KEY_MAP?.[condition] || CONDITION_KEY_MAP?.[condition?.trim()];
    if (!key) return condition;
    return t(key);
  }, [t]);

  return (
    <LanguageContext.Provider value={{
      language, isRTL, showToggle, nativeName, toggleLanguage,
      detectedCountry, nativeLang, t, tCat, tCity, tCond, translationsReady,
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export default LanguageContext;
