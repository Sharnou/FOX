// Complete mapping: ISO 3166-1 alpha-2 country code → ISO 639-1 language code
// Rule: map to the PRIMARY official spoken language of that country
// English-speaking countries → 'en' (toggle hidden for them)
export const COUNTRY_LANGUAGE_MAP = {
  // ============ ARABIC-SPEAKING (ALL Arab League countries → ar) ============
  EG: 'ar',  // Egypt → Arabic ✓
  SA: 'ar',  // Saudi Arabia → Arabic
  AE: 'ar',  // UAE → Arabic
  KW: 'ar',  // Kuwait → Arabic
  QA: 'ar',  // Qatar → Arabic
  BH: 'ar',  // Bahrain → Arabic
  OM: 'ar',  // Oman → Arabic
  JO: 'ar',  // Jordan → Arabic
  LB: 'ar',  // Lebanon → Arabic
  SY: 'ar',  // Syria → Arabic
  IQ: 'ar',  // Iraq → Arabic
  LY: 'ar',  // Libya → Arabic
  TN: 'ar',  // Tunisia → Arabic
  DZ: 'ar',  // Algeria → Arabic
  MA: 'ar',  // Morocco → Arabic (Darija/Arabic)
  SD: 'ar',  // Sudan → Arabic
  YE: 'ar',  // Yemen → Arabic
  PS: 'ar',  // Palestine → Arabic
  MR: 'ar',  // Mauritania → Arabic
  DJ: 'ar',  // Djibouti → Arabic (co-official)
  SO: 'ar',  // Somalia → Arabic (co-official)
  KM: 'ar',  // Comoros → Arabic/Comorian

  // ============ ENGLISH-SPEAKING (toggle hidden) ============
  US: 'en',  GB: 'en',  AU: 'en',  NZ: 'en',  IE: 'en',
  JM: 'en',  TT: 'en',  BB: 'en',  BS: 'en',  GY: 'en',
  BZ: 'en',  PG: 'en',  FJ: 'en',  SB: 'en',  TO: 'en',
  WS: 'en',  KI: 'en',  TV: 'en',  NR: 'en',  PW: 'en',
  MH: 'en',  FM: 'en',
  // English-speaking African countries
  NG: 'en',  GH: 'en',  SL: 'en',  LR: 'en',  GM: 'en',
  ZM: 'en',  ZW: 'en',  NA: 'en',
  // English primary digital/official language
  SG: 'en',  // Singapore
  PH: 'en',  // Philippines
  CA: 'en',  // Canada
  ZA: 'en',  // South Africa

  // ============ GERMAN ============
  DE: 'de',  AT: 'de',  LI: 'de',  CH: 'de',

  // ============ FRENCH (France + TRUE French-speaking countries) ============
  FR: 'fr',
  MC: 'fr',  // Monaco
  BE: 'fr',  // Belgium (French co-official, used as primary)
  LU: 'fr',  // Luxembourg
  // Francophone Africa
  SN: 'fr',  // Senegal
  CI: 'fr',  // Côte d'Ivoire
  CM: 'fr',  // Cameroon
  GA: 'fr',  // Gabon
  CG: 'fr',  // Congo
  CD: 'fr',  // DR Congo
  CF: 'fr',  // Central African Republic
  TD: 'fr',  // Chad
  NE: 'fr',  // Niger
  ML: 'fr',  // Mali
  BF: 'fr',  // Burkina Faso
  GN: 'fr',  // Guinea
  TG: 'fr',  // Togo
  BJ: 'fr',  // Benin
  BI: 'fr',  // Burundi
  MG: 'fr',  // Madagascar
  MU: 'fr',  // Mauritius
  HT: 'fr',  // Haiti
  // French overseas territories
  MQ: 'fr',  GF: 'fr',  GP: 'fr',  RE: 'fr',  YT: 'fr',
  NC: 'fr',  PF: 'fr',
  VU: 'fr',  // Vanuatu (French co-official)

  // ============ SPANISH ============
  ES: 'es',  MX: 'es',  AR: 'es',  CO: 'es',  CL: 'es',
  PE: 'es',  VE: 'es',  EC: 'es',  BO: 'es',  PY: 'es',
  UY: 'es',  GT: 'es',  HN: 'es',  SV: 'es',  NI: 'es',
  CR: 'es',  PA: 'es',  CU: 'es',  DO: 'es',  PR: 'es',
  GQ: 'es',  // Equatorial Guinea

  // ============ PORTUGUESE ============
  PT: 'pt',  BR: 'pt',  AO: 'pt',  MZ: 'pt',  CV: 'pt',
  ST: 'pt',  GW: 'pt',  TL: 'pt',  // Timor-Leste

  // ============ ITALIAN ============
  IT: 'it',  SM: 'it',  VA: 'it',

  // ============ DUTCH ============
  NL: 'nl',  SR: 'nl',  AW: 'nl',  CW: 'nl',  SX: 'nl',  BQ: 'nl',

  // ============ NORDIC ============
  SE: 'sv',
  NO: 'no',  SJ: 'no',
  DK: 'da',  FO: 'da',  GL: 'da',
  FI: 'fi',
  IS: 'is',

  // ============ EASTERN / CENTRAL EUROPE ============
  PL: 'pl',
  CZ: 'cs',
  SK: 'sk',
  HU: 'hu',
  RO: 'ro',  MD: 'ro',
  BG: 'bg',
  HR: 'hr',
  RS: 'sr',  ME: 'sr',
  BA: 'bs',
  SI: 'sl',
  MK: 'mk',
  AL: 'sq',  XK: 'sq',
  GR: 'el',  CY: 'el',
  MT: 'mt',

  // ============ BALTIC ============
  EE: 'et',
  LV: 'lv',
  LT: 'lt',

  // ============ POST-SOVIET ============
  RU: 'ru',
  BY: 'ru',  // Belarus (Russian widely used)
  UA: 'uk',
  KZ: 'kk',  // Kazakhstan → Kazakh
  KG: 'ky',  // Kyrgyzstan → Kyrgyz
  UZ: 'uz',
  TM: 'tk',
  TJ: 'tg',
  AM: 'hy',
  GE: 'ka',
  AZ: 'az',

  // ============ TURKISH ============
  TR: 'tr',

  // ============ MIDDLE EAST (non-Arabic) ============
  IR: 'fa',  AF: 'fa',  // Iran, Afghanistan → Persian/Farsi
  IL: 'he',             // Israel → Hebrew
  PK: 'ur',             // Pakistan → Urdu

  // ============ SOUTH ASIA ============
  IN: 'hi',   // India → Hindi
  BD: 'bn',   // Bangladesh → Bengali
  LK: 'si',   // Sri Lanka → Sinhala
  NP: 'ne',   // Nepal → Nepali
  BT: 'dz',   // Bhutan → Dzongkha
  MV: 'dv',   // Maldives → Dhivehi

  // ============ SOUTHEAST ASIA ============
  TH: 'th',
  VN: 'vi',
  ID: 'id',
  MY: 'ms',
  MM: 'my',
  KH: 'km',
  LA: 'lo',

  // ============ EAST ASIA ============
  JP: 'ja',
  CN: 'zh',  TW: 'zh',  HK: 'zh',  MO: 'zh',
  KR: 'ko',  KP: 'ko',
  MN: 'mn',

  // ============ SUB-SAHARAN AFRICA (non-French, non-English) ============
  ET: 'am',  // Ethiopia → Amharic
  ER: 'ti',  // Eritrea → Tigrinya
  KE: 'sw',  // Kenya → Swahili
  TZ: 'sw',  // Tanzania → Swahili
  UG: 'sw',  // Uganda → Swahili
  RW: 'rw',  // Rwanda → Kinyarwanda
  MW: 'ny',  // Malawi → Chichewa
  BW: 'tn',  // Botswana → Setswana
  LS: 'st',  // Lesotho → Sesotho
  SZ: 'ss',  // Eswatini → Swati
};

// Languages that display Right-To-Left
export const RTL_LANGS = new Set(['ar', 'he', 'fa', 'ur', 'dv', 'ug']);

// Native display name for each language code (shown in toggle button)
export const LANG_NAMES = {
  ar: 'العربية',   en: 'English',    de: 'Deutsch',      fr: 'Français',
  tr: 'Türkçe',    es: 'Español',    ru: 'Русский',      zh: '中文',
  ja: '日本語',    ko: '한국어',     it: 'Italiano',     pt: 'Português',
  nl: 'Nederlands', pl: 'Polski',    sv: 'Svenska',      no: 'Norsk',
  da: 'Dansk',     fi: 'Suomi',      cs: 'Čeština',      hu: 'Magyar',
  ro: 'Română',    uk: 'Українська', el: 'Ελληνικά',     he: 'עברית',
  fa: 'فارسی',     hi: 'हिन्दी',    bn: 'বাংলা',        id: 'Bahasa Indonesia',
  ms: 'Bahasa Melayu', th: 'ภาษาไทย', vi: 'Tiếng Việt', ur: 'اردو',
  sw: 'Kiswahili', am: 'አማርኛ',      bg: 'Български',   hr: 'Hrvatski',
  sr: 'Srpski',    sl: 'Slovenščina', sk: 'Slovenčina',  lt: 'Lietuvių',
  lv: 'Latviešu',  et: 'Eesti',      is: 'Íslenska',    mk: 'Македонски',
  sq: 'Shqip',     mt: 'Malti',      ka: 'ქართული',     hy: 'Հայերեն',
  az: 'Azərbaycan', uz: 'Oʻzbek',   mn: 'Монгол',       kk: 'Қазақ',
  ky: 'Кыргыз',   tg: 'Тоҷикӣ',     tk: 'Türkmen',     si: 'සිංහල',
  ne: 'नेपाली',   my: 'မြန်မာ',      km: 'ខ្មែរ',       lo: 'ລາວ',
  rw: 'Kinyarwanda', ny: 'Chichewa', bs: 'Bosanski',     dz: 'རྫོང་ཁ',
  dv: 'ދިވެހި',   ti: 'ትግርኛ',       tn: 'Setswana',    st: 'Sesotho',
  ss: 'Siswati',   me: 'Crnogorski',
};
