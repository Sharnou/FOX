// Couchbase Capella integration — optional, non-fatal
// Uses dynamic import to avoid crashing if SDK not installed
// Only connects if COUCHBASE_ENABLED=true AND all required env vars are set
// On any failure: log ONCE at warn level, disable permanently — NO retries

// ── Module-level guard — skip entirely if not configured ─────────────────────
const COUCHBASE_ENABLED = process.env.COUCHBASE_ENABLED === 'true'
  && !!(process.env.COUCHBASE_URL || process.env.COUCHBASE_HOST)
  && !!(process.env.COUCHBASE_USER || process.env.COUCHBASE_USERNAME)
  && !!(process.env.COUCHBASE_PASS || process.env.COUCHBASE_PASSWORD)
  && !!process.env.COUCHBASE_BUCKET;

let _cluster = null;
let _collection = null;
let _connected = false;

// Disabled flag — all exported functions check this first
// Starts as true (disabled) unless all env vars are present
let couchbaseDisabled = !COUCHBASE_ENABLED;
// Ensure we only ever attempt once
let _attemptMade = false;

const COUCHBASE_URL  = process.env.COUCHBASE_URL || process.env.COUCHBASE_HOST;
const COUCHBASE_USER = process.env.COUCHBASE_USER || process.env.COUCHBASE_USERNAME || 'xtox';
const COUCHBASE_PASS = process.env.COUCHBASE_PASS || process.env.COUCHBASE_PASSWORD;
const BUCKET_NAME    = process.env.COUCHBASE_BUCKET || 'XTOX';

export async function connectCouchbase() {
  // Immediately return if disabled or already attempted
  if (couchbaseDisabled) return false;
  if (_attemptMade) return _connected;
  _attemptMade = true;

  try {
    // Dynamic import — won't crash if SDK not installed
    const couchbase = await import('couchbase').catch(() => null);
    if (!couchbase) {
      couchbaseDisabled = true;
      return false;
    }

    _cluster = await couchbase.default.connect(COUCHBASE_URL, {
      username: COUCHBASE_USER,
      password: COUCHBASE_PASS,
      configProfile: 'wanDevelopment',
      connectTimeout: 3000,
      kvTimeout: 2000,
    });

    const bucket = _cluster.bucket(BUCKET_NAME);
    _collection = bucket.defaultCollection();
    await bucket.waitUntilReady(5000);
    _connected = true;
    console.log('[COUCHBASE] Connected ✅');
    return true;
  } catch (e) {
    // Log ONCE at warn level, then permanently disable — NO retries, NO setTimeout
    _cluster = null;
    _collection = null;
    _connected = false;
    couchbaseDisabled = true;
    console.log('[COUCHBASE] Disabled — connection failed (non-fatal, MongoDB is primary):', e.message || String(e));
    return false;
  }
}

// Smart backup with retention (7 daily + 4 weekly + 3 monthly)
export async function createBackup(type, data) {
  if (couchbaseDisabled || !_collection) return null;
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
  if (couchbaseDisabled || !_cluster) return;
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
  if (couchbaseDisabled || !_collection) return false;
  try {
    await _collection.upsert(`cache::${key}`, { value }, { expiry: ttlSeconds });
    return true;
  } catch (e) { return false; }
}

export async function cacheGet(key) {
  if (couchbaseDisabled || !_collection) return null;
  try {
    const r = await _collection.get(`cache::${key}`);
    return r.content?.value ?? null;
  } catch (e) { return null; }
}

export function isCouchbaseConnected() {
  return !couchbaseDisabled && _connected;
}

export { _cluster as cluster, _collection as collection };
