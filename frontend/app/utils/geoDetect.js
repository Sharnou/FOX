// Country code → { name in local language, nameEn, flag, lang, dir, currency }
export const COUNTRIES = {
  EG: { name: 'مصر', nameEn: 'Egypt', flag: '🇪🇬', lang: 'ar', dir: 'rtl', currency: 'جنيه' },
  SA: { name: 'السعودية', nameEn: 'Saudi Arabia', flag: '🇸🇦', lang: 'ar', dir: 'rtl', currency: 'ريال' },
  AE: { name: 'الإمارات', nameEn: 'UAE', flag: '🇦🇪', lang: 'ar', dir: 'rtl', currency: 'درهم' },
  KW: { name: 'الكويت', nameEn: 'Kuwait', flag: '🇰🇼', lang: 'ar', dir: 'rtl', currency: 'دينار' },
  QA: { name: 'قطر', nameEn: 'Qatar', flag: '🇶🇦', lang: 'ar', dir: 'rtl', currency: 'ريال' },
  BH: { name: 'البحرين', nameEn: 'Bahrain', flag: '🇧🇭', lang: 'ar', dir: 'rtl', currency: 'دينار' },
  OM: { name: 'عُمان', nameEn: 'Oman', flag: '🇴🇲', lang: 'ar', dir: 'rtl', currency: 'ريال' },
  JO: { name: 'الأردن', nameEn: 'Jordan', flag: '🇯🇴', lang: 'ar', dir: 'rtl', currency: 'دينار' },
  LB: { name: 'لبنان', nameEn: 'Lebanon', flag: '🇱🇧', lang: 'ar', dir: 'rtl', currency: 'ليرة' },
  MA: { name: 'المغرب', nameEn: 'Morocco', flag: '🇲🇦', lang: 'ar', dir: 'rtl', currency: 'درهم' },
  DZ: { name: 'الجزائر', nameEn: 'Algeria', flag: '🇩🇿', lang: 'ar', dir: 'rtl', currency: 'دينار' },
  TN: { name: 'تونس', nameEn: 'Tunisia', flag: '🇹🇳', lang: 'ar', dir: 'rtl', currency: 'دينار' },
  LY: { name: 'ليبيا', nameEn: 'Libya', flag: '🇱🇾', lang: 'ar', dir: 'rtl', currency: 'دينار' },
  IQ: { name: 'العراق', nameEn: 'Iraq', flag: '🇮🇶', lang: 'ar', dir: 'rtl', currency: 'دينار' },
  SD: { name: 'السودان', nameEn: 'Sudan', flag: '🇸🇩', lang: 'ar', dir: 'rtl', currency: 'جنيه' },
  SY: { name: 'سوريا', nameEn: 'Syria', flag: '🇸🇾', lang: 'ar', dir: 'rtl', currency: 'ليرة' },
  PS: { name: 'فلسطين', nameEn: 'Palestine', flag: '🇵🇸', lang: 'ar', dir: 'rtl', currency: 'شيكل' },
  YE: { name: 'اليمن', nameEn: 'Yemen', flag: '🇾🇪', lang: 'ar', dir: 'rtl', currency: 'ريال' },
  SO: { name: 'الصومال', nameEn: 'Somalia', flag: '🇸🇴', lang: 'ar', dir: 'rtl', currency: 'شلن' },
  US: { name: 'USA', nameEn: 'United States', flag: '🇺🇸', lang: 'en', dir: 'ltr', currency: '$' },
  GB: { name: 'UK', nameEn: 'United Kingdom', flag: '🇬🇧', lang: 'en', dir: 'ltr', currency: '£' },
  FR: { name: 'France', nameEn: 'France', flag: '🇫🇷', lang: 'en', dir: 'ltr', currency: '€' },
  DE: { name: 'Deutschland', nameEn: 'Germany', flag: '🇩🇪', lang: 'de', dir: 'ltr', currency: '€' },
  CA: { name: 'Canada', nameEn: 'Canada', flag: '🇨🇦', lang: 'en', dir: 'ltr', currency: '$' },
  AU: { name: 'Australia', nameEn: 'Australia', flag: '🇦🇺', lang: 'en', dir: 'ltr', currency: '$' },
};

export const ARABIC_COUNTRIES = Object.keys(COUNTRIES).filter(c => COUNTRIES[c].lang === 'ar');

// UI string translations
export const UI_STRINGS = {
  ar: {
    allAds: 'كل الإعلانات',
    noAds: 'لا توجد إعلانات في هذا البلد',
    ads: 'إعلان',
    selectCountry: 'اختر دولتك',
    latestAds: 'أحدث الإعلانات',
    featuredAds: 'إعلانات مميزة',
    searchPlaceholder: 'ابحث عن أي شيء...',
    buy: 'اشتري', sell: 'بيع', chat: 'محادثة', profile: 'ملفي',
  },
  en: {
    allAds: 'All Ads', noAds: 'No ads in this country', ads: 'ads',
    selectCountry: 'Select your country', latestAds: 'Latest Ads',
    featuredAds: 'Featured Ads', searchPlaceholder: 'Search for anything...',
    buy: 'Buy', sell: 'Sell', chat: 'Chat', profile: 'Profile',
  },
};

export async function detectCountry() {
  if (typeof window === 'undefined') return 'EG';
  // 1. Check localStorage cache (1 hour)
  try {
    const cached = localStorage.getItem('xtox_country');
    const cachedTime = localStorage.getItem('xtox_country_time');
    if (cached && cachedTime && Date.now() - parseInt(cachedTime) < 3600000) {
      return cached;
    }
  } catch {}
  // 2. Try ipapi.co (free, no key)
  try {
    const r = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) });
    const d = await r.json();
    if (d.country_code && COUNTRIES[d.country_code]) {
      try {
        localStorage.setItem('xtox_country', d.country_code);
        localStorage.setItem('xtox_country_time', Date.now().toString());
      } catch {}
      return d.country_code;
    }
  } catch {}
  // 3. Fallback: Intl timezone → country
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const tzMap = {
      'Africa/Cairo': 'EG', 'Asia/Riyadh': 'SA', 'Asia/Dubai': 'AE',
      'Asia/Kuwait': 'KW', 'Asia/Qatar': 'QA', 'Asia/Bahrain': 'BH',
      'Asia/Muscat': 'OM', 'Asia/Amman': 'JO', 'Asia/Beirut': 'LB',
      'Africa/Casablanca': 'MA', 'Africa/Algiers': 'DZ', 'Africa/Tunis': 'TN',
      'Africa/Tripoli': 'LY', 'Asia/Baghdad': 'IQ', 'Africa/Khartoum': 'SD',
      'Asia/Damascus': 'SY', 'Asia/Gaza': 'PS', 'Asia/Aden': 'YE',
      'America/New_York': 'US', 'America/Los_Angeles': 'US', 'America/Chicago': 'US',
      'Europe/London': 'GB', 'Europe/Paris': 'FR', 'Europe/Berlin': 'DE',
      'America/Toronto': 'CA', 'Australia/Sydney': 'AU',
    };
    if (tzMap[tz]) return tzMap[tz];
  } catch {}
  return 'EG'; // Default to Egypt
}
