import fetch from 'node-fetch';
import { callWithFailover } from './keyPool.js';
export async function generateAd({ text, imageDesc }) {
  const prompt = `Based on: "${text} ${imageDesc}", generate marketplace ad JSON: {title (max 60 chars, use local dialect), description (max 200 chars), category, subcategory, suggestedPrice (number), language ("ar" or "en"), hashtags (array of 5 strings)}. JSON only.`;
  return callWithFailover(async (key) => {
    const res = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], max_tokens: 400 }) });
    const d = await res.json();
    try { return JSON.parse(d.choices[0].message.content); } catch { return { title: text.slice(0, 60), description: imageDesc, category: 'General', subcategory: 'Other', suggestedPrice: 0, language: 'ar', hashtags: [] }; }
  });
}
