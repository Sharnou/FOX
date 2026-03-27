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

  if (/عربية|عربيه|سيارة|car|vehicle|motor|bike|truck|دراجة/.test(t + en)) return { main: 'Vehicles', sub: 'Cars' };
  if (/موبايل|phone|iphone|samsung|android|تليفون/.test(t + en)) return { main: 'Electronics', sub: 'Mobiles' };
  if (/laptop|كمبيوتر|لابتوب|macbook|pc/.test(t + en)) return { main: 'Electronics', sub: 'Computers' };
  if (/شقة|شقه|apartment|flat|villa|house|بيت|rent|عقار/.test(t + en)) return { main: 'Real Estate', sub: 'Apartments' };
  if (/سباك|كهربائي|نجار|plumber|electric|carpenter|painter|cleaner|دهان/.test(t + en)) return { main: 'Services', sub: 'Workers' };
  if (/وظيفة|وظيفه|job|hiring|تعيين|vacancy/.test(t + en)) return { main: 'Jobs', sub: 'General' };
  if (/فستان|dress|clothes|ملابس|جاكيت|shoes|حذاء/.test(t + en)) {
    if (/رجالي|men|gents/.test(t)) return { main: 'Fashion', sub: 'Men' };
    if (/نسائي|women|ladies|فستان/.test(t)) return { main: 'Fashion', sub: 'Women' };
    return { main: 'Fashion', sub: 'General' };
  }
  if (/دواء|medicine|pharmacy|صيدلية/.test(t + en)) return { main: 'Pharmacy', sub: 'Medicine' };
  if (/اكل|food|meal|pizza|burger|طعام|وجبة|مطعم/.test(t + en)) return { main: 'Fast Food', sub: 'Restaurant' };
  if (/بقالة|supermarket|grocery|خضار/.test(t + en)) return { main: 'Supermarket', sub: 'Groceries' };
  return { main: 'General', sub: 'Other' };
}
