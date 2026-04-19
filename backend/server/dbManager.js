// backend/server/dbManager.js
// Smart dual-DB: MongoDB primary, Couchbase optional.
// MongoDB becomes PRIMARY immediately upon connecting — never blocked by Couchbase.
// Both fail → in-memory fallback.
// Uses ES module syntax (project has "type": "module").

import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

let activeDB = 'memory'; // default until a connection resolves
let couchbaseCluster = null;
let couchbaseBucket = null;
let couchbaseCollection = null;
let couchbaseError = null;
// Only ONE attempt ever — no retries, no background loops
let _couchbaseAttempted = false;

// ── Attempt MongoDB connection (10s timeout) ─────────────────────────────────
async function tryMongoDB() {
  let uri = process.env.MONGODB_URI 
    || process.env.MONGO_URL 
    || 'mongodb+srv://ahmedsharnou_db_user:MiqAQuCFW080G6u9@cluster0.77mmp6c.mongodb.net/xtox';
  
  // Ensure database name is 'xtox' — fix URIs that don't specify a DB or specify 'test'
  if (!uri.includes('/xtox')) {
    uri = uri.replace(/\/([^/?]+)(\?|$)/, '/xtox$2');
    if (!uri.includes('/xtox')) {
      uri = uri.replace(/(\?|$)/, '/xtox$1');
    }
  }
  
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log('[DB] MongoDB connected to xtox database — set as PRIMARY');
  return 'mongodb';
}

// ── Attempt Couchbase connection — one shot, completely silent if not configured ──
async function tryCouchbase() {
  // Couchbase is opt-in — must explicitly set COUCHBASE_ENABLED=true
  if (process.env.COUCHBASE_ENABLED !== 'true') {
    // Completely silent — no log, no warning
    return null;
  }

  // Skip entirely if COUCHBASE_URL is not set — prevents noisy timeouts on Railway
  if (!process.env.COUCHBASE_URL && !process.env.COUCHBASE_HOST) {
    // Completely silent — intentionally not configured
    return null;
  }

  // Only ever attempt once — no background retries
  if (_couchbaseAttempted) return null;
  _couchbaseAttempted = true;

  const url = process.env.COUCHBASE_URL || process.env.COUCHBASE_HOST;
  const username = process.env.COUCHBASE_USERNAME || process.env.COUCHBASE_USER || 'xtox';
  const password = process.env.COUCHBASE_PASSWORD || process.env.COUCHBASE_PASS || '#N^wx+uO^70G';
  const bucketName = process.env.COUCHBASE_BUCKET || 'XTOX';

  console.log(`[DB] Connecting to Couchbase: ${url} as ${username}`);

  // Dynamic import — won't crash if SDK not installed
  const couchbaseMod = await import('couchbase').catch(() => null);
  if (!couchbaseMod) {
    console.warn('[DB] Couchbase SDK not installed — skipping (non-fatal)');
    return null;
  }

  const couchbase = couchbaseMod.default || couchbaseMod;

  try {
    couchbaseCluster = await couchbase.connect(url, {
      username,
      password,
      timeouts: {
        connectTimeout: 5000,
        kvTimeout: 3000,
        queryTimeout: 10000,
      },
    });

    await couchbaseCluster.ping();

    couchbaseBucket     = couchbaseCluster.bucket(bucketName);
    couchbaseCollection = couchbaseBucket.defaultCollection();
    await couchbaseBucket.waitUntilReady(5000);

    console.log('[DB] Couchbase connected — available as secondary');
    return 'couchbase';
  } catch (e) {
    // Log ONCE at warn level — then permanently done, no retry
    couchbaseError = e.message || String(e);
    couchbaseCluster = null;
    couchbaseBucket = null;
    couchbaseCollection = null;
    console.warn('[DB] Couchbase unavailable (non-fatal, MongoDB is primary):', couchbaseError);
    return null;
  }
}

// ── MongoDB first: becomes PRIMARY immediately, Couchbase is fire-and-forget ──
export async function connectDatabases() {
  // STEP 1: Try MongoDB first — it MUST become primary without waiting for Couchbase
  const mongoResult = await tryMongoDB().catch(e => {
    console.warn('[DB] MongoDB failed:', e.message);
    return null;
  });

  if (mongoResult) {
    activeDB = mongoResult;
    console.log(`[DB] Active database: ${activeDB}`);
    // Fire Couchbase in background — NEVER blocks MongoDB from being primary
    // Silently ignored if not configured; logs ONCE if configured but fails
    tryCouchbase().catch(() => {});
    return activeDB;
  }

  // STEP 2: MongoDB failed — try Couchbase as fallback
  const couchbaseResult = await tryCouchbase().catch(e => {
    console.warn('[DB] Couchbase failed:', e.message);
    return null;
  });

  if (couchbaseResult) {
    activeDB = couchbaseResult;
  } else {
    activeDB = 'memory';
    console.warn('[DB] Both databases unavailable — using in-memory store');
  }

  console.log(`[DB] Active database: ${activeDB}`);
  return activeDB;
}

// ── Accessors ────────────────────────────────────────────────────────────────
export function getActiveDB()             { return activeDB; }
export function getCouchbaseCollection()  { return couchbaseCollection; }
export function getCouchbaseCluster()     { return couchbaseCluster; }
export function getCouchbaseError()       { return couchbaseError; }
