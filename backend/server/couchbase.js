// Couchbase Capella integration — optional, non-fatal
// Uses dynamic import to avoid crashing if SDK not installed
// Only connects if COUCHBASE_URL or COUCHBASE_HOST env var is explicitly set

let _cluster = null;
let _collection = null;
let _connected = false;

const COUCHBASE_URL  = process.env.COUCHBASE_URL || process.env.COUCHBASE_HOST;
const COUCHBASE_USER = process.env.COUCHBASE_USER || 'xtox';
const COUCHBASE_PASS = process.env.COUCHBASE_PASS || process.env.COUCHBASE_PASSWORD;
const BUCKET_NAME    = process.env.COUCHBASE_BUCKET || 'XTOX';

export async function connectCouchbase() {
  // Skip entirely if not configured — prevents noisy 30-second timeout on Railway
  if (!COUCHBASE_URL || !COUCHBASE_PASS) {
    console.warn('[COUCHBASE] Not configured (COUCHBASE_URL/COUCHBASE_PASS missing) — caching disabled');
    return false;
  }

  try {
    // Dynamic import — won't crash if SDK not installed
    const couchbase = await import('couchbase').catch(() => null);
    if (!couchbase) {
      console.warn('[COUCHBASE] SDK not installed — skipping (non-fatal)');
      return false;
    }

    _cluster = await couchbase.default.connect(COUCHBASE_URL, {
      username: COUCHBASE_USER,
      password: COUCHBASE_PASS,
      configProfile: 'wanDevelopment',  // Required for Capella cloud connections
    });

    const bucket = _cluster.bucket(BUCKET_NAME);
    _collection = bucket.defaultCollection();
    // Reduced timeout: 5s instead of 30s to fail fast and not block startup
    await bucket.waitUntilReady(5000);
    _connected = true;
    console.log('[COUCHBASE] Connected ✅');
    return true;
  } catch (e) {
    console.warn('[COUCHBASE] Connection failed (non-fatal):', e.message);
    _cluster = null;
    _collection = null;
    _connected = false;
    return false;
  }
}

// Smart backup with retention (7 daily + 4 weekly + 3 monthly)
export async function createBackup(type, data) {
  if (!_collection) return null;
  try {
    const now = Date.now();
    const key = `backup::${type}::${now}`;
    await _collection.upsert(key, { type, data, createdAt: now });
    await applyRetentionPolicy(type);
    return key;
  } catch (e) {
    console.warn('[COUCHBASE] Backup failed:', e.message);
    return null;
  }
}

async function applyRetentionPolicy(type) {
  if (!_cluster) return;
  try {
    const now = Date.now();
    const DAY = 86400000;
    const result = await _cluster.query(
      `SELECT META().id as id, createdAt FROM \`${BUCKET_NAME}\` WHERE type = $1 ORDER BY createdAt DESC`,
      { parameters: [type] }
    );
    const backups = result.rows;
    const keep = new Set();
    backups.filter(b => now - b.createdAt < DAY * 7).slice(0, 7).forEach(b => keep.add(b.id));
    backups.filter(b => now - b.createdAt < DAY * 28).filter((_, i) => i % 7 === 0).slice(0, 4).forEach(b => keep.add(b.id));
    backups.filter(b => now - b.createdAt < DAY * 90).filter((_, i) => i % 30 === 0).slice(0, 3).forEach(b => keep.add(b.id));
    for (const b of backups) {
      if (!keep.has(b.id)) await _collection.remove(b.id).catch(() => {});
    }
  } catch (e) {
    console.warn('[COUCHBASE] Retention failed:', e.message);
  }
}

export async function cacheSet(key, value, ttlSeconds = 300) {
  if (!_collection) return false;
  try {
    await _collection.upsert(`cache::${key}`, { value }, { expiry: ttlSeconds });
    return true;
  } catch (e) { return false; }
}

export async function cacheGet(key) {
  if (!_collection) return null;
  try {
    const r = await _collection.get(`cache::${key}`);
    return r.content?.value ?? null;
  } catch (e) { return null; }
}

export function isCouchbaseConnected() { return _connected; }
export { _cluster as cluster, _collection as collection };
