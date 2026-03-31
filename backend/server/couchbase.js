import couchbase from 'couchbase';

let cluster = null;
let bucket = null;
let collection = null;

const COUCHBASE_URL = process.env.COUCHBASE_URL || 'couchbases://cb.zkadm7xwemjcjht4.cloud.couchbase.com';
const COUCHBASE_USER = process.env.COUCHBASE_USER || 'xtox';
const COUCHBASE_PASS = process.env.COUCHBASE_PASS || '8+fFce$rFABj';
const BUCKET_NAME = 'xtox';

export async function connectCouchbase() {
  try {
    cluster = await couchbase.connect(COUCHBASE_URL, {
      username: COUCHBASE_USER,
      password: COUCHBASE_PASS,
      timeouts: {
        connectTimeout: 10000,
        kvTimeout: 5000,
      },
    });
    bucket = cluster.bucket(BUCKET_NAME);
    collection = bucket.defaultCollection();
    console.log('[COUCHBASE] Connected ✅');
    return true;
  } catch (e) {
    console.warn('[COUCHBASE] Connection failed (non-fatal):', e.message);
    return false;
  }
}

// Smart backup: store a snapshot with retention logic
export async function createBackup(type, data) {
  if (!collection) return null;
  try {
    const now = Date.now();
    const key = `backup::${type}::${now}`;
    await collection.upsert(key, {
      type,
      data,
      createdAt: now,
      createdAtISO: new Date(now).toISOString(),
    });
    await applyRetentionPolicy(type);
    return key;
  } catch (e) {
    console.warn('[COUCHBASE] Backup failed:', e.message);
    return null;
  }
}

// Retention: keep 7 daily + 4 weekly + 3 monthly, delete rest
async function applyRetentionPolicy(type) {
  if (!cluster) return;
  try {
    const now = Date.now();
    const DAY = 86400000;
    const WEEK = DAY * 7;
    const MONTH = DAY * 30;

    // Query all backups of this type
    const query = `SELECT META().id as id, createdAt FROM \`${BUCKET_NAME}\` WHERE type = '${type}' ORDER BY createdAt DESC`;
    const result = await cluster.query(query);
    const backups = result.rows;

    const keep = new Set();

    // Keep last 7 daily
    backups.filter(b => now - b.createdAt < DAY * 7).slice(0, 7).forEach(b => keep.add(b.id));
    // Keep last 4 weekly
    backups.filter(b => now - b.createdAt < WEEK * 4).filter((_, i) => i % 7 === 0).slice(0, 4).forEach(b => keep.add(b.id));
    // Keep last 3 monthly
    backups.filter(b => now - b.createdAt < MONTH * 3).filter((_, i) => i % 30 === 0).slice(0, 3).forEach(b => keep.add(b.id));

    // Delete old backups
    for (const b of backups) {
      if (!keep.has(b.id)) {
        await collection.remove(b.id).catch(() => {});
      }
    }

    console.log(`[COUCHBASE] Retention applied: kept ${keep.size}, deleted ${backups.length - keep.size}`);
  } catch (e) {
    console.warn('[COUCHBASE] Retention policy failed:', e.message);
  }
}

// Cache get/set (replaces Redis for simple caching)
export async function cacheSet(key, value, ttlSeconds = 300) {
  if (!collection) return false;
  try {
    await collection.upsert(`cache::${key}`, { value, cachedAt: Date.now() }, { expiry: ttlSeconds });
    return true;
  } catch (e) {
    return false;
  }
}

export async function cacheGet(key) {
  if (!collection) return null;
  try {
    const result = await collection.get(`cache::${key}`);
    return result.content?.value ?? null;
  } catch (e) {
    return null;
  }
}

export { cluster, bucket, collection };
