/**
 * XTOX Gemini AI Client
 * Handles all Gemini API calls for smart search, image analysis, etc.
 * Uses Gemini 1.5 Flash for fast, cost-effective inference.
 */

const GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_KEY || 'AIzaSyB9gDslfSnbtL5G-yNzrzDs9j3zNN3-Sc8';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;

async function callGemini(prompt, imageBase64 = null) {
  const parts = [{ text: prompt }];
  if (imageBase64) {
    // Strip data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const mimeType = imageBase64.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
    parts.unshift({ inline_data: { mime_type: mimeType, data: base64Data } });
  }

  const body = {
    contents: [{ parts }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
  };

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Gemini API error ${res.status}`);
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/**
 * Smart Arabic Search Suggestions
 * Corrects spelling, suggests related terms, detects category
 */
export async function getSmartSearchSuggestions(query) {
  if (!query || query.trim().length < 2) return null;

  const prompt = `أنت مساعد ذكي لتطبيق إعلانات مبوبة عربي (مثل OLX). المستخدم يبحث عن: "${query}"

قم بالتالي (بالعربية فقط، أجب بـ JSON فقط بدون أي نص إضافي):
{
  "corrected": "الكلمة المصححة إذا فيها أخطاء إملائية، وإلا نفس الكلمة",
  "suggestions": ["اقتراح 1", "اقتراح 2", "اقتراح 3"],
  "category": "الفئة المكتشفة من: مركبات، إلكترونيات، عقارات، وظائف، خدمات، عام"
}`;

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
 * Returns suggested title, description, category, price
 */
export async function analyzeImageForAd(imageBase64) {
  const prompt = `أنت خبير في تقييم المنتجات للبيع. حلل هذه الصورة وأعطني بيانات إعلان بيع مناسبة.
أجب بـ JSON فقط (بالعربية):
{
  "title": "عنوان إعلان واضح ومحدد (10-60 حرف)",
  "description": "وصف تفصيلي للمنتج (50-200 حرف)",
  "category": "إحدى هذه الفئات: Vehicles, Electronics, Real Estate, Jobs, Services, Supermarket, Pharmacy, Fast Food, Fashion, General",
  "suggestedPrice": رقم_السعر_التقريبي_بالدولار,
  "condition": "إحدى: new, used, excellent, rent"
}`;

  try {
    const text = await callGemini(prompt, imageBase64);
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
    .map((a, i) => `${i + 1}. "${a.title}" (${a.category})`)
    .join('\n');

  const prompt = `قارن هذا الإعلان الجديد مع الإعلانات الموجودة وأعطني نسبة التشابه.

الإعلان الجديد: "${newTitle}"
الإعلانات الموجودة:
${existingList}

أجب بـ JSON فقط:
{
  "duplicates": [
    {"index": رقم_الإعلان, "similarity": نسبة_التشابه_0_إلى_100, "reason": "سبب التشابه بالعربية"}
  ]
}
فقط أدرج الإعلانات التي تشابهها أكثر من 70%.`;

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
