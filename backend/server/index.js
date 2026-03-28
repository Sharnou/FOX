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
import { initSocket } from './socket.js';
import { archiveExpiredAds, deleteOldArchives } from './archiveManager.js';
import { seedCountries } from './countries.js';
import { seedCelebrations } from './celebrations.js';
import { seedCoreDictionary } from './languageLearner.js';
import { runHealthCheck, autoResolveOldErrors } from './healthMonitor.js';

// Routes
import userRoutes from '../routes/users.js';
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

const logger = pino();
const app = express();
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
    p.startsWith('/api/errors')
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
app.get('/sitemap.xml', (req, res) => res.redirect('/seo/sitemap.xml'));
app.get('/robots.txt', (req, res) => res.redirect('/seo/robots.txt'));
app.get('/', (_, res) => {
  const connState = mongoose.connection.readyState;
  const stateNames = ['disconnected','connected','connecting','disconnecting'];
  res.json({
    status: 'XTOX Backend v2.0 ✅',
    time: new Date().toISOString(),
    admin: 'ahmed_sharnou@yahoo.com / Aa123123',
    env: {
      mongoConnected: connState === 1,
      mongoState: stateNames[connState] || 'unknown',
      mongoUriSource: process.env.MONGO_URL ? 'MONGO_URL ✅' :
                      process.env.MONGO_URI ? 'MONGO_URI' :
                      process.env.MONGODB_URL ? 'MONGODB_URL' :
                      process.env.MONGOURL ? 'MONGOURL' :
                      process.env.MONGO_PUBLIC_URL ? 'MONGO_PUBLIC_URL' :
                      process.env.MONGOHOST ? 'CONSTRUCTED' :
                      'NOT SET ❌',
      jwtSet: !!process.env.JWT_SECRET,
      frontendUrl: process.env.FRONTEND_URL || 'not set'
    }
  });
});

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

// Last resort: use Atlas even though it may be IP-blocked
if (!mongoUri) {
  mongoUri = process.env.MONGO_URI || null;
  if (mongoUri) logger.warn('[MongoDB] Using Atlas URL - may be IP blocked. Add MONGO_URL to Railway!');
}

const finalMongoUri = mongoUri;

if (!finalMongoUri) {
  logger.warn('⚠️ No MongoDB URI found. Set MONGO_URL in Railway environment variables.');
} else {
  logger.info('MongoDB URI: ' + finalMongoUri.replace(/:([^@]+)@/, ':***@'));
  mongoose.connect(finalMongoUri)
    .then(async () => {
    logger.info('MongoDB connected');
    await seedCountries();
    await seedCelebrations();
    const { seedSuperAdmin } = await import('../routes/users.js');
    await seedSuperAdmin();
    await seedCoreDictionary();
  })
  .catch(err => logger.error('MongoDB connection failed:', err.message));
}

server.listen(process.env.PORT || 3000, () => logger.info(`XTOX running on port ${process.env.PORT || 3000}`));
