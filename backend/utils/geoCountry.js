// Map ad location text (city names) → ISO 3166-1 alpha-2 country code
const CITY_TO_COUNTRY = {
  // Egypt
  'القاهرة':  'EG', 'cairo':    'EG', 'الإسكندرية': 'EG', 'alexandria': 'EG',
  'الجيزة':   'EG', 'giza':     'EG', 'الإسماعيلية': 'EG', 'اسماعيلية': 'EG',
  'بورسعيد':  'EG', 'السويس':   'EG', 'المنصورة':   'EG', 'أسيوط': 'EG',
  'أسوان':    'EG', 'الأقصر':   'EG', 'طنطا':       'EG', 'الزقازيق': 'EG',
  'المنوفية': 'EG', 'الفيوم':   'EG', 'بني سويف':   'EG', 'مرسى مطروح': 'EG',
  'الغردقة':  'EG', 'شرم الشيخ': 'EG', 'دمياط':      'EG', 'سوهاج': 'EG',
  'قنا':      'EG', 'مصر':      'EG', 'egypt':       'EG',
  // Saudi Arabia
  'الرياض':   'SA', 'riyadh':   'SA', 'جدة':         'SA', 'jeddah': 'SA',
  'مكة':      'SA', 'مكة المكرمة': 'SA', 'المدينة':  'SA', 'مدينة': 'SA',
  'الدمام':   'SA', 'الخبر':    'SA', 'تبوك':        'SA', 'أبها': 'SA',
  'حائل':     'SA', 'نجران':    'SA', 'السعودية':    'SA', 'saudi': 'SA',
  // UAE
  'دبي':      'AE', 'dubai':    'AE', 'أبوظبي':     'AE', 'abu dhabi': 'AE',
  'الشارقة':  'AE', 'عجمان':    'AE', 'الفجيرة':    'AE', 'رأس الخيمة': 'AE',
  'الإمارات': 'AE', 'uae':      'AE',
  // Kuwait
  'الكويت':   'KW', 'kuwait':   'KW', 'مدينة الكويت': 'KW', 'حولي': 'KW',
  'السالمية': 'KW', 'الفروانية': 'KW',
  // Qatar
  'الدوحة':   'QA', 'doha':     'QA', 'قطر':         'QA', 'qatar': 'QA',
  // Bahrain
  'المنامة':  'BH', 'manama':   'BH', 'البحرين':     'BH', 'bahrain': 'BH',
  // Oman
  'مسقط':     'OM', 'muscat':   'OM', 'عُمان':        'OM', 'عمان': 'OM', 'oman': 'OM',
  // Jordan
  'عمّان':    'JO', 'amman':    'JO', 'الأردن':      'JO', 'jordan': 'JO',
  'الزرقاء':  'JO', 'إربد':     'JO',
  // Lebanon
  'بيروت':    'LB', 'beirut':   'LB', 'لبنان':       'LB', 'lebanon': 'LB',
  'طرابلس':   'LB',
  // Morocco
  'الرباط':   'MA', 'rabat':    'MA', 'الدار البيضاء': 'MA', 'casablanca': 'MA',
  'مراكش':    'MA', 'marrakech': 'MA', 'فاس':         'MA', 'المغرب': 'MA',
  // Algeria
  'الجزائر':  'DZ', 'algiers':  'DZ', 'وهران':       'DZ', 'قسنطينة': 'DZ',
  // Tunisia
  'تونس':     'TN', 'tunis':    'TN', 'صفاقس':       'TN',
  // Libya
  'طرابلس ':  'LY', 'tripoli':  'LY', 'بنغازي':      'LY', 'ليبيا': 'LY', 'libya': 'LY',
  // Iraq
  'بغداد':    'IQ', 'baghdad':  'IQ', 'البصرة':      'IQ', 'الموصل': 'IQ', 'العراق': 'IQ',
  // Syria
  'دمشق':     'SY', 'damascus': 'SY', 'حلب':         'SY', 'aleppo': 'SY', 'سوريا': 'SY',
  // Palestine
  'غزة':      'PS', 'gaza':     'PS', 'رام الله':    'PS', 'نابلس': 'PS', 'فلسطين': 'PS',
  // Yemen
  'صنعاء':    'YE', 'sanaa':    'YE', 'عدن':         'YE', 'اليمن': 'YE', 'yemen': 'YE',
  // Sudan
  'الخرطوم':  'SD', 'khartoum': 'SD', 'السودان':     'SD', 'sudan': 'SD',
  // US/UK/EU
  'new york': 'US', 'los angeles': 'US', 'chicago': 'US', 'houston': 'US', 'usa': 'US',
  'london':   'GB', 'manchester': 'GB', 'birmingham': 'GB', 'uk': 'GB',
  'paris':    'FR', 'lyon':     'FR', 'marseille': 'FR', 'france': 'FR',
  'berlin':   'DE', 'munich':   'DE', 'hamburg':   'DE', 'germany': 'DE',
  'toronto':  'CA', 'montreal': 'CA', 'vancouver': 'CA', 'canada': 'CA',
  'sydney':   'AU', 'melbourne': 'AU', 'brisbane':  'AU', 'australia': 'AU',
};

export function locationToCountry(locationText) {
  if (!locationText) return '';
  const lower = locationText.toLowerCase().trim();
  // Direct match
  if (CITY_TO_COUNTRY[lower]) return CITY_TO_COUNTRY[lower];
  // Partial match
  for (const [key, code] of Object.entries(CITY_TO_COUNTRY)) {
    if (lower.includes(key) || key.includes(lower)) return code;
  }
  return '';
}

// Extract country from IP via request headers (for Railway behind proxy)
export function countryFromIP(req) {
  // Cloudflare header
  const cf = req.headers['cf-ipcountry'];
  if (cf && cf !== 'XX') return cf.toUpperCase();
  // Railway / generic proxy
  const xff = req.headers['x-forwarded-for'];
  if (xff) {
    // Can't do geoIP lookup server-side without a DB, return null
    return null;
  }
  return null;
}
