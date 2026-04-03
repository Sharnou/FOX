import fetch from 'node-fetch';
import { callWithFailover } from './keyPool.js';

async function analyzeWithOpenAI(imageUrlOrBase64) {
  return callWithFailover(async (key) => {
    if (!key || key === 'your_openai_key') throw new Error('No key');

    // Build the correct image_url value:
    // - If it starts with 'http' → use as a remote URL
    // - If it already has the data URI prefix → use as-is
    // - Otherwise → add the data URI prefix (raw base64)
    let imageUrl;
    if (imageUrlOrBase64.startsWith('http')) {
      imageUrl = imageUrlOrBase64;
    } else if (imageUrlOrBase64.startsWith('data:')) {
      imageUrl = imageUrlOrBase64;           // already a valid data URI
    } else {
      imageUrl = `data:image/jpeg;base64,${imageUrlOrBase64}`;  // raw base64
    }

    const imageContent = { type: 'image_url', image_url: { url: imageUrl } };

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: [
          { type: 'text', text: 'Describe this product briefly for a marketplace listing in 2-3 sentences. Include what it is, condition, and key features.' },
          imageContent
        ]}],
        max_tokens: 200
      })
    });
    const d = await res.json();
    if (d.error) throw new Error(d.error.message);
    return d.choices[0].message.content;
  });
}

async function analyzeWithGemini(base64Image) {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'your_gemini_key') throw new Error('No Gemini key');
  // Strip data URI prefix if present — Gemini expects raw base64
  const rawBase64 = base64Image.startsWith('data:')
    ? base64Image.replace(/^data:[^;]+;base64,/, '')
    : base64Image;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [
        { text: 'Describe this product for a marketplace listing briefly.' },
        { inline_data: { mime_type: 'image/jpeg', data: rawBase64 } }
      ]}]
    })
  });
  const d = await res.json();
  return d.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export async function analyzeImage(imageUrlOrBase64) {
  if (!imageUrlOrBase64) return '';
  const isBase64 = !imageUrlOrBase64.startsWith('http');

  try { return await analyzeWithOpenAI(imageUrlOrBase64); } catch (e) {
    console.warn('[Vision] OpenAI failed:', e.message);
  }
  if (isBase64) {
    try { return await analyzeWithGemini(imageUrlOrBase64); } catch (e) {
      console.warn('[Vision] Gemini failed:', e.message);
    }
  }
  return 'Product image uploaded';
}
