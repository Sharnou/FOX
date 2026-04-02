// Offline dialect dictionary — Egyptian Arabic first
export const dialectMap = {
  'عربية': 'car', 'عربيه': 'car', 'سيارة': 'car', 'عجلة': 'bicycle',
  'موبايل': 'phone', 'تليفون': 'phone', 'موبيل': 'phone',
  'شقة': 'apartment', 'شقه': 'apartment', 'بيت': 'house', 'فيلا': 'villa',
  'فستان': 'dress', 'جلابية': 'galabeya', 'جاكيت': 'jacket',
  'سباك': 'plumber', 'كهربائي': 'electrician', 'نجار': 'carpenter',
  'وظيفة': 'job', 'شغل': 'job', 'تعيين': 'hiring',
  'دواء': 'medicine', 'عيلة': 'family', 'اكل': 'food', 'اكله': 'food',
  'تليفزيون': 'tv', 'تلفاز': 'tv', 'كمبيوتر': 'computer', 'لابتوب': 'laptop'
};

export function translateWord(word) {
  return dialectMap[word] || word;
}

export function translateText(text) {
  return text.split(' ').map(w => translateWord(w)).join(' ');
}

export function detectLanguage(text) {
  return /[\u0600-\u06FF]/.test(text) ? 'ar' : 'en';
}

// Category detection rules (offline, dialect-aware)
export function detectCategoryOffline(text) {
  const t = text.toLowerCase();
  const en = translateText(t);
  const combined = t + ' ' + en;

  if (/عربية|عربيه|سيارة|car|vehicle|motor|truck|دراجة|موتوسيكل|توك/.test(combined)) return { main: 'Vehicles', sub: 'Cars' };
  if (/موبايل|موبيل|phone|iphone|samsung|android|تليفون|هاتف/.test(combined)) return { main: 'Electronics', sub: 'Mobiles' };
  if (/laptop|كمبيوتر|لابتوب|macbook|pc|شاشة|تلفزيون|تليفزيون/.test(combined)) return { main: 'Electronics', sub: 'Computers' };
  if (/شقة|شقه|apartment|flat|villa|house|بيت|rent|عقار|أوضة|فيلا|دور/.test(combined)) return { main: 'Real Estate', sub: 'Apartments' };
  if (/سباك|كهربائي|نجار|plumber|electric|carpenter|painter|cleaner|دهان|شغلانة|بتاع/.test(combined)) return { main: 'Services', sub: 'Workers' };
  if (/وظيفة|وظيفه|job|hiring|تعيين|vacancy|شغل|مطلوب/.test(combined)) return { main: 'Jobs', sub: 'General' };
  if (/فستان|dress|هدوم|ملابس|جاكيت|shoes|حذاء|جزمة|جلابية/.test(combined)) {
    if (/رجالي|men|gents/.test(combined)) return { main: 'Fashion', sub: 'Men' };
    if (/نسائي|women|ladies|فستان/.test(combined)) return { main: 'Fashion', sub: 'Women' };
    return { main: 'Fashion', sub: 'General' };
  }
  if (/دواء|دوا|medicine|pharmacy|صيدلية/.test(combined)) return { main: 'Pharmacy', sub: 'Medicine' };
  if (/أكل|اكله|food|meal|pizza|burger|طعام|وجبة|مطعم|بيتزا/.test(combined)) return { main: 'Fast Food', sub: 'Restaurant' };
  if (/بقالة|supermarket|grocery|خضار/.test(combined)) return { main: 'Supermarket', sub: 'Groceries' };
  return { main: 'General', sub: 'Other' };
}
