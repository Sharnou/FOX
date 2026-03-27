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

const logger = pino();
const app = express();
app.use(cors());
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
app.get('/', (_, res) => res.send('XTOX Backend v2.0 ✅'));

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

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    logger.info('MongoDB connected');
    await seedCountries();
    await seedCelebrations();
    const { seedSuperAdmin } = await import('../routes/users.js');
    await seedSuperAdmin();
  })
  .catch(err => logger.error(err));

server.listen(process.env.PORT || 3000, () => logger.info(`XTOX running on port ${process.env.PORT || 3000}`));
