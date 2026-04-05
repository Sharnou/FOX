/**
 * XTOX AI Ad Quality Scorer
 * Uses Gemini 1.5 Flash to score ads 0-100
 * Checks: title quality, description completeness, price reasonableness
 * Returns score + improvement tips in Arabic
 * Stores score as aiQualityScore on the ad document
 */

import { ollamaScoreAd, isOllamaEnabled } from './ollamaFallback.js';

const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;

/**
 * Score an ad using Gemini AI
 * @param {object} ad - Ad document fields
 * @returns {Promise<{score: number, tips: string[], rawResponse: string}>}
 */
export async function scoreAdWithAI(ad) {
  if (!ad?.title) return { score: 0, tips: ['العنوان مطلوب'] };

  const prompt = `أنت خبير في تقييم جودة الإعلانات المبوبة العربية. قيّم هذا الإعلان من 0 إلى 100.

بيانات الإعلان:
- العنوان: "${ad.title || 'غير محدد'}"
- الوصف: "${ad.description || 'لا يوجد وصف'}"
- الفئة: "${ad.category || 'غير محدد'}"
- السعر: ${ad.price || 0} ${ad.currency || 'USD'}
- المدينة: "${ad.city || 'غير محدد'}"
- الحالة: "${ad.condition || 'غير محدد'}"
- عدد الصور: ${Array.isArray(ad.media) ? ad.media.length : 0}

معايير التقييم:
1. العنوان (25 نقطة): واضح، محدد، ليس مبهماً
2. الوصف (25 نقطة): تفصيلي، يشرح المنتج بوضوح
3. السعر (20 نقطة): معقول للفئة وليس صفراً
4. الصور (15 نقطة): وجود صور واضحة
5. المعلومات الكاملة (15 نقطة): مدينة، حالة، فئة

أجب بـ JSON فقط بدون أي نص خارجه:
{
  "score": رقم_بين_0_و_100,
  "tips": ["نصيحة تحسين 1 بالعربية", "نصيحة 2", "نصيحة 3"]
}`;

  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
      }),
      signal: AbortSignal.timeout(15000), // 15s timeout
    });

    if (!res.ok) {
      console.warn('[AIQuality] Gemini HTTP error:', res.status);
      // Try Ollama fallback
      if (isOllamaEnabled()) {
        const ollamaResult = await ollamaScoreAd(ad).catch(() => null);
        if (ollamaResult) return { score: ollamaResult.score, tips: ollamaResult.tips, source: 'ollama' };
      }
      return { score: calculateOfflineScore(ad), tips: [], source: 'rules' };
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { score: calculateOfflineScore(ad), tips: [] };

    const result = JSON.parse(jsonMatch[0]);
    const score = Math.min(100, Math.max(0, Number(result.score) || 0));
    return { score, tips: result.tips || [] };
  } catch (e) {
    console.warn('[AIQuality] Gemini error:', e.message);

    // Try Ollama fallback (if OLLAMA_URL is configured)
    if (isOllamaEnabled()) {
      try {
        const ollamaResult = await ollamaScoreAd(ad);
        if (ollamaResult) {
          return { score: ollamaResult.score, tips: ollamaResult.tips, source: 'ollama' };
        }
      } catch (ollamaErr) {
        console.warn('[AIQuality] Ollama also failed:', ollamaErr.message);
      }
    }

    // Final fallback: rule-based offline scoring (always works, no network needed)
    const rbResult = ruleBasedScore(ad?.title, ad?.description);
    return { score: Math.max(rbResult.score, calculateOfflineScore(ad)), tips: ['أضف صوراً للإعلان', 'اكتب وصفاً مفصلاً', 'حدد سعراً مناسباً'], feedback: rbResult.feedback, source: 'rules' };
  }
}

/**
 * Fast offline score calculation (no API needed)
 * Used as fallback when Gemini is unavailable
 */
function calculateOfflineScore(ad) {
  let score = 0;

  // Title quality (0-25)
  const titleLen = (ad.title || '').length;
  if (titleLen >= 10) score += 25;
  else if (titleLen >= 5) score += 15;
  else if (titleLen >= 3) score += 5;

  // Description (0-25)
  const descLen = (ad.description || '').length;
  if (descLen >= 100) score += 25;
  else if (descLen >= 50) score += 15;
  else if (descLen >= 20) score += 8;
  else if (descLen > 0) score += 4;

  // Price (0-20)
  if (ad.price > 0) score += 20;

  // Images (0-15)
  const imgCount = Array.isArray(ad.media) ? ad.media.length : 0;
  if (imgCount >= 3) score += 15;
  else if (imgCount >= 1) score += 10;

  // Complete info (0-15)
  let infoScore = 0;
  if (ad.city) infoScore += 5;
  if (ad.condition) infoScore += 5;
  if (ad.category) infoScore += 5;
  score += infoScore;

  return Math.min(100, score);
}


/**
 * Rule-based scoring fallback — used when Gemini API is unavailable
 * Simple but reliable score based on title/description quality
 */
function ruleBasedScore(title, description) {
  let score = 50;
  if (title?.length > 10) score += 10;
  if (description?.length > 50) score += 15;
  if (description?.length > 150) score += 10;
  return { score: Math.min(score, 95), feedback: 'Auto-scored based on content quality' };
}

export default scoreAdWithAI;
