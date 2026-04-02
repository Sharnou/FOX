import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Ad from '../models/Ad.js';
import Report from '../models/Report.js';
import AILog from '../models/AILog.js';
import { adminAuth, superAdminAuth } from '../middleware/auth.js';
import { createBackup } from '../server/backup.js';
import { sendWeeklyBroadcast } from '../server/broadcast.js';
import { requestRepair, approveRepair, executeRepair } from '../server/aiRepair.js';
import { detectCategoryOffline } from '../server/offlineDict.js';

const router = express.Router();

router.get('/users', adminAuth, async (req, res) => {
  res.json(await User.find().sort({ createdAt: -1 }).limit(200));
});
router.get('/ads', adminAuth, async (req, res) => {
  res.json(await Ad.find().sort({ createdAt: -1 }).limit(200));
});
router.get('/reports', adminAuth, async (req, res) => {
  res.json(await Report.find({ resolved: false }).sort({ createdAt: -1 }));
});
router.get('/deleted', adminAuth, async (req, res) => {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  res.json(await Ad.find({ isDeleted: true, deletedAt: { $gte: cutoff } }));
});
router.post('/ban', adminAuth, async (req, res) => {
  const { id, hours } = req.body;
  await User.findByIdAndUpdate(id, { isBanned: true, banExpiresAt: hours ? new Date(Date.now() + hours * 3600000) : null });
  res.json({ ok: true });
});
router.post('/mute', adminAuth, async (req, res) => {
  await User.findByIdAndUpdate(req.body.id, { isMuted: req.body.mute });
  res.json({ ok: true });
});
router.post('/hide-user', adminAuth, async (req, res) => {
  await User.findByIdAndUpdate(req.body.id, { isHidden: req.body.hide });
  res.json({ ok: true });
});
router.post('/rank-ad', adminAuth, async (req, res) => {
  await Ad.findByIdAndUpdate(req.body.adId, { visibilityScore: req.body.score });
  res.json({ ok: true });
});
router.post('/feature', adminAuth, async (req, res) => {
  const { adId, style } = req.body;

  // Get the ad to check its country
  const ad = await Ad.findById(adId);
  if (!ad) return res.status(404).json({ error: 'Ad not found' });

  // Enforce max 16 featured per week per country
  const { countFeaturedThisWeek } = await import('../server/featuredManager.js');
  const count = await countFeaturedThisWeek(ad.country);
  if (count >= 16) return res.status(400).json({ error: `Max 16 featured ads per week reached for ${ad.country}` });

  await Ad.findByIdAndUpdate(adId, {
    isFeatured: true,
    featuredStyle: style || 'normal',
    featuredAt: new Date(), // timestamp for sorting new→top
    featuredUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });
  res.json({ ok: true, weeklyCount: count + 1 });
});
router.post('/promote-user', superAdminAuth, async (req, res) => {
  await User.findByIdAndUpdate(req.body.id, { role: req.body.role });
  res.json({ ok: true });
});
router.post('/broadcast', adminAuth, async (req, res) => {
  try { const b = await sendWeeklyBroadcast(req.user.id, req.body.message); res.json(b); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
router.post('/backup', adminAuth, async (req, res) => {
  try { const path = await createBackup(); res.download(path); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/fix-categories', adminAuth, async (req, res) => {
  const ads = await Ad.find({ isExpired: false, isDeleted: false });
  let fixed = 0;
  for (const ad of ads) {
    const det = detectCategoryOffline(`${ad.title} ${ad.description || ''}`);
    if (det.main !== 'General' && ad.category !== det.main) {
      ad.category = det.main; ad.subcategory = det.sub; ad.fixedByAI = true;
      await ad.save(); fixed++;
    }
  }
  res.json({ fixed });
});
router.post('/ai-repair/request', adminAuth, async (req, res) => {
  const log = await requestRepair(req.body.problem, req.user.id);
  res.json(log);
});
router.post('/ai-repair/approve/:id', superAdminAuth, async (req, res) => {
  await approveRepair(req.params.id);
  const result = await executeRepair(req.params.id);
  res.json(result);
});
router.get('/ai-logs', adminAuth, async (req, res) => {
  res.json(await AILog.find().sort({ createdAt: -1 }).limit(50));
});
router.post('/create-simulation', superAdminAuth, async (req, res) => {
  const { name, country, avatar } = req.body;
  const user = await User.create({ name, country: country || 'EG', avatar, isSimulation: true, email: `sim_${Date.now()}@xtox.internal` });
  res.json(user);
});


// PROTECTED: never touch language/locale/dictionary collections
// PROTECTED collections — never delete or modify
const PROTECTED_COLLECTIONS = ['coredictionaries', 'dialectdictionaries', 'languages', 'locales', 'seedflags', 'languagelearners'];

// Admin-only: clean duplicate seed data (run once to fix the 115MB bloat)
router.post('/cleanup-duplicates', adminAuth, async (req, res) => {
  try {
    const results = {};
    
    // Remove duplicate countries (keep only one per code)
    const Country = mongoose.models.Country;
    if (Country) {
      const countries = await Country.find({});
      const seen = new Set();
      let deleted = 0;
      for (const c of countries) {
        const key = c.code || c.name;
        if (seen.has(key)) { await Country.deleteOne({ _id: c._id }); deleted++; }
        else seen.add(key);
      }
      results.countries = deleted;
    }
    
    // Remove errors older than 7 days (NEVER touch language collections)
    const ErrorModel = mongoose.models.Error || mongoose.models.AppError;
    if (ErrorModel) {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const r = await ErrorModel.deleteMany({ createdAt: { $lt: cutoff } });
      results.errors = r.deletedCount;
    }
    
    res.json({ success: true, cleaned: results, protected: PROTECTED_COLLECTIONS });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});
export default router;
