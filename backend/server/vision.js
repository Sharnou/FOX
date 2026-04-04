import fetch from 'node-fetch';
import { readFileSync, existsSync } from 'fs';
import { callWithFailover } from './keyPool.js';

// FIX: Helper to resolve input — supports file paths, data URIs, raw base64, and URLs
function resolveImageInput(imageUrlOrBase64) {
  if (!imageUrlOrBase64) return null;

  // File path: read and convert to raw base64
  if (imageUrlOrBase64.startsWith('/') || imageUrlOrBase64.match(/^[A-Za-z]:\\/)) {
    if (!existsSync(imageUrlOrBase64)) {
      console.warn('[Vision] File not found:', imageUrlOrBase64);
      return null;
    }
    try {
      const buffer = readFileSync(imageUrlOrBase64);
      return buffer.toString('base64');
    } catch (e) {
      console.warn('[Vision] Cannot read file:', e.message);
      return null;
    }
  }

  // URL, data URI, or raw base64 — return as-is
  return imageUrlOrBase64;
}

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
      imageUrl = imageUrlOrBase64;
    } else {
      imageUrl = `data:image/jpeg;base64,${imageUrlOrBase64}`;
    }

    const imageContent = { type: 'image_url', image_url: { url: imageUrl } };

    // FIX: AbortController with 25-second timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
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
        }),
        signal: controller.signal
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error.message);
      return d.choices[0].message.content;
    } finally {
      clearTimeout(timeoutId);
    }
  });
}

async function analyzeWithGemini(base64Image) {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'your_gemini_key') throw new Error('No Gemini key');
  // Strip data URI prefix if present — Gemini expects raw base64
  const rawBase64 = base64Image.startsWith('data:')
    ? base64Image.replace(/^data:[^;]+;base64,/, '')
    : base64Image;

  // FIX: AbortController with 25-second timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: 'Describe this product for a marketplace listing briefly.' },
          { inline_data: { mime_type: 'image/jpeg', data: rawBase64 } }
        ]}]
      }),
      signal: controller.signal
    });
    const d = await res.json();
    return d.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function analyzeImage(imageUrlOrBase64) {
  if (!imageUrlOrBase64) return '';

  // FIX: Resolve file paths to base64 before sending to API
  const resolved = resolveImageInput(imageUrlOrBase64);
  if (!resolved) return '';

  const isBase64 = !resolved.startsWith('http');

  try { return await analyzeWithOpenAI(resolved); } catch (e) {
    console.warn('[Vision] OpenAI failed:', e.message);
  }
  if (isBase64) {
    try { return await analyzeWithGemini(resolved); } catch (e) {
      console.warn('[Vision] Gemini failed:', e.message);
    }
  }
  return 'Product image uploaded';
}
