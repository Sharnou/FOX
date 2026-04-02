import LocalWord from '../models/LocalWord.js';
import { callWithFailover } from './keyPool.js';
import fetch from 'node-fetch';

const CORE_DICT = {
  'عربية': { meaning: 'car', category: 'Vehicles', dialect: 'Egyptian', country: 'EG' },
  'عربيه': { meaning: 'car', category: 'Vehicles', dialect: 'Egyptian', country: 'EG' },
  'موبايل': { meaning: 'mobile phone', category: 'Electronics', dialect: 'Egyptian', country: 'EG' },
  'موبيل': { meaning: 'mobile phone', category: 'Electronics', dialect: 'Egyptian', country: 'EG' },
  'تليفون': { meaning: 'phone', category: 'Electronics', dialect: 'Egyptian', country: 'EG' },
  'شقة': { meaning: 'apartment', category: 'Real Estate', dialect: 'Egyptian', country: 'EG' },
  'شقه': { meaning: 'apartment', category: 'Real Estate', dialect: 'Egyptian', country: 'EG' },
  'عيش': { meaning: 'bread', category: 'Fast Food', dialect: 'Egyptian', country: 'EG' },
  'فلوس': { meaning: 'money', category: 'General', dialect: 'Egyptian', country: 'EG' },
  'جاكيت': { meaning: 'jacket', category: 'Fashion', dialect: 'Egyptian', country: 'EG' },
  'سباك': { meaning: 'plumber', category: 'Services', dialect: 'Egyptian', country: 'EG' },
  'كهربائي': { meaning: 'electrician', category: 'Services', dialect: 'Egyptian', country: 'EG' },
  'نجار': { meaning: 'carpenter', category: 'Services', dialect: 'Egyptian', country: 'EG' },
  'شغل': { meaning: 'job/work', category: 'Jobs', dialect: 'Egyptian', country: 'EG' },
  'وظيفة': { meaning: 'job', category: 'Jobs', dialect: 'Egyptian', country: 'EG' },
  'أوضة': { meaning: 'room', category: 'Real Estate', dialect: 'Egyptian', country: 'EG' },
  'عمارة': { meaning: 'building', category: 'Real Estate', dialect: 'Egyptian', country: 'EG' },
  'هدوم': { meaning: 'clothes', category: 'Fashion', dialect: 'Egyptian', country: 'EG' },
  'جلابية': { meaning: 'galabeya', category: 'Fashion', dialect: 'Egyptian', country: 'EG' },
  'جزمة': { meaning: 'shoes', category: 'Fashion', dialect: 'Egyptian', country: 'EG' },
  'لابتوب': { meaning: 'laptop', category: 'Electronics', dialect: 'Egyptian', country: 'EG' },
  'كمبيوتر': { meaning: 'computer', category: 'Electronics', dialect: 'Egyptian', country: 'EG' },
  'تلفزيون': { meaning: 'tv', category: 'Electronics', dialect: 'Egyptian', country: 'EG' },
  'موتوسيكل': { meaning: 'motorcycle', category: 'Vehicles', dialect: 'Egyptian', country: 'EG' },
  'توك توك': { meaning: 'tuk-tuk', category: 'Vehicles', dialect: 'Egyptian', country: 'EG' },
  'بقالة': { meaning: 'grocery', category: 'Supermarket', dialect: 'Egyptian', country: 'EG' },
  'خضار': { meaning: 'vegetables', category: 'Supermarket', dialect: 'Egyptian', country: 'EG' },
  'دواء': { meaning: 'medicine', category: 'Pharmacy', dialect: 'Egyptian', country: 'EG' },
  'دوا': { meaning: 'medicine', category: 'Pharmacy', dialect: 'Egyptian', country: 'EG' },
  'أكل': { meaning: 'food', category: 'Fast Food', dialect: 'Egyptian', country: 'EG' },
  'بيتزا': { meaning: 'pizza', category: 'Fast Food', dialect: 'Egyptian', country: 'EG' },
  'سيارة': { meaning: 'car', category: 'Vehicles', dialect: 'Saudi', country: 'SA' },
  'بيك اب': { meaning: 'pickup truck', category: 'Vehicles', dialect: 'Saudi', country: 'SA' },
  'شاليه': { meaning: 'chalet', category: 'Real Estate', dialect: 'Saudi', country: 'SA' },
  'دار': { meaning: 'house', category: 'Real Estate', dialect: 'Moroccan', country: 'MA' },
};

export async function seedCoreDictionary() {
  let seeded = 0;
  for (const [word, data] of Object.entries(CORE_DICT)) {
    try {
      await LocalWord.findOneAndUpdate(
        { word, country: data.country },
        { word, meaning: data.meaning, english: data.meaning, category: data.category, dialect: data.dialect, country: data.country, confirmedByAdmin: true, approved: true, aiLearned: false },
        { upsert: true, new: true }
      );
      seeded++;
    } catch {}
  }
  console.log(`[LANG] Core dictionary seeded: ${seeded} words`);
}

export async function translateWord(word, country = 'EG') {
  const dbResult = await LocalWord.findOneAndUpdate(
    { word: word.toLowerCase(), country },
    { $inc: { frequency: 1, count: 1 }, updatedAt: new Date() },
    { new: true }
  );
  if (dbResult) return dbResult.meaning || dbResult.english || word;
  const coreResult = CORE_DICT[word];
  if (coreResult) return coreResult.meaning;
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_key') return word;
  try {
    const result = await callWithFailover(async (key) => {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: `Translate this Arabic dialect word to English. Country: ${country}. Word: "${word}". Reply with ONLY the English word.` }], max_tokens: 15 })
      });
      return res.json();
    });
    const meaning = result.choices?.[0]?.message?.content?.trim()?.toLowerCase();
    if (meaning && meaning.length < 50) {
      await LocalWord.create({ word: word.toLowerCase(), meaning, english: meaning, country, aiConfidence: 0.85, frequency: 1, count: 1, aiLearned: true });
      console.log(`[LANG] Auto-learned: "${word}" = "${meaning}"`);
      return meaning;
    }
  } catch {}
  return word;
}

export async function learnWord(word, meaning, category, country, dialect) {
  if (!word || !meaning) return;
  return LocalWord.findOneAndUpdate(
    { word: word.toLowerCase(), country: country || 'EG' },
    { word: word.toLowerCase(), meaning, english: meaning, category: category || 'General', country: country || 'EG', dialect: dialect || 'Egyptian', $inc: { frequency: 1, count: 1 }, updatedAt: new Date() },
    { upsert: true, new: true }
  );
}

export async function getLocalDictionary(country = 'EG', limit = 100) {
  return LocalWord.find({ country }).sort({ frequency: -1 }).limit(limit);
}

export async function detectCategoryFromText(text, country = 'EG') {
  const words = text.toLowerCase().match(/[\u0600-\u06FF]{3,}/g) || [];
  if (!words.length) return null;
  const matches = await LocalWord.find({ word: { $in: words }, country, category: { $exists: true } }).sort({ frequency: -1 }).limit(5);
  if (!matches.length) return null;
  const catCount = {};
  matches.forEach(m => { if (m.category) catCount[m.category] = (catCount[m.category] || 0) + (m.frequency || 1); });
  return Object.entries(catCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

export async function learnFromAd(title, description, country = 'EG') {
  const text = `${title || ''} ${description || ''}`;
  const arabicWords = text.match(/[\u0600-\u06FF]{3,}/g) || [];
  for (const word of [...new Set(arabicWords)]) {
    try {
      const existing = await LocalWord.findOne({ word: word.toLowerCase(), country });
      if (existing) {
        await LocalWord.updateOne({ _id: existing._id }, { $inc: { frequency: 1, count: 1 } });
      } else {
        await translateWord(word, country);
      }
    } catch {}
  }
}
