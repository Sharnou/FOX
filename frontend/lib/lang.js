/**
 * XTOX Language Detection Utility
 * Detect user language from:
 * 1. localStorage (user's explicit choice, highest priority)
 * 2. browser navigator.language
 * 3. IP-based country (stored in localStorage as xtox_country or country)
 * Falls back to Arabic for MENA countries, English otherwise
 */

const ARABIC_COUNTRIES = ['EG','SA','AE','KW','QA','BH','OM','JO','IQ','SY','LB','MA','DZ','TN','LY','YE','PS','SD'];
const ARABIC_LOCALES = ['ar','ar-EG','ar-SA','ar-AE','ar-KW','ar-QA','ar-BH','ar-OM','ar-JO','ar-IQ','ar-SY','ar-LB','ar-MA','ar-DZ','ar-TN','ar-LY','ar-YE'];

export function detectLang() {
  if (typeof window === 'undefined') return 'ar'; // SSR default

  // 1. Explicit user choice (support both key conventions)
  const stored = localStorage.getItem('xtox_lang') || localStorage.getItem('lang');
  if (stored === 'ar' || stored === 'en' || stored === 'de') return stored;

  // 2. Browser language
  const browserLang = navigator.language || (navigator.languages && navigator.languages[0]) || '';
  if (ARABIC_LOCALES.some(l => browserLang.startsWith(l))) return 'ar';
  if (browserLang.startsWith('de')) return 'de';
  // French browser language → fallback to Arabic (app is AR/EN only)
  // if (browserLang.startsWith('fr')) return 'ar'; // removed - handled by default
  if (browserLang.startsWith('en')) return 'en';

  // 3. IP-based country (set during app init by ipapi.co call)
  const country = localStorage.getItem('xtox_country') || localStorage.getItem('country') || '';
  if (ARABIC_COUNTRIES.includes(country.toUpperCase())) return 'ar';

  return 'ar'; // default to Arabic (MENA app)
}

export function setLang(lang) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('xtox_lang', lang);
    localStorage.setItem('lang', lang);
  }
}

export function isRTL(lang) {
  return lang === 'ar';
}

export const COUNTRY_CURRENCY = {
  EG: { code: 'EGP', symbol: 'ج.م', name: 'جنيه مصري' },
  SA: { code: 'SAR', symbol: 'ر.س', name: 'ريال سعودي' },
  AE: { code: 'AED', symbol: 'د.إ', name: 'درهم إماراتي' },
  KW: { code: 'KWD', symbol: 'د.ك', name: 'دينار كويتي' },
  QA: { code: 'QAR', symbol: 'ر.ق', name: 'ريال قطري' },
  BH: { code: 'BHD', symbol: 'د.ب', name: 'دينار بحريني' },
  OM: { code: 'OMR', symbol: 'ر.ع', name: 'ريال عُماني' },
  JO: { code: 'JOD', symbol: 'د.أ', name: 'دينار أردني' },
  IQ: { code: 'IQD', symbol: 'د.ع', name: 'دينار عراقي' },
  MA: { code: 'MAD', symbol: 'د.م', name: 'درهم مغربي' },
  LY: { code: 'LYD', symbol: 'د.ل', name: 'دينار ليبي' },
  TN: { code: 'TND', symbol: 'د.ت', name: 'دينار تونسي' },
  DZ: { code: 'DZD', symbol: 'د.ج', name: 'دينار جزائري' },
  SY: { code: 'SYP', symbol: 'ل.س', name: 'ليرة سورية' },
  YE: { code: 'YER', symbol: 'ر.ي', name: 'ريال يمني' },
  SD: { code: 'SDG', symbol: 'ج.س', name: 'جنيه سوداني' },
  LB: { code: 'LBP', symbol: 'ل.ل', name: 'ليرة لبنانية' },
  US: { code: 'USD', symbol: '$', name: 'US Dollar' },
  GB: { code: 'GBP', symbol: '£', name: 'British Pound' },
  DE: { code: 'EUR', symbol: '€', name: 'Euro' },
};

export function detectCurrency() {
  if (typeof window === 'undefined') return COUNTRY_CURRENCY['EG'];
  const country = localStorage.getItem('xtox_country') || localStorage.getItem('country') || 'EG';
  return COUNTRY_CURRENCY[country.toUpperCase()] || COUNTRY_CURRENCY['EG'];
}
