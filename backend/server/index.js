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
import reviewsRouter from '../routes/reviews.js';
import favoritesRouter from '../routes/favorites.js';
import promoteRouter from '../routes/promote.js';
import notificationRoutes from '../routes/notifications.js';
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
  'https://xtox-production.up.railway.app',
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
  allowedHeaders: ['Content-Type','Authorization','Accept','x-country','x-refresh-token'],
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // preflight for all routes



// Gzip compression — reduces API response size by 60-80% (free)
if (compression) app.use(compression());

// Security headers (helmet) — free hardening
if (helmet) app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false, crossOriginResourcePolicy: false }));

app.use(express.json({ limit: '10mb' }));

// ─── Health route FIRST — must respond immediately for Railway healthcheck ────
app.get('/api/health', (_, res) => {
  const connState = mongoose.connection.readyState;
  const stateNames = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    db: stateNames[connState] || 'unknown',
    mongoConnected: connState === 1,
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (_, res) => {
  const connState = mongoose.connection.readyState;
  const stateNames = ['disconnected','connected','connecting','disconnecting'];
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
app.use('/api/wishlist', wishlistRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/promote', promoteRouter);
app.use('/api/notifications', notificationRoutes);

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

// ── FIX 1: Seed xtox admin user on startup ───────────────────────────────
async function seedXtoxAdmin() {
  try {
    const UserModel = mongoose.models.User || (await import('../models/User.js')).default;
    const bcrypt = await import('bcryptjs');
    const existing = await UserModel.findOne({ username: 'xtox' });
    if (!existing) {
      const hash = await bcrypt.default.hash('xtoxxtox', 10);
      const admin = new UserModel({
        username: 'xtox',
        email: 'xtox@xtox.com',
        password: hash,
        role: 'admin',
        chatEnabled: true,
        name: 'XTOX Admin',
        country: 'EG',
        city: 'Cairo',
      });
      await admin.save();
      console.log('[Seed] Admin user created: xtox / xtoxxtox');
    } else {
      console.log('[Seed] Admin xtox already exists');
    }
  } catch (e) {
    console.error('[Seed] Admin seed failed:', e.message);
  }
}

// ── Seed fake ad on first startup ───────────────────────────────────────────
async function seedFakeAd() {
  try {
    const AdModel = mongoose.models.Ad || (await import('../models/Ad.js')).default;
    const UserModel = mongoose.models.User || (await import('../models/User.js')).default;
    
    // Check if fake ad already seeded
    const existing = await AdModel.findOne({ username: 'xtox_seed', isDeleted: { $ne: true } });
    if (existing) {
      console.log('[Seed] Fake ad already exists:', existing._id.toString());
      return;
    }
    
    // Get xtox admin user (or any user) to assign as owner
    const owner = await UserModel.findOne({ username: 'xtox' });
    if (!owner) {
      console.log('[Seed] Skipping fake ad — xtox user not found yet');
      return;
    }
    
    const ad = await AdModel.create({
      title: 'iPhone 15 Pro — بحالة ممتازة',
      description: 'آيفون 15 برو، لون تيتانيوم طبيعي، سعة 256 جيجابايت. استخدام خفيف جداً، يأتي مع الكرتونة الأصلية وجميع الملحقات. بدون خدوش. السعر قابل للتفاوض بشكل محدود.',
      price: 3500,
      currency: 'EGP',
      category: 'electronics',
      media: ['https://images.unsplash.com/photo-1696446701796-da61225697cc?w=600'],
      userId: owner._id,
      username: 'xtox_seed',
      isFeatured: true,
      featuredStyle: 'gold',
      isDeleted: { $ne: true },
      isExpired: { $ne: true },
      views: 42,
      country: 'EG',
      city: 'Cairo',
      visibilityScore: 10,
      status: 'active',
      expiresAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    });
    console.log('[Seed] Fake ad inserted, ID:', ad._id.toString());
  } catch (e) {
    console.error('[Seed] Fake ad seed failed:', e.message);
  }
}
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['https://fox-kohl-eight.vercel.app', 'http://localhost:3000', /\.vercel\.app$/, /\.railway\.app$/],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});
initSocket(io);

// Daily cron: archive expired ads, cleanup old
cron.schedule('0 2 * * *', async () => {
  await archiveExpiredAds();
  await deleteOldArchives();
  logger.info('Daily cleanup done');
});

// Auto backup every 24 hours at 3am
cron.schedule('0 3 * * *', async () => {
  const { autoBackup } = await import('./archiveManager.js');
  await autoBackup();
  logger.info('Auto-backup complete');
});

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
  logger.info(`XTOX running on port ${PORT}`);

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
// ────────────────────────────────────────────────────────────────────────────

// ── DB startup race: MongoDB vs Couchbase — handled by dbManager ─────────────
// connectDatabases() is called after server.listen (see below)
// ─────────────────────────────────────────────────────────────────────────────

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
  console.log(`[DB] Active database: ${db}`);

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

    // ── Run seeds + cleanup ─────────────────────────────────────────────
    await runSeedsOnce();
    await seedXtoxAdmin();
    await seedFakeAd();
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
          if (dupeCount > 0) logger.info(`[CLEANUP] Removed ${dupeCount} duplicate countries`);
        }
        const ErrModel = mongoose.models.Error || mongoose.models.AppError || mongoose.models.ErrorLog;
        if (ErrModel) {
          const r = await ErrModel.deleteMany({ createdAt: { $lt: new Date(Date.now() - 7 * 86400000) } });
          if (r.deletedCount > 0) logger.info(`[CLEANUP] Removed ${r.deletedCount} old error logs`);
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


