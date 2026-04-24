// Complete mapping: ISO 3166-1 alpha-2 country code → ISO 639-1 language code
// This covers 195+ countries
export const COUNTRY_LANGUAGE_MAP = {
  // Arabic-speaking
  EG: 'ar', SA: 'ar', AE: 'ar', KW: 'ar', QA: 'ar', BH: 'ar', OM: 'ar',
  JO: 'ar', LB: 'ar', SY: 'ar', IQ: 'ar', LY: 'ar', TN: 'ar', DZ: 'ar',
  MA: 'ar', SD: 'ar', YE: 'ar', PS: 'ar', MR: 'ar', DJ: 'ar', SO: 'ar', KM: 'ar',

  // English-speaking (no toggle, EN only)
  US: 'en', GB: 'en', AU: 'en', CA: 'en', NZ: 'en', IE: 'en', ZA: 'en',
  NG: 'en', GH: 'en', KE: 'en', UG: 'en', TZ: 'en', ZM: 'en', ZW: 'en',
  BW: 'en', SL: 'en', LR: 'en', GM: 'en', SG: 'en', PH: 'en', JM: 'en',
  TT: 'en', BB: 'en', BS: 'en', GY: 'en', BZ: 'en', PG: 'en', FJ: 'en',
  SB: 'en', TO: 'en', WS: 'en', KI: 'en', TV: 'en', NR: 'en', PW: 'en',
  MH: 'en', FM: 'en',
  IN: 'hi', // India → Hindi (EN is official too but local is Hindi)
  PK: 'ur', BD: 'bn', LK: 'si', NP: 'ne', MM: 'my', KH: 'km',

  // European
  DE: 'de', AT: 'de', CH: 'de', LI: 'de', LU: 'lb',
  FR: 'fr', BE: 'fr', MC: 'fr', SN: 'fr', CI: 'fr', CM: 'fr', MG: 'fr',
  ML: 'fr', BF: 'fr', GN: 'fr', TG: 'fr', BJ: 'fr', NE: 'fr', CF: 'fr',
  GA: 'fr', CG: 'fr', CD: 'fr', RW: 'fr', BI: 'fr', MU: 'fr', HT: 'fr',
  MQ: 'fr', GP: 'fr', GF: 'fr', RE: 'fr', YT: 'fr', NC: 'fr', PF: 'fr',
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es', VE: 'es',
  EC: 'es', BO: 'es', PY: 'es', UY: 'es', GT: 'es', HN: 'es', SV: 'es',
  NI: 'es', CR: 'es', PA: 'es', CU: 'es', DO: 'es', PR: 'es',
  PT: 'pt', BR: 'pt', AO: 'pt', MZ: 'pt', CV: 'pt', ST: 'pt', GW: 'pt', TL: 'pt',
  IT: 'it', SM: 'it', VA: 'it',
  NL: 'nl', SR: 'nl', AW: 'nl', CW: 'nl', SX: 'nl', BQ: 'nl',
  PL: 'pl',
  RU: 'ru', BY: 'ru', KZ: 'ru', KG: 'ru',
  UA: 'uk',
  SE: 'sv',
  NO: 'no', SJ: 'no',
  DK: 'da', FO: 'da', GL: 'da',
  FI: 'fi',
  CZ: 'cs',
  SK: 'sk',
  HU: 'hu',
  RO: 'ro', MD: 'ro',
  BG: 'bg',
  HR: 'hr',
  RS: 'sr', ME: 'sr', BA: 'bs',
  SI: 'sl',
  MK: 'mk',
  AL: 'sq', XK: 'sq',
  GR: 'el', CY: 'el',
  TR: 'tr', AZ: 'az',
  GE: 'ka',
  AM: 'hy',
  EE: 'et',
  LV: 'lv',
  LT: 'lt',
  IS: 'is',
  MT: 'mt',

  // Middle East (non-Arabic)
  IR: 'fa', AF: 'fa',
  IL: 'he',

  // Asia
  JP: 'ja',
  CN: 'zh', TW: 'zh', HK: 'zh', MO: 'zh',
  KR: 'ko',
  VN: 'vi',
  TH: 'th',
  ID: 'id', MY: 'ms',
  MN: 'mn',
  KP: 'ko',
  UZ: 'uz', TM: 'tk', TJ: 'tg',

  // Africa (non-Arabic)
  ET: 'am', ER: 'ti',
  MW: 'ny',

  // Default fallback
  DEFAULT: 'en',
};

// Languages that are RTL
export const RTL_LANGS = new Set(['ar', 'he', 'fa', 'ur']);

// Language display names (native name)
export const LANG_NAMES = {
  ar: 'العربية', en: 'English', de: 'Deutsch', fr: 'Français',
  tr: 'Türkçe', es: 'Español', ru: 'Русский', zh: '中文',
  ja: '日本語', ko: '한국어', it: 'Italiano', pt: 'Português',
  nl: 'Nederlands', pl: 'Polski', sv: 'Svenska', no: 'Norsk',
  da: 'Dansk', fi: 'Suomi', cs: 'Čeština', hu: 'Magyar',
  ro: 'Română', uk: 'Українська', el: 'Ελληνικά', he: 'עברית',
  fa: 'فارسی', hi: 'हिन्दी', bn: 'বাংলা', id: 'Bahasa Indonesia',
  ms: 'Bahasa Melayu', th: 'ภาษาไทย', vi: 'Tiếng Việt',
  ur: 'اردو', sw: 'Kiswahili', am: 'አማርኛ', bg: 'Български',
  hr: 'Hrvatski', sr: 'Srpski', sl: 'Slovenščina', sk: 'Slovenčina',
  lt: 'Lietuvių', lv: 'Latviešu', et: 'Eesti', is: 'Íslenska',
  mk: 'Македонски', sq: 'Shqip', mt: 'Malti', ka: 'ქართული',
  hy: 'Հայերեն', az: 'Azərbaycan', uz: 'Oʻzbek', mn: 'Монгол',
};
