/**
 * adModeration.js — AI-powered ad content moderation using OPENAI_ANALYSIS_KEY
 *
 * Uses gpt-4o-mini to check if ad content is appropriate for an Arabic marketplace.
 * Called asynchronously after ad creation (non-blocking for UX).
 * Fails open — if OpenAI is unavailable, the ad is approved automatically.
 */

import OpenAI from 'openai';

let _openai = null;

function getClient() {
  if (!process.env.OPENAI_ANALYSIS_KEY) return null;
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_ANALYSIS_KEY });
  }
  return _openai;
}

/**
 * Moderate ad title + description using OpenAI.
 * @param {string} title
 * @param {string} description
 * @returns {Promise<{approved: boolean, reason: string}>}
 */
export async function moderateAdContent(title, description) {
  const client = getClient();
  if (!client) {
    // No key configured — fail open (approve)
    return { approved: true, reason: '' };
  }

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'أنت مشرف محتوى لسوق إلكتروني عربي. حلل الإعلان التالي وتحقق من أنه: لا يحتوي على محتوى مسيء، أو احتيالي، أو إباحي، أو ممنوع قانوناً، أو ترويج لمخدرات أو أسلحة. أجب بـ JSON فقط بالصيغة: {"approved": true/false, "reason": "سبب الرفض إن وجد، أو فارغ إن كان مقبولاً"}'
        },
        {
          role: 'user',
          content: `العنوان: ${(title || '').slice(0, 200)}\nالوصف: ${(description || '').slice(0, 500)}`
        }
      ],
      max_tokens: 150,
      temperature: 0,
      response_format: { type: 'json_object' }
    });

    const raw = response.choices?.[0]?.message?.content || '{}';
    const result = JSON.parse(raw);
    return {
      approved: result.approved !== false, // default to approved
      reason: result.reason || ''
    };
  } catch (e) {
    console.error('[adModeration] OpenAI error (fail open):', e.message);
    return { approved: true, reason: '' }; // fail open
  }
}
