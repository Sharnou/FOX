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
let couchbaseRetries = 0;
const MAX_COUCHBASE_RETRIES = 3;

// ── Attempt MongoDB connection (10s timeout) ─────────────────────────────────
async function tryMongoDB() {
  let uri = process.env.MONGODB_URI 
    || process.env.MONGO_URL 
    || 'mongodb+srv://ahmedsharnou_db_user:MiqAQuCFW080G6u9@cluster0.77mmp6c.mongodb.net/xtox';
  
  // Ensure database name is 'xtox' — fix URIs that don't specify a DB or specify 'test'
  if (!uri.includes('/xtox')) {
    // Strip any existing db name after the last '/' before '?' and replace with 'xtox'
    uri = uri.replace(/\/([^/?]+)(\?|$)/, '/xtox$2');
    // If no db path at all (ends with hostname), append /xtox
    if (!uri.includes('/xtox')) {
      uri = uri.replace(/(\?|$)/, '/xtox$1');
    }
  }
  
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log('[DB] MongoDB connected to xtox database — set as PRIMARY');
  return 'mongodb';
}

// ── Attempt Couchbase connection (5s timeout — reduced, fire-and-forget) ─────
async function tryCouchbase() {
  // Couchbase is opt-in — must explicitly set COUCHBASE_ENABLED=true
  if (process.env.COUCHBASE_ENABLED !== 'true') {
    // Silent skip — no log spam
    throw new Error('Couchbase not enabled');
  }
  // Stop retrying after cap — prevents log spam
  if (couchbaseRetries >= MAX_COUCHBASE_RETRIES) {
    return null;
  }
  // Skip entirely if COUCHBASE_URL is not explicitly set — prevents noisy timeouts on Railway
  if (!process.env.COUCHBASE_URL && !process.env.COUCHBASE_HOST) {
    console.log('[DB] Couchbase skipped — not configured (COUCHBASE_URL not set)');
    throw new Error('Couchbase not configured');
  }
  const url = process.env.COUCHBASE_URL || process.env.COUCHBASE_HOST;
  const username = process.env.COUCHBASE_USERNAME || 'xtox';
  const password = process.env.COUCHBASE_PASSWORD  || '#N^wx+uO^70G';
  const bucketName = process.env.COUCHBASE_BUCKET || 'XTOX';

  // Only reached if COUCHBASE_ENABLED=true — safe to log
  console.log(`[DB] Connecting to Couchbase: ${url} as ${username}`);

  // Dynamic import — won't crash if SDK not installed
  const couchbaseMod = await import('couchbase').catch(() => null);
  if (!couchbaseMod) throw new Error('Couchbase SDK not installed');

  const couchbase = couchbaseMod.default || couchbaseMod;

  try {
    couchbaseCluster = await couchbase.connect(url, {
      username,
      password,
      timeouts: {
        connectTimeout: 5000,  // reduced from 10000
        kvTimeout: 3000,       // reduced from 5000
        queryTimeout: 10000,
      },
    });

    // Ping to verify the connection is actually working
    // Without this, connect() can succeed but queries still fail
    await couchbaseCluster.ping();

    couchbaseBucket     = couchbaseCluster.bucket(bucketName);
    couchbaseCollection = couchbaseBucket.defaultCollection();

    // Quick probe to verify the bucket is accessible
    await couchbaseBucket.waitUntilReady(5000);

    console.log('[DB] Couchbase connected — available as secondary');
    return 'couchbase';
  } catch (e) {
    couchbaseRetries++;
    couchbaseError = e.message || String(e);
    if (couchbaseRetries >= MAX_COUCHBASE_RETRIES) {
      console.warn('[DB] Couchbase max retries reached — Couchbase disabled. Check COUCHBASE_URL env var and IP whitelist in Couchbase Capella.');
    } else {
      console.error('[DB] Couchbase connection error:', e.message);
      console.error('[DB] Couchbase error code:', e.code || e.cause?.code || 'N/A');
    }
    throw e;
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
    tryCouchbase().catch(e => {
      console.warn('[DB] Couchbase background attempt failed (non-fatal):', e.message);
    });
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
