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
app.get('/', (_, res) => res.json({
  status: 'XTOX Backend v2.0 ✅',
  time: new Date().toISOString(),
  admin: 'ahmed_sharnou@yahoo.com / Aa123123',
  env: {
    mongoConnected: !!(process.env.MONGO_URI || process.env.MONGODB_URL || process.env.MONGOURL || process.env.MONGO_PUBLIC_URL || process.env.DATABASE_URL || process.env.MONGO_URL),
    mongoUriSource: process.env.MONGO_URI ? 'MONGO_URI' : process.env.MONGODB_URL ? 'MONGODB_URL' : process.env.MONGOURL ? 'MONGOURL' : process.env.MONGO_PUBLIC_URL ? 'MONGO_PUBLIC_URL' : process.env.MONGO_URL_PRIVATE ? 'MONGO_URL_PRIVATE' : process.env.MONGO_URL_Private ? 'MONGO_URL_Private' : 'NOT SET',
    jwtSet: !!process.env.JWT_SECRET,
    frontendUrl: process.env.FRONTEND_URL || 'not set'
  }
}));

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
// Try multiple MongoDB env var names (Atlas, Railway plugin, etc.)
const mongoUri = process.env.MONGO_URI || 
                 process.env.MONGODB_URL || 
                 process.env.MONGOURL ||
                 process.env.MONGO_PUBLIC_URL ||
                 process.env.MONGO_URL_PRIVATE ||
                 process.env.MONGO_URL_Private ||
                 process.env.DATABASE_URL ||
                 process.env.MONGO_URL ||
                 // Last resort: hardcoded Atlas (add MONGO_URI to Railway to override)
                 'mongodb+srv://ahmedsharnou_db_user:MiqAQuCFW080G6u9@cluster0.77mmp6c.mongodb.net/?appName=Cluster0';

logger.info(`[MongoDB] Trying URI from: ${
  process.env.MONGO_URI ? 'MONGO_URI' :
  process.env.MONGODB_URL ? 'MONGODB_URL' :
  process.env.MONGOURL ? 'MONGOURL' :
  process.env.MONGO_PUBLIC_URL ? 'MONGO_PUBLIC_URL' :
  process.env.DATABASE_URL ? 'DATABASE_URL' :
  process.env.MONGO_URL ? 'MONGO_URL' :
  process.env.MONGO_URL_PRIVATE ? 'MONGO_URL_PRIVATE' :
  'NONE FOUND'
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
