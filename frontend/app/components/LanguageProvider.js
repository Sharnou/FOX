'use client';
import { useEffect } from 'react';
import { detectCountry, COUNTRIES } from '../utils/geoDetect';

export default function LanguageProvider({ children }) {
  useEffect(() => {
    detectCountry().then(code => {
      const info = COUNTRIES[code];
      if (info) {
        document.documentElement.lang = info.lang;
        document.documentElement.dir = info.dir;
        try {
          localStorage.setItem('xtox_lang', info.lang);
          localStorage.setItem('xtox_dir', info.dir);
        } catch {}
      }
    });
  }, []);
  return children;
}
