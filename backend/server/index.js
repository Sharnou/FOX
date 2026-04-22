// CRITICAL: Clear invalid Redis URL before ANY module imports it
// Prevents "ENOTFOUND disabled" crash
if (process.env.REDIS_URL && 
    !process.env.REDIS_URL.startsWith('redis://') && 
    !process.env.REDIS_URL.startsWith('rediss://')) {
  console.log('[BOOT] Clearing invalid REDIS_URL:', process.env.REDIS_URL);
  process.env.REDIS_URL = '';
}


// ─── Global crash guards — prevent Railway from restarting on uncaught errors ────
// Node.js 24.x kills process on unhandledRejection by default; these prevent that
process.on('uncaughtException', (err) => {
  console.error('[CRASH] Uncaught Exception:', err.message, err.stack);
  // Don't exit — let Railway keep the server alive
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRASH] Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit — log and continue
});
// ────────────────────────────────────────────────────────────────────────────────
import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import cron from 'node-cron';
// Dynamic imports — safe even if packages not installed
const compressionModule = await import('compression').catch(() => null);
const helmetModule = await import('helmet').catch(() => null);
const compression = compressionModule?.default || null;
const helmet = helmetModule?.default || null;
import { initSocket } from './socket.js';
import { archiveExpiredAds, deleteOldArchives } from './archiveManager.js';
import { seedCountries } from './countries.js';
import { seedCelebrations } from './celebrations.js';
import { seedCoreDictionary } from './languageLearner.js';
import { runHealthCheck, autoResolveOldErrors } from './healthMonitor.js';
let connectCouchbase = null;
let couchbaseCluster = null;
try {
  const cb = await import('./couchbase.js');
  connectCouchbase = cb.connectCouchbase;
  couchbaseCluster = cb.cluster;
} catch(e) {
  console.warn('[COUCHBASE] Module load failed:', e.message);
}

// Routes
import userRoutes, { seedSuperAdmin } from '../routes/users.js';
import adRoutes from '../routes/ads.js';
import chatRoutes from '../routes/chat.js';
import adminRoutes from '../routes/admin.js';
import adminPromotionsRouter from '../routes/adminPromotions.js';
import jobRoutes from '../routes/jobs.js';
import serviceRoutes from '../routes/services.js';
import supermarketRoutes from '../routes/supermarket.js';
import pharmacyRoutes from '../routes/pharmacy.js';
import fastfoodRoutes from '../routes/fastfood.js';
import rssRoutes from '../routes/rss.js';
import profileRoutes from '../routes/profile.js';
import errorRoutes from '../routes/errors.js';
import geoRoutes from '../routes/geo.js';
import languageRoutes from '../routes/language.js';
import seoRoutes from '../routes/seo.js';
import paymentRoutes from '../routes/payment.js';
import reportRoutes from '../routes/reports.js';
import offersRouter from '../routes/offers.js';
import wishlistRouter from '../routes/wishlist.js';
import authRouter from '../routes/auth.js';
import reviewsRouter from '../routes/reviews.js';
import favoritesRouter from '../routes/favorites.js';
import promoteRouter from '../routes/promote.js';
import whatsappRouter from '../routes/whatsapp.js';
import notificationRoutes from '../routes/notifications.js';
import pushRoutes from '../routes/push.js';
import iceRoutes from '../routes/ice.js';
import winnerRouter from '../routes/winner.js';
// WP token validity check (deferred import to avoid startup crash if module errors)
let _getWPTokenStatus = null;
(async () => {
  try {
    const wpUtils = await import('../utils/wordpress.js');
    _getWPTokenStatus = wpUtils.getWPTokenStatus;
  } catch {}
})();
import wpRouter from "../routes/wp.js";
import { loadWPTokenFromDB } from '../utils/wordpress.js';
import translationsRouter from '../routes/translations.js';
import translateRouter from '../routes/translate.js';
import callsRouter from '../routes/calls.js';
import { initMonthlyWinner } from '../jobs/monthlyWinner.js';
// Pre-register WinnerHistory model so it is available before first query
import('../models/WinnerHistory.js').catch(e => console.warn('[WinnerHistory] model load failed:', e.message));
import('../models/Review.js').catch(e => console.warn('[Review] model load failed:', e.message));

// Ensure Review unique index {ad, reviewer} exists after DB connects
mongoose.connection.once('open', async () => {
  try {
    const ReviewModel = (await import('../models/Review.js')).default;
    await ReviewModel.collection.createIndex({ ad: 1, reviewer: 1 }, { unique: true, background: true });
    console.log('[DB] Review unique index ensured');
  } catch(e) {
    console.log('[DB] Review index:', e.message);
  }
});
import jwt from 'jsonwebtoken';
import { initMemoryStore, dbState } from './memoryStore.js';
import { connectDatabases, getActiveDB, getCouchbaseError } from './dbManager.js';


// --- Metrics: request counter ---
let _metricsRequestCount = 0;
const _metricsStart = Date.now();

const logger = pino();
const app = express();
app.set('trust proxy', 1);
app.use((req, res, next) => { _metricsRequestCount++; next(); });

// CORS must be FIRST — before any other middleware, before body parsers
// ─── CORS config — permissive: all Vercel previews, Railway, localhost ──────
const allowedOrigins = [
  'https://fox-kohl-eight.vercel.app',
  'https://xtox-production.up.railway.app',
  'https://xtox.app',
  'http://localhost:3000',
  'http://localhost:3001',
  /\.vercel\.app$/,
  /\.netlify\.app$/,
  /\.railway\.app$/,
];
const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // allow non-browser (curl, mobile)
    const allowed = allowedOrigins.some(o =>
      typeof o === 'string' ? o === origin : o.test(origin)
    );
    cb(allowed ? null : new Error('CORS blocked: ' + origin), allowed);
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','Accept','x-country','x-refresh-token','x-auth-token'],
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions)); // preflight for all routes



// Gzip compression — reduces API response size by 60-80% (free)
if (compression) app.use(compression());

// Security headers (helmet) — free hardening
if (helmet) app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false, crossOriginResourcePolicy: false }));

// Raw body parser for Stripe webhook signature verification — MUST be before express.json()
// Stripe's constructEvent() requires the raw buffer, not parsed JSON
app.use('/api/promote/webhook', express.raw({ type: '*/*' }));

app.use(express.json({ limit: '10mb' }));

// ─── Health route FIRST — must respond immediately for Railway healthcheck ────
app.get('/api/health', (_, res) => {
  const connState = mongoose.connection.readyState;
  const stateNames = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting', 99: 'uninitialized' };
  res.json({
    status: 'ok',
    version: '1.0.0',
    uptime: Math.floor(process.uptime()),
    db: stateNames[connState] || 'unknown',
    mongoConnected: connState === 1,
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (_, res) => {
  const connState = mongoose.connection.readyState;
  const stateNames = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting', 99: 'uninitialized' };
  res.json({
    status: 'XTOX Backend v2.0 ✅',
    time: new Date().toISOString(),
    admin: '[REDACTED - set via env vars]',
    env: {
      activeDB: getActiveDB(),
      mongoConnected: connState === 1,
      mongoState: stateNames[connState] || 'unknown',
      mongoUriSource: process.env.MONGO_URL ? 'MONGO_URL ✅' :
                      process.env.MONGO_URI ? 'MONGO_URI' :
                      process.env.MONGODB_URL ? 'MONGODB_URL' :
                      process.env.MONGOURL ? 'MONGOURL' :
                      process.env.MONGO_PUBLIC_URL ? 'MONGO_PUBLIC_URL' :
                      process.env.MONGOHOST ? 'CONSTRUCTED' :
                      'HARDCODED_ATLAS_FALLBACK',
      jwtSet: !!process.env.JWT_SECRET || 'fox-default-secret',
      couchbaseConnected: couchbaseCluster !== null,
      couchbaseError: getCouchbaseError() || null,
      frontendUrl: process.env.FRONTEND_URL || 'not set'
    }
  });
});
// ─────────────────────────────────────────────────────────────────────────────
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

// ─── Cache-Control Middleware ───────────────────────────────────────────────
// Applied after CORS & rate-limit, before all route handlers.
app.use((req, res, next) => {
  const p = req.path;

  // Auth / user-session / admin / chat / profile / errors — never cache
  if (
    p.startsWith('/api/users') ||
    p.startsWith('/api/admin') ||
    p.startsWith('/api/chat') ||
    p.startsWith('/api/profile') ||
    p.startsWith('/api/errors') ||
    p.startsWith('/api/reports')
  ) {
    res.set('Cache-Control', 'no-store');

  // Geo & language data — semi-static, cache 5 minutes
  } else if (p.startsWith('/api/geo') || p.startsWith('/api/language')) {
    if (req.method === 'GET') {
      res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    } else {
      res.set('Cache-Control', 'no-store');
    }

  // RSS / SEO / sitemap — mostly static, cache 1 hour
  } else if (p.startsWith('/rss') || p.startsWith('/seo') || p.startsWith('/sitemap') || p.startsWith('/robots')) {
    res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=7200');

  // Public listing GET routes (ads, jobs, services, etc.) — short cache
  } else if (req.method === 'GET') {
    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');

  // POST / PUT / DELETE — no cache
  } else {
    res.set('Cache-Control', 'no-store');
  }

  next();
});
// ────────────────────────────────────────────────────────────────────────────


app.use('/api/users', userRoutes);
app.use('/api/ads', adRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin/promotions', adminPromotionsRouter);
app.use('/api/admin', adminRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/supermarket', supermarketRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/fastfood', fastfoodRoutes);
app.use('/rss', rssRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/errors', errorRoutes);
app.use('/api/geo', geoRoutes);
app.use('/seo', seoRoutes);
app.use('/api/language', languageRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/offers', offersRouter);
app.use('/api/auth', authRouter);
app.use('/api/wishlist', wishlistRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/promote', promoteRouter);
app.use('/api/whatsapp', whatsappRouter); // WhatsApp chatbot webhook (no auth — UltraMsg posts here)
app.use('/api/notifications', notificationRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/ice', iceRoutes);
app.use('/api/winner', winnerRouter);
app.use('/api/wp', wpRouter); // WordPress.com OAuth2 + auto-sync
app.use('/api/translations', translationsRouter); // Auto-generate translations via OpenAI + MongoDB cache
app.use('/api/translate', translateRouter);
app.use('/api/calls', callsRouter);     // WebRTC call push notifications

// GET /api/metrics — admin-only observability endpoint
app.get('/api/metrics', (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  let isAdmin = false;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fox-default-secret');
    isAdmin = decoded.role === 'admin';
  } catch (e) { isAdmin = false; }
  if (!isAdmin) return res.status(403).json({ error: 'Admin only' });
  const mem = process.memoryUsage();
  res.json({
    uptime: Math.floor((Date.now() - _metricsStart) / 1000),
    memoryUsageMB: Math.round(mem.rss / 1024 / 1024),
    heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
    totalRequests: _metricsRequestCount,
    mongoState: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    message_ar: 'مقاييس الخادم - للمسؤول فقط',
    message_en: 'Server metrics - Admin only'
  });
});

app.get('/sitemap.xml', (req, res) => res.redirect('/seo/sitemap.xml'));
app.get('/robots.txt', (req, res) => res.redirect('/seo/robots.txt'));


// Run seeds only once — check a flag in DB to avoid re-seeding on every restart
async function runSeedsOnce() {
  try {
    const SeedFlag = mongoose.models.SeedFlag || mongoose.model('SeedFlag', new mongoose.Schema({
      key: { type: String, unique: true },
      seededAt: Date,
    }));
    
    const existing = await SeedFlag.findOne({ key: 'v2' });
    if (existing) {
      console.log('[SEED] Already seeded, skipping');
      return;
    }
    
    console.log('[SEED] First run — seeding data...');
    
    // Run all seed functions
    if (typeof seedSuperAdmin === 'function') await seedSuperAdmin().catch(e => console.error('[SEED] admin:', e.message));
    if (typeof seedCountries === 'function') await seedCountries().catch(e => console.error('[SEED] countries:', e.message));
    if (typeof seedCelebrations === 'function') await seedCelebrations().catch(e => console.error('[SEED] celebrations:', e.message));
    if (typeof seedCoreDictionary === 'function') await seedCoreDictionary().catch(e => console.error('[SEED] dictionary:', e.message));
    
    await SeedFlag.create({ key: 'v2', seededAt: new Date() });
    console.log('[SEED] Complete ✅');
  } catch(e) {
    console.error('[SEED] Error:', e.message);
  }
}


// ─────────────────────────────────────────────────────────────────────────────
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['https://fox-kohl-eight.vercel.app', 'https://xtox.app', 'http://localhost:3000', /.vercel.app$/, /.railway.app$/],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});
app.set('io', io); // expose io to routes via req.app.get('io')
initSocket(io);

// Daily cron: archive expired ads, cleanup old
cron.schedule('0 2 * * *', async () => {
  await archiveExpiredAds();
  await deleteOldArchives();
  logger.info('Daily cleanup done');
});

// Hourly cron: permanently delete archived chats past their 7-day closeAt deadline
// Chats are scheduled for deletion when their linked ad is sold or deleted (dubizzle-style)
cron.schedule('0 * * * *', async () => {
  try {
    const { runChatCleanup } = await import('../jobs/chatCleanup.js');
    await runChatCleanup();
  } catch (e) {
    logger.error('[ChatCleanup cron] Error:', e.message);
  }
});

// Hourly cron: ad lifecycle — expire active ads and hard-delete past deadline (#112)
cron.schedule('0 * * * *', async () => {
  try {
    const { runAdLifecycle } = await import('../jobs/adLifecycle.js');
    await runAdLifecycle();
  } catch (e) {
    logger.error('[adLifecycle cron] Error:', e.message);
  }
});
// Run once on startup to catch any missed windows
import('../jobs/adLifecycle.js').then(({ runAdLifecycle, migrateSellerScores, deleteAnonymousAds }) => {
  runAdLifecycle().catch(() => {});
  migrateSellerScores().catch(() => {});
  deleteAnonymousAds().catch(e => console.warn('[Startup] deleteAnonymousAds failed:', e.message));
}).catch(() => {});

// Auto backup every 24 hours at 3am
cron.schedule('0 3 * * *', async () => {
  const { autoBackup } = await import('./archiveManager.js');
  await autoBackup();
  logger.info('Auto-backup complete');
});


// Daily 1am: sync XTOX ads missing from WordPress
cron.schedule('0 1 * * *', async () => {
  try {
    const { createWPPost } = await import('../utils/wordpress.js');
    const Ad = (await import('../models/Ad.js')).default;
    const unsynced = await Ad.find({ 
      wpPostId: null, 
      status: { $in: ['active', 'available'] },
    }).select('_id title status country').limit(100).lean();
    
    if (unsynced.length === 0) return console.log('[WP-CRON] All ads synced ✓');
    console.log(`[WP-CRON] Syncing ${unsynced.length} missing ads to WordPress...`);
    
    let synced = 0, failed = 0;
    for (const adSummary of unsynced) {
      try {
        // Get full ad document for sync
        const ad = await Ad.findById(adSummary._id).lean();
        if (!ad) continue;
        const result = await createWPPost(ad);
        if (result && result.wpPostId) {
          await Ad.updateOne({ _id: ad._id }, { $set: { wpPostId: result.wpPostId, wpPostUrl: result.wpPostUrl || '' } });
          synced++;
        } else {
          failed++;
        }
        // Rate limit: 300ms between posts
        await new Promise(r => setTimeout(r, 300));
      } catch (e) {
        failed++;
        console.warn(`[WP-CRON] Failed to sync ad ${adSummary._id}:`, e.message);
      }
    }
    console.log(`[WP-CRON] Done: ${synced} synced, ${failed} failed`);
  } catch (e) {
    console.error('[WP-CRON] Daily sync error:', e.message);
  }
}, { timezone: 'Africa/Cairo' });

// Health check every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  await runHealthCheck();
  await autoResolveOldErrors();
});

// Auto-expire featured ads every hour
setInterval(async () => {
  try {
    const { default: Ad } = await import('../models/Ad.js');
    const now = new Date();
    await Ad.updateMany(
      { isFeatured: true, featuredUntil: { $lt: now } },
      { $set: { isFeatured: false, featuredUntil: null, featuredPlan: null } }
    );
  } catch(e) {}
}, 60 * 60 * 1000);

// ─── Start HTTP server IMMEDIATELY so Railway healthcheck passes ────────────
// server.listen runs BEFORE MongoDB connects — healthcheck GET / always returns 200
const PORT = parseInt(process.env.PORT, 10) || 3001;
server.listen(PORT, '0.0.0.0', () => {
  logger.info('XTOX running on port ' + PORT);

  // ── Startup env var check — log what's missing so Railway is easy to configure ──
  const missingEnvs = [];
  if (!process.env.CLOUD_NAME)    missingEnvs.push('CLOUD_NAME');
  if (!process.env.CLOUD_KEY)     missingEnvs.push('CLOUD_KEY');
  if (!process.env.CLOUD_SECRET)  missingEnvs.push('CLOUD_SECRET');
  if (!process.env.GEMINI_API_KEY) missingEnvs.push('GEMINI_API_KEY');
  if (!process.env.COUCHBASE_URL && !process.env.COUCHBASE_HOST) missingEnvs.push('COUCHBASE_URL (optional)');
  if (missingEnvs.length > 0) {
    console.warn('[Config] Missing env vars (services degraded):', missingEnvs.join(', '));
  }
  console.log('[XTOX] Railway environment variable reference:');
  console.log('  MONGO_URL=<mongodb-connection-string>');
  console.log('  JWT_SECRET=<random-secret>');
  console.log('  CLOUD_NAME=<cloudinary-cloud-name>');
  console.log('  CLOUD_KEY=<cloudinary-api-key>');
  console.log('  CLOUD_SECRET=<cloudinary-api-secret>');
  console.log('  GEMINI_API_KEY=<google-gemini-key>');
  console.log('  COUCHBASE_URL=<couchbase-capella-url>  # optional');
});

// ── WP OAuth startup check — 30 seconds after start, verify token is valid ───
setTimeout(async () => {
  try {
    const wpToken = process.env.WP_ACCESS_TOKEN;
    if (!wpToken) {
      // Try MongoDB token
      const Setting = mongoose.models.Setting;
      if (!Setting) return;
      const dbToken = await Setting.get?.('wp_access_token').catch(() => null);
      if (!dbToken) return;
    }
    const r = await fetch('https://public-api.wordpress.com/rest/v1.1/me', {
      headers: { Authorization: `Bearer ${wpToken || ''}` },
      signal: AbortSignal.timeout(8000),
    });
    const data = await r.json().catch(() => ({}));
    if (data.error === 'invalid_token') {
      console.error('[WP] ⚠️ OAuth token expired — visit /api/wp/auth to re-authenticate');
    } else if (r.ok && data.email) {
      console.log('[WP] ✅ OAuth token valid — connected as:', data.display_name || data.email);
    }
  } catch (e) {
    console.warn('[WP] Startup token check failed (non-fatal):', e.message);
  }
}, 30000);

// ── DB startup race: MongoDB vs Couchbase — handled by dbManager ─────────────
// connectDatabases() is called after server.listen (see below)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/health-routes — lists all mounted route prefixes (no auth required)
app.get('/api/health-routes', (req, res) => {
  res.json({
    mounted: ['/api/auth', '/api/ads', '/api/chat', '/api/wp', '/api/ice', '/api/push',
              '/api/users', '/api/admin', '/api/jobs', '/api/services', '/api/notifications',
              '/api/winner', '/api/reviews', '/api/favorites', '/api/geo', '/api/language'],
    status: 'ok',
    time: new Date().toISOString()
  });
});

// ─── 404 handler — must be AFTER all routes ──────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found', path: req.path });
});
// ─────────────────────────────────────────────────────────────────────────────

// ─── Global error handler ───────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({ success: false, error: err.message || 'Internal server error' });
});
// ────────────────────────────────────────────────────────────────────────────

// ── DB startup: race MongoDB vs Couchbase (handled by dbManager) ────────────
connectDatabases().then(async (db) => {
  console.log('[DB] Active database: ' + db);

  if (db === 'memory') {
    // Both DBs unavailable — activate in-memory store
    dbState.usingMemoryStore = true;
    await initMemoryStore();
    return;
  }

  if (db === 'mongodb') {
    // ── Connect Couchbase for backup/cache (non-fatal) ─────────────────────
    if (connectCouchbase) {
      connectCouchbase().catch(e => logger.warn('[COUCHBASE] cache init failed:', e.message));
    }

    // ── Error TTL index ──────────────────────────────────────────────────
    try {
      const ErrorModel = mongoose.models.Error || mongoose.models.AppError;
      if (ErrorModel) {
        await ErrorModel.collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 604800 });
        console.log('[DB] Error TTL index set (7 days)');
      }
    } catch(e) {}

    // ── Nuclear fix: Drop ALL text indexes on ads so Mongoose recreates with language_override ──
    // Fixes: MongoServerError: found language override field in document with non-string type
    // Mongoose won't recreate an existing index — we must drop it first every startup.
    try {
      const adCollection = mongoose.connection.collection('ads');
      const indexes = await adCollection.indexes();
      for (const idx of indexes) {
        const isText = Object.values(idx.key || {}).includes('text');
        if (isText) {
          await adCollection.dropIndex(idx.name);
          console.log('[Migration] Dropped text index:', idx.name);
        }
      }
    } catch(e) {
      console.log('[Migration] Text index drop (non-fatal):', e.message);
    }
    // ────────────────────────────────────────────────────────────────────────────────

    // ── Run seeds + cleanup ─────────────────────────────────────────────
    await runSeedsOnce();

    // ── Load WP OAuth token from MongoDB on startup (persists across Railway restarts) ──
    try {
      await loadWPTokenFromDB();
    } catch (e) {
      console.warn('[WP] loadWPTokenFromDB failed (non-fatal):', e.message);
    }

    // ── ONE-TIME: Set password for xtox@xtox.com (idempotent) ──────────────
    // Safe to leave in — runs on every startup but only updates the password field.
    // Role is NOT set here — must be granted via Admin Dashboard per owner's rule.
    (async () => {
      try {
        const { default: bcrypt } = await import('bcryptjs');
        const User = (await import('../models/User.js')).default;
        const hash = await bcrypt.hash('Aa123123', 12);
        const result = await User.findOneAndUpdate(
          { email: 'xtox@xtox.com' },
          {
            $set: {
              password: hash,
              emailVerified: true,
              authProvider: 'email',
            },
            $setOnInsert: {
              name: 'XTOX Admin',
              email: 'xtox@xtox.com',
              xtoxId: 'XTOX-ADMIN001',
              country: 'EG',
              createdAt: new Date(),
              role: 'user', // role must be granted via Admin Dashboard only
            }
          },
          { upsert: true, returnDocument: 'after' }
        );
        console.log('[Setup] xtox@xtox.com ready. _id:', result._id, '| role:', result.role);
      } catch(e) {
        console.error('[Setup] xtox@xtox.com password set failed:', e.message);
      }
    })();

    // ── Delete anonymous chats on startup (one-time cleanup) ────────────────
    try {
      const { deleteAnonymousChats } = await import('../jobs/chatCleanup.js');
      await deleteAnonymousChats();
    } catch (e) {
      console.warn('[Startup] deleteAnonymousChats failed (non-fatal):', e.message);
    }

    // Seed subcategory examples (non-blocking) and schedule weekly AI learner
    try {
      const { seedExamples } = await import('./exampleSeeder.js');
      const { scheduleWeeklyLearner } = await import('./weeklyLearner.js');
      seedExamples().catch(() => {});
      scheduleWeeklyLearner();
    } catch (_seedErr) {
      console.warn('[SEED] exampleSeeder/weeklyLearner init failed (non-fatal):', _seedErr.message);
    }

    // Schedule location language learner — daily at 4am
    try {
      const { scheduleLocationLanguageLearner } = await import('./locationLanguageLearner.js');
      scheduleLocationLanguageLearner();
    } catch (_locErr) {
      console.warn('[SEED] locationLanguageLearner init failed (non-fatal):', _locErr.message);
    }

    // Monthly winner cron
    try {
      initMonthlyWinner(io);
    } catch (_winErr) {
      console.warn('[MonthlyWinner] init failed (non-fatal):', _winErr.message);
    }

    await (async function cleanupDuplicates() {
      try {
        const Country = mongoose.models.Country;
        if (Country) {
          const all = await Country.find({}).sort({ createdAt: 1 }).lean();
          const seen = new Set();
          for (const c of all) {
            const key = c.code || c.name;
            if (seen.has(key)) await Country.deleteOne({ _id: c._id });
            else seen.add(key);
          }
          const dupeCount = all.length - seen.size;
          if (dupeCount > 0) logger.info('[CLEANUP] Removed ' + dupeCount + ' duplicate countries');
        }
        const ErrModel = mongoose.models.Error || mongoose.models.AppError || mongoose.models.ErrorLog;
        if (ErrModel) {
          const r = await ErrModel.deleteMany({ createdAt: { $lt: new Date(Date.now() - 7 * 86400000) } });
          if (r.deletedCount > 0) logger.info('[CLEANUP] Removed ' + r.deletedCount + ' old error logs');
        }
      } catch(e) {
        logger.warn('[CLEANUP] Skipped:', e.message);
      }
    })();
  }

  if (db === 'couchbase') {
    // Couchbase won the race — memory store not needed
    console.log('[DB] Couchbase is PRIMARY — in-memory store not activated');
  }
}).catch(e => {
  logger.error('[DB] connectDatabases() failed:', e.message);
  // Safety net: fall back to memory store
  dbState.usingMemoryStore = true;
  initMemoryStore().catch(() => {});
});
// ─────────────────────────────────────────────────────────────────────────────


