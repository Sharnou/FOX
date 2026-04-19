// Couchbase Capella integration — optional, non-fatal
// Uses dynamic import to avoid crashing if SDK not installed
// Only connects if COUCHBASE_ENABLED=true AND all required env vars are set

// ── Fix C: Module-level guard — skip entirely if not configured ──────────────
const COUCHBASE_ENABLED = process.env.COUCHBASE_ENABLED === 'true'
  && !!(process.env.COUCHBASE_URL || process.env.COUCHBASE_HOST)
  && !!(process.env.COUCHBASE_USER || process.env.COUCHBASE_USERNAME)
  && !!(process.env.COUCHBASE_PASS || process.env.COUCHBASE_PASSWORD)
  && !!process.env.COUCHBASE_BUCKET;

let _cluster = null;
let _collection = null;
let _connected = false;

// Fix C: module-level disabled flag — all exported functions check this first
let couchbaseDisabled = !COUCHBASE_ENABLED;

const COUCHBASE_URL  = process.env.COUCHBASE_URL || process.env.COUCHBASE_HOST;
const COUCHBASE_USER = process.env.COUCHBASE_USER || process.env.COUCHBASE_USERNAME || 'xtox';
const COUCHBASE_PASS = process.env.COUCHBASE_PASS || process.env.COUCHBASE_PASSWORD;
const BUCKET_NAME    = process.env.COUCHBASE_BUCKET || 'XTOX';

// ── Fix B: Exponential backoff state ─────────────────────────────────────────
let retryCount = 0;
const MAX_RETRIES = 10;
let retryDelayMs = 30000;          // Start: 30s
const MAX_RETRY_DELAY_MS = 600000; // Cap: 10min

export async function connectCouchbase() {
  // Fix C: immediately return if Couchbase is disabled or permanently failed
  if (couchbaseDisabled) return false;

  try {
    // Dynamic import — won't crash if SDK not installed
    const couchbase = await import('couchbase').catch(() => null);
    if (!couchbase) {
      console.warn('[COUCHBASE] SDK not installed — skipping (non-fatal)');
      couchbaseDisabled = true;
      return false;
    }

    _cluster = await couchbase.default.connect(COUCHBASE_URL, {
      username: COUCHBASE_USER,
      password: COUCHBASE_PASS,
      configProfile: 'wanDevelopment',  // Required for Capella cloud connections
      connectTimeout: 3000,             // Fail fast (was SDK default ~30s)
      kvTimeout: 2000,                  // KV op timeout (was SDK default ~10s)
    });

    const bucket = _cluster.bucket(BUCKET_NAME);
    _collection = bucket.defaultCollection();
    await bucket.waitUntilReady(5000);
    _connected = true;
    // Fix B: reset backoff counters on success
    retryCount = 0;
    retryDelayMs = 30000;
    console.log('[COUCHBASE] Connected ✅');
    return true;
  } catch (e) {
    retryCount++;
    _cluster = null;
    _collection = null;
    _connected = false;

    if (retryCount >= MAX_RETRIES) {
      // Fix B: stop retrying after 10 attempts
      couchbaseDisabled = true;
      console.warn('[DB] Couchbase permanently disabled after 10 failed attempts — MongoDB is primary DB');
    } else {
      // Fix A: use console.warn instead of console.error (avoids Railway severity:error)
      console.warn('[DB] Couchbase connection error (non-fatal):', e.message);
      // Fix B: schedule retry with exponential backoff
      console.warn('[DB] Couchbase background attempt: timeout (non-fatal, will retry later)');
      const delay = retryDelayMs;
      retryDelayMs = Math.min(retryDelayMs * 2, MAX_RETRY_DELAY_MS);
      setTimeout(() => {
        connectCouchbase().catch(() => {});
      }, delay);
    }
    return false;
  }
}

// Smart backup with retention (7 daily + 4 weekly + 3 monthly)
export async function createBackup(type, data) {
  // Fix C: immediate null return if disabled
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
  // Fix C: immediate false return if disabled
  if (couchbaseDisabled || !_collection) return false;
  try {
    await _collection.upsert(`cache::${key}`, { value }, { expiry: ttlSeconds });
    return true;
  } catch (e) { return false; }
}

export async function cacheGet(key) {
  // Fix C: immediate null return if disabled
  if (couchbaseDisabled || !_collection) return null;
  try {
    const r = await _collection.get(`cache::${key}`);
    return r.content?.value ?? null;
  } catch (e) { return null; }
}

export function isCouchbaseConnected() {
  // Fix C: return false immediately if disabled
  return !couchbaseDisabled && _connected;
}

export { _cluster as cluster, _collection as collection };
