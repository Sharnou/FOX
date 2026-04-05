// backend/server/dbManager.js
// Smart dual-DB: MongoDB + Couchbase race on startup.
// Whichever connects first becomes PRIMARY. Both fail → in-memory fallback.
// Uses ES module syntax (project has "type": "module").

import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

let activeDB = 'memory'; // default until a connection resolves
let couchbaseCluster = null;
let couchbaseBucket = null;
let couchbaseCollection = null;
let couchbaseError = null;

// ── Attempt MongoDB connection (10s timeout) ─────────────────────────────────
async function tryMongoDB() {
  // Honour all the same env vars that index.js uses
  const uri =
    process.env.MONGO_URL ||
    process.env.MONGODB_URL ||
    process.env.MONGOURL ||
    process.env.MONGO_PUBLIC_URL ||
    process.env.DATABASE_URL ||
    process.env.MONGO_URI ||
    'mongodb+srv://ahmedsharnou_db_user:MiqAQuCFW080G6u9@cluster0.77mmp6c.mongodb.net/xtox';

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log('[DB] MongoDB connected — set as PRIMARY');
  return 'mongodb';
}

// ── Attempt Couchbase connection (10s timeout) ───────────────────────────────
async function tryCouchbase() {
  const url = process.env.COUCHBASE_URL || 'couchbases://cb.zkadm7xwemjcjht4.cloud.couchbase.com';
  const username = process.env.COUCHBASE_USERNAME || 'xtox';
  const password = process.env.COUCHBASE_PASSWORD  || '#N^wx+uO^70G';
  const bucketName = process.env.COUCHBASE_BUCKET || 'xtox';

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
        connectTimeout: 10000,
        kvTimeout: 5000,
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

    console.log('[DB] Couchbase connected — set as PRIMARY');
    return 'couchbase';
  } catch (e) {
    couchbaseError = e.message || String(e);
    console.error('[DB] Couchbase connection error:', e.message);
    console.error('[DB] Couchbase error code:', e.code || e.cause?.code || 'N/A');
    throw e;
  }
}

// ── Race: whichever DB connects first wins ───────────────────────────────────
export async function connectDatabases() {
  const mongoPromise = tryMongoDB().catch(e => {
    console.warn('[DB] MongoDB failed:', e.message);
    return null;
  });

  const couchbasePromise = tryCouchbase().catch(e => {
    console.warn('[DB] Couchbase failed:', e.message);
    return null;
  });

  // Convert null-resolving promises to forever-pending ones so Promise.race
  // only picks up a real winner.  A 12-second safety timeout breaks the stall
  // if both DBs fail before their own timeouts fire.
  const raceResult = await Promise.race([
    mongoPromise.then(r     => (r ? r : new Promise(() => {}))),
    couchbasePromise.then(r => (r ? r : new Promise(() => {}))),
    new Promise(resolve => setTimeout(() => resolve(null), 12000)),
  ]).catch(() => null);

  if (raceResult) {
    activeDB = raceResult;
  } else {
    // Both timed-out or failed — pick whichever settled successfully
    const [m, c] = await Promise.all([mongoPromise, couchbasePromise]);
    if (m)      activeDB = 'mongodb';
    else if (c) activeDB = 'couchbase';
    else {
      activeDB = 'memory';
      console.warn('[DB] Both databases unavailable — using in-memory store');
    }
  }

  console.log(`[DB] Active database: ${activeDB}`);
  return activeDB;
}

// ── Accessors ────────────────────────────────────────────────────────────────
export function getActiveDB()             { return activeDB; }
export function getCouchbaseCollection()  { return couchbaseCollection; }
export function getCouchbaseCluster()     { return couchbaseCluster; }
export function getCouchbaseError()       { return couchbaseError; }
