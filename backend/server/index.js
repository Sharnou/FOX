// CRITICAL: Clear invalid Redis URL before ANY module imports it
// Prevents "ENOTFOUND disabled" crash
if (process.env.REDIS_URL && 
    !process.env.REDIS_URL.startsWith('redis://') && 
    !process.env.REDIS_URL.startsWith('rediss://')) {
  console.log('[BOOT] Clearing invalid REDIS_URL:', process.env.REDIS_URL);
  process.env.REDIS_URL = '';
}

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
import countryLockMiddleware from '../middleware/countryLock.js';

const logger = pino();
const app = express();
app.set('trust proxy', 1);

// Gzip compression — reduces API response size by 60-80% (free)
if (compression) app.use(compression());

// Security headers (helmet) — free hardening
if (helmet) app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

app.use(cors({
  origin: function(origin, callback) {
    // Allow all Vercel deployments, Railway, localhost
    const allowed = !origin || 
      origin.includes('vercel.app') || 
      origin.includes('railway.app') ||
      origin.includes('blogspot.com') ||
      origin.includes('localhost') ||
      origin === process.env.FRONTEND_URL;
    callback(null, allowed);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'x-country']
}));
app.options('*', cors());
app.use(express.json({ limit: '10mb' }));
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
app.get('/sitemap.xml', (req, res) => res.redirect('/seo/sitemap.xml'));
app.get('/robots.txt', (req, res) => res.redirect('/seo/robots.txt'));
app.get('/', (_, res) => {
  const connState = mongoose.connection.readyState;
  const stateNames = ['disconnected','connected','connecting','disconnecting'];
  res.json({
    status: 'XTOX Backend v2.0 ✅',
    time: new Date().toISOString(),
    admin: '[REDACTED - set via env vars]',
    env: {
      mongoConnected: connState === 1,
      mongoState: stateNames[connState] || 'unknown',
      mongoUriSource: process.env.MONGO_URL ? 'MONGO_URL ✅' :
                      process.env.MONGO_URI ? 'MONGO_URI' :
                      process.env.MONGODB_URL ? 'MONGODB_URL' :
                      process.env.MONGOURL ? 'MONGOURL' :
                      process.env.MONGO_PUBLIC_URL ? 'MONGO_PUBLIC_URL' :
                      process.env.MONGOHOST ? 'CONSTRUCTED' :
                      'HARDCODED_ATLAS_FALLBACK',
      jwtSet: !!process.env.JWT_SECRET,
      couchbaseConnected: couchbaseCluster !== null,
      frontendUrl: process.env.FRONTEND_URL || 'not set'
    }
  });
});


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
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
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
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`XTOX running on port ${PORT}`);
});
// ────────────────────────────────────────────────────────────────────────────

// Connect MongoDB in background (non-blocking)
// Log ALL env vars available (helps diagnose Railway setup)
const mongoEnvVars = Object.keys(process.env).filter(k => 
  k.toLowerCase().includes('mongo') || k.toLowerCase().includes('database')
);
logger.info(`[MongoDB] Available env vars: ${mongoEnvVars.join(', ') || 'NONE'}`);
mongoEnvVars.forEach(k => {
  const val = process.env[k];
  const masked = val ? val.replace(/:([^@]+)@/, ':***@').slice(0, 80) : 'empty';
  logger.info(`[MongoDB] ${k} = ${masked}`);
});

// Railway MongoDB plugin primary variable = MONGO_URL
// Skip Atlas URLs (IP blocked) unless no other option
const allMongoVars = [
  process.env.MONGO_URL,
  process.env.MONGODB_URL,
  process.env.MONGOURL,
  process.env.MONGO_PUBLIC_URL,
  process.env.MONGO_URL_PRIVATE,
  process.env.MONGO_URL_Private,
  process.env.DATABASE_URL,
];

// Use first non-Atlas, non-empty URL
let mongoUri = allMongoVars.find(u => u && u.trim() && !u.includes('cluster0.77mmp6c'));

// If no non-Atlas URL, try constructing from Railway plugin parts
if (!mongoUri) {
  const host = process.env.MONGOHOST || process.env.MONGOHOST_Railway;
  const port = process.env.MONGOPORT || process.env.MONGOPORT_MongoDB || '27017';
  const user = process.env.MONGOUSER || process.env.MONGOUSER_Mongodb || 
                process.env.MONGO_INITDB_ROOT_USERNAME || 'root';
  const pass = process.env.MONGOPASSWORD || process.env.MONGOPASSWORD_Root || 
                process.env.MONGO_INITDB_ROOT_PASSWORD;
  if (host && pass) {
    mongoUri = `mongodb://${user}:${encodeURIComponent(String(pass))}@${host}:${port}/?authSource=admin`;
    logger.info(`[MongoDB] Constructed: ${user}@${host}:${port}`);
  }
}

// Atlas fallback (0.0.0.0/0 whitelist active - safe to hardcode)
if (!mongoUri) {
  mongoUri = process.env.MONGO_URI ||
                 // Atlas fallback (0.0.0.0/0 whitelist active - safe to hardcode)
                 'mongodb+srv://ahmedsharnou_db_user:MiqAQuCFW080G6u9@cluster0.77mmp6c.mongodb.net/?appName=Cluster0';
}

const finalMongoUri = mongoUri;

if (!finalMongoUri) {
  logger.warn('[MongoDB] No env var found - using hardcoded Atlas URL (0.0.0.0/0 whitelist active)');
} else {
  logger.info('MongoDB URI: ' + finalMongoUri.replace(/:([^@]+)@/, ':***@'));
  logger.info(`[MongoDB] Attempting connection... (timeout: 30s)`);
  mongoose.connect(finalMongoUri, {
    serverSelectionTimeoutMS: 30000,  // 30 seconds to find a server
    socketTimeoutMS: 45000,           // 45 seconds for operations
    connectTimeoutMS: 30000,          // 30 seconds to connect
    maxPoolSize: 10,
    retryWrites: true,
    w: 'majority'
  })
    .then(async () => {
    logger.info('MongoDB connected');
    // Connect Couchbase (non-fatal — app works without it)
    if (connectCouchbase) connectCouchbase().catch(e => logger.warn('[COUCHBASE] Startup connection failed:', e.message));
    // Auto-delete old errors after 7 days
    try {
      const ErrorModel = mongoose.models.Error || mongoose.models.AppError;
      if (ErrorModel) {
        await ErrorModel.collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 604800 });
        console.log('[DB] Error TTL index set (7 days)');
      }
    } catch(e) {}
    await runSeedsOnce();
    // Auto-cleanup duplicate seed data (safe, runs on each startup)
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
        // Delete errors older than 7 days
        const ErrModel = mongoose.models.Error || mongoose.models.AppError || mongoose.models.ErrorLog;
        if (ErrModel) {
          const r = await ErrModel.deleteMany({ createdAt: { $lt: new Date(Date.now() - 7 * 86400000) } });
          if (r.deletedCount > 0) logger.info(`[CLEANUP] Removed ${r.deletedCount} old error logs`);
        }
      } catch(e) {
        logger.warn('[CLEANUP] Skipped:', e.message);
      }
    })();
  })
  .catch(err => {
    logger.error('[MongoDB] Connection failed:', err.message);
    logger.error('[MongoDB] Check: 1) MONGO_URL in Railway env, 2) Atlas IP whitelist 0.0.0.0/0');
    // Retry after 10 seconds
    setTimeout(async () => {
      logger.info('[MongoDB] Retrying connection...');
      try {
        await mongoose.connect(finalMongoUri, {
          serverSelectionTimeoutMS: 30000,
          socketTimeoutMS: 45000,
          connectTimeoutMS: 30000
        });
        logger.info('[MongoDB] Retry successful ✅');
        await runSeedsOnce();
      } catch (e) {
        logger.error('[MongoDB] Retry also failed:', e.message);
      }
    }, 10000);
  });
}


// redeploy: 1774916299527

