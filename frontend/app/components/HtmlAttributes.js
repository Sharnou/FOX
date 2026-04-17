'use client';
import { useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

/**
 * HtmlAttributes — dynamically sets lang and dir on <html> element.
 * Renders nothing; called from RootLayout (server component) via LanguageProvider wrapper.
 * The LanguageContext already updates these attributes in its own useEffect,
 * but this component ensures the update happens after hydration for SSR correctness.
 */
export default function HtmlAttributes() {
  const { language, isRTL } = useLanguage();
  
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    }
  }, [language, isRTL]);
  
  return null; // renders nothing, just applies HTML attributes
}
