import Redis from 'ioredis';

// Redis - completely optional, never crashes the server
let redis = null;

const REDIS_URL = process.env.REDIS_URL || '';

const isRealRedis = REDIS_URL &&
  REDIS_URL !== 'disabled' &&
  REDIS_URL !== 'false' &&
  REDIS_URL !== 'none' &&
  REDIS_URL !== 'null' &&
  REDIS_URL !== 'your_redis_url' &&
  (REDIS_URL.startsWith('redis://') || REDIS_URL.startsWith('rediss://'));

if (isRealRedis) {
  try {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 0,
      enableReadyCheck: false,
      lazyConnect: true,
      retryStrategy: () => null
    });
    redis.on('error', () => {}); // never crash on redis error
    redis.on('connect', () => console.log('[Redis] ✅ Connected'));
  } catch (e) {
    console.warn('[Redis] Failed to init:', e.message);
    redis = null;
  }
} else {
  console.log(`[Redis] Skipped — REDIS_URL="${REDIS_URL || 'not set'}" is not a valid Redis URL`);
}

export default redis;
