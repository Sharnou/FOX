import couchbase from 'couchbase';

let cluster = null;
let bucket = null;
let collection = null;

const COUCHBASE_HOST     = process.env.COUCHBASE_HOST     || 'couchbases://cb.zkadm7xwemjcjht4.cloud.couchbase.com';
const COUCHBASE_USER     = process.env.COUCHBASE_USER     || 'xtox';
const COUCHBASE_PASSWORD = process.env.COUCHBASE_PASSWORD || '8+fFce$rFABj';
const BUCKET_NAME        = process.env.COUCHBASE_BUCKET   || 'travel-sample';

const MAX_RETRIES    = 3;
const RETRY_DELAY_MS = 5000;

async function attemptConnect() {
  const conn = await couchbase.connect(COUCHBASE_HOST, {
    username: COUCHBASE_USER,
    password: COUCHBASE_PASSWORD,
    timeouts: {
      connectTimeout: 15000,
      kvTimeout:      5000,
      queryTimeout:   10000,
    },
  });
  const bkt  = conn.bucket(BUCKET_NAME);
  const coll = bkt.defaultCollection();
  return { conn, bkt, coll };
}

export async function connectCouchbase(retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[COUCHBASE] Connecting to ${COUCHBASE_HOST} (attempt ${attempt}/${retries})...`);
      const { conn, bkt, coll } = await attemptConnect();
      cluster    = conn;
      bucket     = bkt;
      collection = coll;
      console.log(`[COUCHBASE] Connected ✅  bucket="${BUCKET_NAME}" user="${COUCHBASE_USER}"`);
      return true;
    } catch (e) {
      console.warn(`[COUCHBASE] Attempt ${attempt}/${retries} failed: ${e.message}`);
      if (attempt < retries) {
        console.log(`[COUCHBASE] Retrying in ${RETRY_DELAY_MS / 1000}s...`);
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
      }
    }
  }
  console.warn('[COUCHBASE] All connection attempts failed (non-fatal — app continues without Couchbase)');
  return false;
}

/**
 * Returns the live Couchbase cluster instance, or null if not connected.
 * Use this in route handlers to access the cluster.
 *
 * @returns {import('couchbase').Cluster | null}
 */
export function getCouchbaseCluster() {
  return cluster;
}

/**
 * Returns the default collection for the configured bucket, or null if not connected.
 *
 * @returns {import('couchbase').Collection | null}
 */
export function getCouchbaseCollection() {
  return collection;
}

// ─── Smart backup: store a snapshot with retention logic ────────────────────

export async function createBackup(type, data) {
  if (!collection) return null;
  try {
    const now = Date.now();
    const key = `backup::${type}::${now}`;
    await collection.upsert(key, {
      type,
      data,
      createdAt:    now,
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
    const now   = Date.now();
    const DAY   = 86400000;
    const WEEK  = DAY * 7;
    const MONTH = DAY * 30;

    const query   = `SELECT META().id AS id, createdAt FROM \`${BUCKET_NAME}\` WHERE type = '${type}' ORDER BY createdAt DESC`;
    const result  = await cluster.query(query);
    const backups = result.rows;

    const keep = new Set();

    // Keep last 7 daily
    backups.filter(b => now - b.createdAt < DAY * 7).slice(0, 7).forEach(b => keep.add(b.id));
    // Keep last 4 weekly
    backups.filter(b => now - b.createdAt < WEEK * 4).filter((_, i) => i % 7 === 0).slice(0, 4).forEach(b => keep.add(b.id));
    // Keep last 3 monthly
    backups.filter(b => now - b.createdAt < MONTH * 3).filter((_, i) => i % 30 === 0).slice(0, 3).forEach(b => keep.add(b.id));

    for (const b of backups) {
      if (!keep.has(b.id)) await collection.remove(b.id).catch(() => {});
    }

    console.log(`[COUCHBASE] Retention applied: kept ${keep.size}, deleted ${backups.length - keep.size}`);
  } catch (e) {
    console.warn('[COUCHBASE] Retention policy failed:', e.message);
  }
}

// ─── Cache helpers (lightweight Redis alternative) ──────────────────────────

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
