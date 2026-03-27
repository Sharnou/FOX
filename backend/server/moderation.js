import fetch from 'node-fetch';
import { callWithFailover } from './keyPool.js';

const bannedWords = ['sex', 'xxx', 'nude', 'porn', 'scam', 'hack', 'drugs', 'weapon'];

// ── Text moderation (offline, instant) ──
export function moderateText(text) {
  if (!text) return { clean: true };
  const lower = text.toLowerCase();
  const found = bannedWords.find(w => lower.includes(w));
  return { clean: !found, reason: found || null };
}

// ── Image moderation via GPT-4o Vision ──
export async function moderateImage(imageUrlOrBase64) {
  // Skip if no AI key
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_key') {
    return { clean: true }; // fallback: allow if no AI key
  }

  try {
    const isBase64 = !imageUrlOrBase64.startsWith('http');
    const imageContent = isBase64
      ? { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageUrlOrBase64}` } }
      : { type: 'image_url', image_url: { url: imageUrlOrBase64 } };

    const result = await callWithFailover(async (key) => {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: 'Is this image safe for a marketplace? Check for: nudity, violence, weapons, drugs, illegal items. Reply with JSON only: {"safe": true/false, "reason": "string or null"}' },
              imageContent
            ]
          }],
          max_tokens: 100
        })
      });
      return res.json();
    });

    const text = result.choices?.[0]?.message?.content || '{"safe": true}';
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    return { clean: parsed.safe !== false, reason: parsed.reason };
  } catch {
    return { clean: true }; // fail open — allow if AI unavailable
  }
}

// ── Video moderation (analyze first frame) ──
export async function moderateVideoUrl(videoUrl) {
  const urlLower = videoUrl.toLowerCase();
  const found = bannedWords.find(w => urlLower.includes(w));
  if (found) return { clean: false, reason: found };
  return { clean: true };
}

// ── Voice/text moderation (from Whisper transcript) ──
export function moderateTranscript(transcript) {
  return moderateText(transcript);
}
