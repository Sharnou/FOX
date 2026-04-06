/**
 * XTOX Gemini AI Client
 * Handles all Gemini API calls for smart search, image analysis, etc.
 * Uses Gemini 1.5 Flash for fast, cost-effective inference.
 */

const GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + GEMINI_KEY;

async function callGemini(prompt, imageBase64 = null, mimeType = 'image/jpeg') {
  const key = process.env.NEXT_PUBLIC_GEMINI_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
  if (!key) throw new Error('No Gemini API key');
  
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + key;
  const parts = [{ text: prompt }];
  
  if (imageBase64) {
    // Strip data URL prefix if present
    const base64Data = imageBase64.replace(/^data:[\w/]+;base64,/, '');
    const detectedMime = imageBase64.startsWith('data:image/png') ? 'image/png'
      : imageBase64.startsWith('data:image/webp') ? 'image/webp'
      : mimeType;
    parts.unshift({ inline_data: { mime_type: detectedMime, data: base64Data } });
  }

  const body = {
    contents: [{ parts }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error('Gemini API error ' + res.status);
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/**
 * Smart Arabic Search Suggestions
 * Corrects spelling, suggests related terms, detects category
 */
export async function getSmartSearchSuggestions(query) {
  if (!query || query.trim().length < 2) return null;

  const prompt = 'أنت مساعد ذكي لتطبيق إعلانات مبوبة عربي (مثل OLX). المستخدم يبحث عن: "' + query + '"\n\nقم بالتالي (بالعربية فقط، أجب بـ JSON فقط بدون أي نص إضافي):\n{\n  "corrected": "الكلمة المصححة إذا فيها أخطاء إملائية، وإلا نفس الكلمة",\n  "suggestions": ["اقتراح 1", "اقتراح 2", "اقتراح 3"],\n  "category": "الفئة المكتشفة من: مركبات، إلكترونيات، عقارات، وظائف، خدمات، عام"\n}';

  try {
    const text = await callGemini(prompt);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

/**
 * AI Image Analysis for Ad Creation
 * Returns suggested title, description, category, condition, price
 * @param {string} base64Image - base64 encoded image or data URL
 * @param {string} mimeType - image MIME type (default: image/jpeg)
 * @param {string} lang - language for response ('ar' or 'en')
 */
export async function analyzeImageForAd(base64Image, mimeType = 'image/jpeg', lang = 'ar') {
  const key = process.env.NEXT_PUBLIC_GEMINI_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!key) return null;

  const prompt = lang === 'ar'
    ? 'حلل هذه الصورة وأعطني بيانات الإعلان بالعربية: العنوان (title)، الوصف (description)، الفئة (category من: Vehicles/Electronics/Real Estate/Jobs/Services/Supermarket/Pharmacy/Fast Food/Fashion/General)، الحالة (condition: new/used/excellent/rent)، السعر المقترح (price كرقم). أجب بـ JSON فقط بدون markdown.'
    : 'Analyze this image and give me ad data in English as JSON only (no markdown): title, description, category (one of: Vehicles/Electronics/Real Estate/Jobs/Services/Supermarket/Pharmacy/Fast Food/Fashion/General), condition (new/used/excellent/rent), price (number suggestion).';

  try {
    const text = await callGemini(prompt, base64Image, mimeType);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

/**
 * Check for duplicate ad similarity
 * Returns similarity score 0-100
 */
export async function checkAdSimilarity(newTitle, existingAds) {
  if (!existingAds || existingAds.length === 0) return [];

  const existingList = existingAds
    .slice(0, 10)
    .map((a, i) => i + 1 + '. "' + a.title + '" (' + a.category + ')')
    .join('\n');

  const prompt = 'قارن هذا الإعلان الجديد مع الإعلانات الموجودة وأعطني نسبة التشابه.\n\nالإعلان الجديد: "' + newTitle + '"\nالإعلانات الموجودة:\n' + existingList + '\n\nأجب بـ JSON فقط:\n{\n  "duplicates": [\n    {"index": رقم_الإعلان, "similarity": نسبة_التشابه_0_إلى_100, "reason": "سبب التشابه بالعربية"}\n  ]\n}\nفقط أدرج الإعلانات التي تشابهها أكثر من 70%.';

  try {
    const text = await callGemini(prompt);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];
    const result = JSON.parse(jsonMatch[0]);
    return result.duplicates || [];
  } catch {
    return [];
  }
}

export default { getSmartSearchSuggestions, analyzeImageForAd, checkAdSimilarity };
