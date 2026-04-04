/**
 * Ollama fallback for AI features.
 * Used when GEMINI_API_KEY is not set or Gemini fails.
 * Set OLLAMA_URL (default: http://localhost:11434) and OLLAMA_MODEL (default: llama3) in env.
 * Only activates when OLLAMA_URL is explicitly configured.
 */

const OLLAMA_URL   = process.env.OLLAMA_URL   || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';
// Only active if OLLAMA_URL is explicitly set in environment
const OLLAMA_ENABLED = !!process.env.OLLAMA_URL;

export async function ollamaGenerate(prompt, { timeoutMs = 30000 } = {}) {
  if (!OLLAMA_ENABLED) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
    const data = await res.json();
    return data.response || null;
  } catch (e) {
    console.warn('[Ollama] Failed:', e.message);
    return null;
  }
}

export async function ollamaScoreAd(ad) {
  const prompt = `Rate this Arabic marketplace listing from 0 to 100 for quality.
Reply with JSON ONLY (no extra text): {"score": <number 0-100>, "tips": ["tip1 in Arabic","tip2 in Arabic"]}

Title: ${ad.title || ''}
Description: ${ad.description || '(none)'}
Price: ${ad.price || '?'}
Category: ${ad.category || '?'}
Images: ${Array.isArray(ad.media) ? ad.media.length : 0}`;

  const raw = await ollamaGenerate(prompt);
  if (!raw) return null;
  try {
    const json = raw.match(/\{[\s\S]*\}/)?.[0];
    if (!json) return null;
    const result = JSON.parse(json);
    const score = Math.min(100, Math.max(0, Number(result.score) || 0));
    return { score, tips: Array.isArray(result.tips) ? result.tips : [], source: 'ollama' };
  } catch {
    return null;
  }
}

export const isOllamaEnabled = () => OLLAMA_ENABLED;
