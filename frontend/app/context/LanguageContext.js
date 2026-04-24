'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations as staticTranslations, CATEGORY_KEY_MAP, CITY_KEY_MAP, CONDITION_KEY_MAP } from '../translations/index';
import { RTL_LANGS } from '../lib/countryLanguageMap';

const LanguageContext = createContext(null);
const GEO_CACHE_VERSION = '7';
const GEO_CACHE_KEY = `xtox_geo_v${GEO_CACHE_VERSION}`;

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('en');
  const [localLang, setLocalLang] = useState('en');
  const [toggleLangs, setToggleLangs] = useState(['en']);
  const [translations, setTranslations] = useState(staticTranslations['en'] || {});
  const [ready, setReady] = useState(false);

  // Apply lang to DOM (RTL/LTR, html lang attr)
  const applyLangToDOM = useCallback((l) => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = l;
    document.documentElement.dir = RTL_LANGS.has(l) ? 'rtl' : 'ltr';
    document.body.classList.toggle('rtl', RTL_LANGS.has(l));
  }, []);

  // Get translations for a language (static or fetched)
  const getTranslations = useCallback(async (l) => {
    // Check static bundle first
    if (staticTranslations[l]) return staticTranslations[l];

    // Check localStorage cache
    try {
      const cached = localStorage.getItem(`xtox_trans_${l}`);
      if (cached) {
        try { return JSON.parse(cached); } catch {}
      }
    } catch {}

    // Fetch from frontend API (generate via GPT)
    try {
      const res = await fetch(`/api/translations/generate?lang=${l}`);
      if (res.ok) {
        const data = await res.json();
        if (data.translations) {
          try {
            localStorage.setItem(`xtox_trans_${l}`, JSON.stringify(data.translations));
          } catch {}
          return data.translations;
        }
      }
    } catch {}

    // Fallback to English
    return staticTranslations['en'] || {};
  }, []);

  // Switch language
  const switchLang = useCallback(async (newLang) => {
    const trans = await getTranslations(newLang);
    setLang(newLang);
    setTranslations(trans);
    applyLangToDOM(newLang);
    try { localStorage.setItem('xtox_lang', newLang); } catch {}
  }, [getTranslations, applyLangToDOM]);

  // Toggle between the 2 available languages
  const toggleLanguage = useCallback(() => {
    if (toggleLangs.length < 2) return;
    const currentIdx = toggleLangs.indexOf(lang);
    const nextLang = toggleLangs[(currentIdx + 1) % toggleLangs.length];
    switchLang(nextLang);
  }, [lang, toggleLangs, switchLang]);

  // t() translation function
  const t = useCallback((key) => {
    return translations[key] || staticTranslations['en']?.[key] || key;
  }, [translations]);

  // tCat / tCity / tCond helpers (unchanged logic, now use new t())
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

  useEffect(() => {
    async function init() {
      // Check cached geo
      let cached = null;
      try { cached = JSON.parse(localStorage.getItem(GEO_CACHE_KEY)); } catch {}

      let geoLocalLang = 'en';
      if (!cached) {
        try {
          const res = await fetch('/api/geo');
          const data = await res.json();
          geoLocalLang = data.localLang || 'en';
          try {
            localStorage.setItem(GEO_CACHE_KEY, JSON.stringify({ localLang: geoLocalLang, ts: Date.now() }));
          } catch {}
        } catch {}
      } else {
        geoLocalLang = cached.localLang || 'en';
      }

      setLocalLang(geoLocalLang);
      const langs = geoLocalLang === 'en' ? ['en'] : ['en', geoLocalLang];
      setToggleLangs(langs);

      // Determine active lang: use saved preference if it's in the toggle pair, else use localLang
      let saved = null;
      try { saved = localStorage.getItem('xtox_lang'); } catch {}
      const activeLang = (saved && langs.includes(saved)) ? saved : geoLocalLang;

      const trans = await getTranslations(activeLang);
      setLang(activeLang);
      setTranslations(trans);
      applyLangToDOM(activeLang);
      setReady(true);
    }
    init();
  }, []);

  // Legacy compat: isRTL, showToggle, nativeName, language, detectedCountry, nativeLang
  const isRTL = RTL_LANGS.has(lang);
  const showToggle = toggleLangs.length >= 2;
  const language = lang;
  const detectedCountry = '';
  const nativeLang = localLang;
  const nativeName = '';
  const translationsReady = ready;

  return (
    <LanguageContext.Provider value={{
      lang, localLang, toggleLangs, t, toggleLanguage, switchLang, ready,
      // Legacy compat
      language, isRTL, showToggle, nativeName, detectedCountry, nativeLang,
      translationsReady, tCat, tCity, tCond,
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}

export default LanguageContext;
