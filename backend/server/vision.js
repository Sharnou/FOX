import fetch from 'node-fetch';
import { callWithFailover } from './keyPool.js';
export async function analyzeImage(base64OrUrl) {
  const imageContent = base64OrUrl.startsWith('http')
    ? { type: 'image_url', image_url: { url: base64OrUrl } }
    : { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64OrUrl}` } };
  return callWithFailover(async (key) => {
    const res = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: [{ type: 'text', text: 'Describe this product for a marketplace. Include: what it is, condition, key features.' }, imageContent] }], max_tokens: 300 }) });
    const d = await res.json(); return d.choices?.[0]?.message?.content || '';
  });
}
