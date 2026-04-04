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
  try {
    // Bilingual labels — Arabic (primary) / English
    const LABELS = {
      invalidPage:   { ar: 'رقم الصفحة غير صالح',          en: 'Invalid page number' },
      invalidLimit:  { ar: 'حد السجلات غير صالح (1-50)',    en: 'Invalid limit value (1-50)' },
      serverError:   { ar: 'خطأ في الخادم',                 en: 'Server error' },
    };

    // Parse & validate query params
    const rawPage  = parseInt(req.query.page,  10);
    const rawLimit = parseInt(req.query.limit, 10);

    const page  = isNaN(rawPage)  || rawPage  < 1 ? 1  : rawPage;
    const limit = isNaN(rawLimit) || rawLimit < 1 ? 20 : Math.min(rawLimit, 50);

    if (req.query.page  && (isNaN(rawPage)  || rawPage  < 1))
      return res.status(400).json({ error: LABELS.invalidPage.ar, error_en: LABELS.invalidPage.en });
    if (req.query.limit && (isNaN(rawLimit) || rawLimit < 1 || rawLimit > 50))
      return res.status(400).json({ error: LABELS.invalidLimit.ar, error_en: LABELS.invalidLimit.en });

    const skip = (page - 1) * limit;

    // Build filter — default: unresolved only
    const filter = {};

    // ?resolved=true|false  (default → false)
    if (req.query.resolved === 'true')       filter.resolved = true;
    else if (req.query.resolved === 'false') filter.resolved = false;
    else                                      filter.resolved = false;

    // ?type=ad|seller  — filter by report type
    if (req.query.type && ['ad', 'seller'].includes(req.query.type)) {
      filter.type = req.query.type;
    }

    // ?q=searchTerm  — search by reporter email OR reported ad title
    if (req.query.q && req.query.q.trim()) {
      const q     = req.query.q.trim();
      const regex = new RegExp(q, 'i');

      // Parallel: find matching users (by email) and ads (by title)
      const [matchingUsers, matchingAds] = await Promise.all([
        User.find({ email: regex }, '_id').lean(),
        Ad.find({ title: regex },   '_id').lean(),
      ]);

      const orClauses = [];
      if (matchingUsers.length) orClauses.push({ reportedBy: { $in: matchingUsers.map(u => u._id) } });
      if (matchingAds.length)   orClauses.push({ adId:       { $in: matchingAds.map(a => a._id)   } });

      // No matches at all → return empty result immediately
      if (!orClauses.length) {
        return res.json({
          reports: [], page, totalPages: 1, total: 0,
          labels: { page: 'الصفحة', totalPages: 'إجمالي الصفحات', total: 'الإجمالي' },
          filter: { q, resolved: filter.resolved, type: req.query.type || null },
        });
      }

      // Merge $or with existing filter using $and
      filter.$and = [{ $or: orClauses }];
    }

    const [reports, total] = await Promise.all([
      Report.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Report.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    res.json({
      reports,
      // Bilingual pagination metadata
      page,
      totalPages,
      total,
      // Arabic labels for frontend
      labels: { page: 'الصفحة', totalPages: 'إجمالي الصفحات', total: 'الإجمالي' },
      // Active filters echoed back for frontend awareness
      filter: {
        q:        req.query.q    || null,
        type:     req.query.type || null,
        resolved: filter.resolved,
      },
    });
  } catch (e) {
    res.status(500).json({ error: 'خطأ في الخادم', error_en: 'Server error', details: e.message });
  }
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

router.post('/fix-all-ads', adminAuth, async (req, res) => {
  try {
    const result = await Ad.updateMany(
      { $or: [{ visibilityScore: { $lte: 0 } }, { visibilityScore: null }] },
      { $set: { visibilityScore: 10, status: 'active' } }
    );
    res.json({ updated: result.modifiedCount, message: 'All ads visibility fixed' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
