// Failover AI Key Pool — auto-rotate on failure
const keys = (process.env.AI_KEYS || process.env.OPENAI_API_KEY || '').split(',').filter(Boolean);
let idx = 0;

export function getCurrentKey() {
  return keys[idx] || '';
}

export function rotateKey() {
  idx = (idx + 1) % (keys.length || 1);
}

export async function callWithFailover(fn) {
  const maxTries = keys.length || 1;
  for (let i = 0; i < maxTries; i++) {
    try {
      return await fn(getCurrentKey());
    } catch (err) {
      console.warn(`Key ${idx} failed, rotating...`);
      rotateKey();
    }
  }
  throw new Error('All AI keys exhausted');
}
