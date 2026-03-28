import Redis from 'ioredis';

// Make Redis completely optional — never crash the server
let redis = null;

const url = process.env.REDIS_URL;
const isValidUrl = url && url !== 'your_redis_url' && url !== 'disabled' && url.startsWith('redis');

if (isValidUrl) {
  try {
    redis = new Redis(url, {
      maxRetriesPerRequest: 0,
      enableReadyCheck: false,
      lazyConnect: true,
      retryStrategy: () => null // never retry — fail silently
    });
    redis.on('error', () => {}); // swallow ALL errors
    redis.on('connect', () => console.log('[Redis] Connected ✅'));
  } catch (e) {
    redis = null;
    console.warn('[Redis] Init failed (non-fatal):', e.message);
  }
} else {
  console.warn('[Redis] Not configured — ranking features disabled');
}

// Prevent ANY unhandled Redis error from crashing the process
process.on('unhandledRejection', (reason) => {
  if (String(reason).includes('redis') || String(reason).includes('ECONNREFUSED')) {
    return; // silently ignore Redis rejections
  }
  console.error('Unhandled rejection:', reason);
});

export default redis;
