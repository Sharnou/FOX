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
      mongoUriSource: process.env.MONGO_URI ? 'MONGO_URI' :
                      process.env.MONGODB_URL ? 'MONGODB_URL' :
                      process.env.MONGOURL ? 'MONGOURL' :
                      process.env.MONGO_PUBLIC_URL ? 'MONGO_PUBLIC_URL' :
                      process.env.MONGO_URL_Private ? 'MONGO_URL_Private' :
                      'HARDCODED_ATLAS',
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

// MongoDB — graceful startup even if URI missing
// ─── Gemini/Railway-advised connection strategy ───
// Railway MongoDB plugin injects MONGOURL (full private URL) automatically.
// Private format: mongodb://root:PASS@hostname.railway.internal:27017
// Public format:  mongodb://root:PASS@roundhouse.proxy.rlwy.net:PORT

// Try full URL env vars first (Railway injects MONGOURL and MONGO_URL_Private)
let mongoUri = process.env.MONGO_URI ||
               process.env.MONGOURL ||           // Railway auto-injects this as full URL
               process.env.MONGO_URL_Private ||  // Railway private URL (Railway naming)
               process.env.MONGO_URL_PRIVATE ||
               process.env.MONGODB_URL ||
               process.env.MONGO_PUBLIC_URL ||
               process.env.DATABASE_URL ||
               process.env.MONGO_URL;

// If no full URL, construct from Railway MongoDB plugin individual variables
// Railway variable names (with Railway plugin suffixes): MONGOHOST_Railway, etc.
if (!mongoUri) {
  const host = process.env.MONGOHOST ||
               process.env.MONGOHOST_Railway;
  const port = process.env.MONGOPORT ||
               process.env.MONGOPORT_MongoDB || '27017';
  const user = process.env.MONGOUSER ||
               process.env.MONGOUSER_Mongodb ||
               process.env.MONGO_INITDB_ROOT_USERNAME || 'root';
  const pass = process.env.MONGOPASSWORD ||
               process.env.MONGOPASSWORD_Root ||
               process.env.MONGO_INITDB_ROOT_PASSWORD;

  if (host && pass) {
    // authSource=admin required for root user in Railway MongoDB
    mongoUri = `mongodb://${user}:${encodeURIComponent(pass)}@${host}:${port}/?authSource=admin`;
    logger.info(`[MongoDB] Constructed from components: ${user}@${host}:${port} (authSource=admin)`);
  }
}

// Log all available MongoDB env vars for debugging
logger.info('[MongoDB] Available env vars: ' + [
  'MONGO_URI','MONGOURL','MONGO_URL_Private','MONGO_URL_PRIVATE','MONGODB_URL',
  'MONGO_PUBLIC_URL','MONGOHOST','MONGOHOST_Railway','MONGOPORT','MONGOPORT_MongoDB',
  'MONGOUSER','MONGOUSER_Mongodb','MONGOPASSWORD','MONGO_INITDB_ROOT_PASSWORD'
].filter(k => process.env[k]).join(', ') || 'NONE');

logger.info(`[MongoDB] Using URI from: ${
  process.env.MONGO_URI ? 'MONGO_URI' :
  process.env.MONGOURL ? 'MONGOURL' :
  process.env.MONGO_URL_Private ? 'MONGO_URL_Private' :
  process.env.MONGO_URL_PRIVATE ? 'MONGO_URL_PRIVATE' :
  process.env.MONGODB_URL ? 'MONGODB_URL' :
  process.env.MONGO_PUBLIC_URL ? 'MONGO_PUBLIC_URL' :
  process.env.MONGOHOST ? 'CONSTRUCTED_FROM_COMPONENTS' :
  process.env.MONGOHOST_Railway ? 'CONSTRUCTED_FROM_RAILWAY_COMPONENTS' :
  'NONE_FOUND — set MONGOURL in Railway'
}`);

if (!mongoUri) {
  logger.warn('⚠️ No MongoDB URI found. Set MONGO_URI or connect Railway MongoDB plugin.');
} else {
  logger.info('MongoDB URI found: ' + mongoUri.replace(/:([^@]+)@/, ':***@'));
  mongoose.connect(mongoUri)
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
