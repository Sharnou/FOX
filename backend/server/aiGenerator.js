import fetch from 'node-fetch';
import { callWithFailover } from './keyPool.js';
import { detectCategoryOffline, translateText } from './offlineDict.js';

// Smart offline ad generator (no API needed)
function generateOfflineAd(text) {
  const detected = detectCategoryOffline(text);
  const words = text.split(' ').filter(w => w.length > 2);
  const title = words.slice(0, 8).join(' ').slice(0, 60) || 'إعلان جديد';
  const hashtags = [detected.main, detected.sub, 'للبيع', 'XTOX'].filter(Boolean);
  return {
    title,
    description: text.slice(0, 200),
    category: detected.main || 'General',
    subcategory: detected.sub || 'Other',
    suggestedPrice: 0,
    language: /[\u0600-\u06FF]/.test(text) ? 'ar' : 'en',
    hashtags,
    source: 'offline'
  };
}

// Try OpenAI GPT
async function generateWithOpenAI(text, imageDesc) {
  const prompt = `Based on this marketplace listing info: "${text} ${imageDesc}"
Generate a JSON ad with: title (max 60 chars, use natural dialect), description (max 200 chars), category (Vehicles/Electronics/Real Estate/Jobs/Services/Supermarket/Pharmacy/Fast Food/Fashion/General), subcategory, suggestedPrice (number), hashtags (array of 5). JSON only.`;
  return callWithFailover(async (key) => {
    if (!key || key === 'your_openai_key') throw new Error('No OpenAI key');
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], max_tokens: 400 })
    });
    const d = await res.json();
    if (d.error) throw new Error(d.error.message);
    return JSON.parse(d.choices[0].message.content.replace(/```json|```/g, '').trim());
  });
}

// Try Google Gemini (free tier)
async function generateWithGemini(text, imageDesc) {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'your_gemini_key') throw new Error('No Gemini key');
  const prompt = `Generate a marketplace ad JSON for: "${text} ${imageDesc}". Fields: title, description, category, suggestedPrice, hashtags. JSON only.`;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });
  const d = await res.json();
  const content = d.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return JSON.parse(content.replace(/```json|```/g, '').trim());
}

export async function generateAd({ text, imageDesc }) {
  const combined = `${text || ''} ${imageDesc || ''}`.trim();
  if (!combined) return generateOfflineAd('إعلان جديد');

  try { return await generateWithOpenAI(combined, imageDesc); } catch (e) {
    console.warn('[AI] OpenAI failed:', e.message);
  }
  try { return await generateWithGemini(combined, imageDesc); } catch (e) {
    console.warn('[AI] Gemini failed:', e.message);
  }
  console.log('[AI] Using offline detection');
  return generateOfflineAd(combined);
}
