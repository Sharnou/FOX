import fetch from 'node-fetch';
import { callWithFailover } from './keyPool.js';

// ── English offensive / illegal content keywords ──
const bannedWordsEn = ['sex', 'xxx', 'nude', 'porn', 'scam', 'hack', 'drugs', 'weapon'];

// ── Arabic banned phrases: adult content, scams, off-platform contact, violence ──
// Covers Egyptian, Gulf, Levantine Arab marketplace users
const bannedWordsAr = [
  // Adult content
  'سكس', 'إباحي', 'عاري', 'جنس مباشر',
  // Off-platform scam contact prompts
  'واتس فقط', 'واتساب فقط', 'تواصل خارج الموقع', 'اتصل خارج',
  // Advance-fee / payment fraud
  'دفع مسبق', 'تحويل مسبق', 'ارسل فلوس', 'أرسل المبلغ',
  // Get-rich-quick / investment scams
  'ربح سريع', 'استثمار مضمون', 'أرباح يومية مضمونة',
  // Weapons & drugs
  'سلاح ناري', 'مخدرات', 'قنبلة', 'متفجرات',
  // Hacking / cracking
  'اختراق حسابات', 'كراك',
];

// ── Text moderation (offline, instant — supports Arabic & English) ──
export function moderateText(text) {
  if (!text) return { clean: true };
  const lower = text.toLowerCase();

  // English check (case-insensitive)
  const foundEn = bannedWordsEn.find(w => lower.includes(w));
  if (foundEn) return { clean: false, reason: foundEn, lang: 'en' };

  // Arabic check (case-preserved — Arabic has no case)
  const foundAr = bannedWordsAr.find(w => text.includes(w));
  if (foundAr) return { clean: false, reason: foundAr, lang: 'ar' };

  return { clean: true };
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

// ── Video moderation (analyze URL for banned terms) ──
export async function moderateVideoUrl(videoUrl) {
  const urlLower = videoUrl.toLowerCase();
  const found = bannedWordsEn.find(w => urlLower.includes(w));
  if (found) return { clean: false, reason: found };
  return { clean: true };
}

// ── Voice/text moderation (from Whisper transcript) ──
export function moderateTranscript(transcript) {
  return moderateText(transcript);
}
