/**
 * autoTranslate.js — Auto-translate a string to multiple languages using GPT-4o-mini
 * Used for: new UI strings, admin-defined content, dynamic category names
 */

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const GROQ_KEY   = process.env.GROQ_API_KEY;

/**
 * Auto-translate a string to multiple languages using GPT-4o-mini (or Groq fallback).
 * @param {string} text       - Source text to translate
 * @param {string} fromLang   - Source language code (default: 'ar')
 * @param {string[]} toLangs  - Target language codes
 * @returns {Object}          - Map of lang → translated string
 */
export async function autoTranslate(
  text,
  fromLang = 'ar',
  toLangs = ['en', 'fr', 'de', 'tr', 'es', 'ru', 'zh']
) {
  if (!text || typeof text !== 'string') return {};

  const langNames = {
    en: 'English', fr: 'French', de: 'German', tr: 'Turkish',
    es: 'Spanish', ru: 'Russian', zh: 'Chinese (Simplified)',
    ar: 'Arabic',  pt: 'Portuguese', it: 'Italian', ja: 'Japanese',
    ko: 'Korean',  nl: 'Dutch',     pl: 'Polish',   uk: 'Ukrainian',
  };

  const targetList = toLangs.map(l => `${l}: ${langNames[l] || l}`).join(', ');

  const prompt = `Translate the following ${langNames[fromLang] || fromLang} text to these languages: ${targetList}.

Source text: "${text}"

Reply with ONLY valid JSON object with language codes as keys and translations as values.
Example: {"en": "...", "fr": "...", "de": "..."}
Do not add any explanation, just the JSON.`;

  // Try Groq first (faster/cheaper)
  if (GROQ_KEY) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 1000,
        }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content?.trim();
      if (content) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          if (typeof result === 'object' && Object.keys(result).length > 0) {
            return result;
          }
        }
      }
    } catch (e) {
      console.warn('[autoTranslate] Groq failed:', e.message);
    }
  }

  // Fallback: OpenAI GPT-4o-mini
  if (OPENAI_KEY) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 1000,
          response_format: { type: 'json_object' },
        }),
        signal: AbortSignal.timeout(20000),
      });
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content?.trim();
      if (content) {
        const result = JSON.parse(content);
        if (typeof result === 'object' && Object.keys(result).length > 0) {
          return result;
        }
      }
    } catch (e) {
      console.warn('[autoTranslate] OpenAI failed:', e.message);
    }
  }

  // Final fallback: return empty (caller should handle gracefully)
  console.warn('[autoTranslate] All providers failed, returning empty translations');
  return {};
}

export default autoTranslate;
