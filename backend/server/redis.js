import Redis from 'ioredis';

let redis = null;

if (process.env.REDIS_URL && process.env.REDIS_URL !== 'your_redis_url') {
  redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
    lazyConnect: true
  });
  redis.on('error', (err) => {
    // Non-fatal — ranking features disabled without Redis
    console.warn('[Redis] Connection error (non-fatal):', err.message);
  });
  console.log('[Redis] Connected');
} else {
  console.warn('[Redis] REDIS_URL not set — ranking features disabled, app continues normally');
}

export default redis;
