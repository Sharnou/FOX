import Review from '../models/Review.js';
import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Ad from '../models/Ad.js';
import Report from '../models/Report.js';
import AILog from '../models/AILog.js';
import Setting from '../models/Setting.js';
import { generateAIImage } from '../utils/aiImage.js';
import { adminAuth, superAdminAuth } from '../middleware/auth.js';
import { dbState, MemAd, MemUser, MemReport } from '../server/memoryStore.js';
import { syncCountryPages } from '../utils/wpMigration.js';
import { getActiveDB } from '../server/dbManager.js';
import { CouchbaseAd, CouchbaseUser, CouchbaseReport } from '../server/couchbaseModels.js';

// Smart model selector: MongoDB → Couchbase → in-memory
function getAdModel() {
  const db = getActiveDB();
  if (db === 'mongodb')   return Ad;
  if (db === 'couchbase') return CouchbaseAd;
  return MemAd;
}
function getUserModel() {
  const db = getActiveDB();
  if (db === 'mongodb')   return User;
  if (db === 'couchbase') return CouchbaseUser;
  return MemUser;
}
function getReportModel() {
  const db = getActiveDB();
  if (db === 'mongodb')   return Report;
  if (db === 'couchbase') return CouchbaseReport;
  return MemReport;
}
import { createBackup } from '../server/backup.js';
import { sendWeeklyBroadcast } from '../server/broadcast.js';
import { requestRepair, approveRepair, executeRepair } from '../server/aiRepair.js';
import { addPointsToUser } from '../utils/points.js';
import { detectCategoryOffline } from '../server/offlineDict.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────
// GET /api/admin/stats — overall platform stats
// ─────────────────────────────────────────────────────────
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const [totalUsers, totalAds, activeAds, featuredAds, bannedUsers, suspendedUsers, pendingReports] = await Promise.all([
      User.countDocuments(),
      Ad.countDocuments({ isDeleted: { $ne: true } }),
      Ad.countDocuments({ status: 'active', isDeleted: { $ne: true } }),
      Ad.countDocuments({ isFeatured: true, featuredUntil: { $gt: new Date() }, isDeleted: { $ne: true } }),
      User.countDocuments({ isBanned: true }),
      User.countDocuments({ isSuspended: true }),
      Report.countDocuments({ resolved: false }),
    ]);
    res.json({ totalUsers, totalAds, activeAds, featuredAds, bannedUsers, suspendedUsers, pendingReports });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────
// GET /api/admin/users — all users with ad stats
// ─────────────────────────────────────────────────────────
router.get('/users', adminAuth, async (req, res) => {
  try {
    // Build search filter
    const searchQ = (req.query.search || '').trim();
    const pageNum  = Math.max(1, parseInt(req.query.page)  || 1);
    const limitNum = Math.min(1000, parseInt(req.query.limit) || 1000);
    const skipNum  = (pageNum - 1) * limitNum;

    const filter = {};
    if (searchQ) {
      filter.$or = [
        { name:          { $regex: searchQ, $options: 'i' } },
        { email:         { $regex: searchQ, $options: 'i' } },
        { xtoxId:        { $regex: searchQ, $options: 'i' } },
        { whatsappPhone: { $regex: searchQ, $options: 'i' } },
        { phone:         { $regex: searchQ, $options: 'i' } },
      ];
    }

    const users = await User.find(filter, {
      _id: 1, xtoxId: 1, name: 1, email: 1, whatsappPhone: 1,
      role: 1, isBanned: 1, isSuspended: 1, suspendReason: 1,
      createdAt: 1, googleId: 1, country: 1, phone: 1, lastSeen: 1,
    }).sort({ createdAt: -1 }).skip(skipNum).limit(limitNum).lean();

    const userIds = users.map(u => u._id);
    const adCounts = await Ad.aggregate([
      { $match: { $or: [{ seller: { $in: userIds } }, { userId: { $in: userIds } }] } },
      {
        $group: {
          _id: { $ifNull: ['$seller', '$userId'] },
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          featured: {
            $sum: {
              $cond: [{
                $and: [
                  { $eq: ['$isFeatured', true] },
                  { $gt: ['$featuredUntil', new Date()] },
                ],
              }, 1, 0],
            },
          },
        },
      },
    ]);

    const countMap = {};
    adCounts.forEach(c => {
      if (c._id) countMap[c._id.toString()] = c;
    });

    const result = users.map(u => ({
      ...u,
      googleId: u.googleId ? '***' + u.googleId.slice(-4) : null,
      adStats: countMap[u._id.toString()] || { total: 0, active: 0, featured: 0 },
    }));

    res.json({ users: result, total: result.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────
// DELETE /api/admin/users/:id — delete user + all their ads
// ─────────────────────────────────────────────────────────
router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ error: 'معرّف غير صالح' });

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
    if (['admin', 'sub_admin'].includes(user.role))
      return res.status(403).json({ error: 'لا يمكن حذف حساب المشرف' });

    await Ad.deleteMany({ $or: [{ seller: id }, { userId: id }] });
    await User.findByIdAndDelete(id);

    res.json({ success: true, message: 'تم حذف المستخدم وجميع إعلاناته' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────
// PATCH /api/admin/users/:id/ban — toggle ban status
// ─────────────────────────────────────────────────────────
router.patch('/users/:id/ban', adminAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ error: 'معرّف غير صالح' });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
    if (['admin', 'sub_admin'].includes(user.role))
      return res.status(403).json({ error: 'لا يمكن حظر حساب المشرف' });

    user.isBanned = !user.isBanned;
    if (!user.isBanned) user.banExpiresAt = null;
    await user.save();

    res.json({ success: true, isBanned: user.isBanned });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────
// PATCH /api/admin/users/:id/make-admin — toggle admin role
// ─────────────────────────────────────────────────────────
router.patch('/users/:id/make-admin', adminAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ error: 'معرّف غير صالح' });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

    user.role = user.role === 'admin' ? 'user' : 'admin';
    await user.save();

    res.json({ success: true, role: user.role });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────
// GET /api/admin/ads — all ads with seller info
// ─────────────────────────────────────────────────────────
router.get('/ads', adminAuth, async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip  = (page - 1) * limit;
    const filter = { isDeleted: { $ne: true } };

    if (req.query.search) {
      filter.$or = [
        { title:       { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
        { category:    { $regex: req.query.search, $options: 'i' } },
        { city:        { $regex: req.query.search, $options: 'i' } },
      ];
    }
    if (req.query.status) filter.status = req.query.status;
    if (req.query.featured === 'true') {
      filter.isFeatured = true;
      filter.featuredUntil = { $gt: new Date() };
    }
    if (req.query.featured === 'false') filter.isFeatured = false;

    const [ads, total] = await Promise.all([
      Ad.find(filter)
        .populate('seller', 'name email xtoxId whatsappPhone')
        .populate('userId', 'name email xtoxId whatsappPhone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Ad.countDocuments(filter),
    ]);

    res.json({ ads, total, page, pages: Math.ceil(total / limit) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────
// PATCH /api/admin/ads/:id/status — activate or deactivate
// ─────────────────────────────────────────────────────────
router.patch('/ads/:id/status', adminAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ error: 'معرّف غير صالح' });

    const { status } = req.body;
    if (!['active', 'inactive', 'deleted'].includes(status))
      return res.status(400).json({ error: 'حالة غير صالحة' });

    const ad = await Ad.findByIdAndUpdate(
      req.params.id,
      { status },
      { returnDocument: 'after' }
    );
    if (!ad) return res.status(404).json({ error: 'الإعلان غير موجود' });
    res.json({ success: true, ad });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


router.delete('/ads/all', adminAuth, async (req, res) => {
  try {
    const result = await Ad.deleteMany({});
    const deleted = (result && typeof result.deletedCount === 'number') ? result.deletedCount : 0;
    res.json({ success: true, deleted, message: `تم حذف ${deleted} إعلاناً` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────
// DELETE /api/admin/ads/:id — permanently delete one ad
// ─────────────────────────────────────────────────────────
router.delete('/ads/:id', adminAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ error: 'معرّف غير صالح' });

    const ad = await Ad.findByIdAndDelete(req.params.id);
    if (!ad) return res.status(404).json({ error: 'الإعلان غير موجود' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────
// PATCH /api/admin/ads/:id/feature — set featured timer or cancel
// ─────────────────────────────────────────────────────────
router.patch('/ads/:id/feature', adminAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ error: 'معرّف غير صالح' });

    const { days, cancel, style } = req.body;

    if (cancel) {
      const ad = await Ad.findByIdAndUpdate(
        req.params.id,
        { isFeatured: false, featuredUntil: null, visibilityScore: 10 },
        { returnDocument: 'after' }
      );
      if (!ad) return res.status(404).json({ error: 'الإعلان غير موجود' });
      return res.json({ success: true, ad });
    }

    const numDays = parseInt(days);
    if (!numDays || numDays < 1)
      return res.status(400).json({ error: 'يجب أن يكون عدد الأيام 1 على الأقل' });

    const featuredUntil = new Date(Date.now() + numDays * 24 * 60 * 60 * 1000);
    const ad = await Ad.findByIdAndUpdate(
      req.params.id,
      {
        isFeatured: true,
        featuredUntil,
        featuredStyle: style || 'normal',
        featuredAt: new Date(),
        visibilityScore: 100,
      },
      { returnDocument: 'after' }
    );
    if (!ad) return res.status(404).json({ error: 'الإعلان غير موجود' });
    res.json({ success: true, ad, featuredUntil });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────
// PATCH /api/admin/ads/:id/bubble — toggle cartoon bubble badge
// ─────────────────────────────────────────────────────────
router.patch('/ads/:id/bubble', adminAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ error: 'معرّف غير صالح' });

    const { days, cancel } = req.body;

    if (cancel) {
      const ad = await Ad.findByIdAndUpdate(
        req.params.id,
        { bubble: false, bubbleUntil: null },
        { returnDocument: 'after' }
      );
      if (!ad) return res.status(404).json({ error: 'الإعلان غير موجود' });
      return res.json({ success: true, ad });
    }

    const bubbleUntil = days ? new Date(Date.now() + parseInt(days) * 24 * 60 * 60 * 1000) : null;
    const ad = await Ad.findByIdAndUpdate(
      req.params.id,
      { bubble: true, bubbleUntil },
      { returnDocument: 'after' }
    );
    if (!ad) return res.status(404).json({ error: 'الإعلان غير موجود' });
    res.json({ success: true, ad });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────
// Legacy / existing routes kept below
// ─────────────────────────────────────────────────────────

router.get('/reports', adminAuth, async (req, res) => {
  try {
    const LABELS = {
      invalidPage:  { ar: 'رقم الصفحة غير صالح',       en: 'Invalid page number' },
      invalidLimit: { ar: 'حد السجلات غير صالح (1-50)', en: 'Invalid limit value (1-50)' },
      serverError:  { ar: 'خطأ في الخادم',              en: 'Server error' },
    };
    const rawPage  = parseInt(req.query.page,  10);
    const rawLimit = parseInt(req.query.limit, 10);
    const page  = isNaN(rawPage)  || rawPage  < 1 ? 1  : rawPage;
    const limit = isNaN(rawLimit) || rawLimit < 1 ? 20 : Math.min(rawLimit, 50);
    if (req.query.page  && (isNaN(rawPage)  || rawPage  < 1))
      return res.status(400).json({ error: LABELS.invalidPage.ar, error_en: LABELS.invalidPage.en });
    if (req.query.limit && (isNaN(rawLimit) || rawLimit < 1 || rawLimit > 50))
      return res.status(400).json({ error: LABELS.invalidLimit.ar, error_en: LABELS.invalidLimit.en });
    const skip = (page - 1) * limit;
    const filter = {};
    if (req.query.resolved === 'true')        filter.resolved = true;
    else if (req.query.resolved === 'false')  filter.resolved = false;
    else                                       filter.resolved = false;
    if (req.query.type && ['ad', 'seller'].includes(req.query.type)) filter.type = req.query.type;
    if (req.query.q && req.query.q.trim()) {
      const q = req.query.q.trim();
      const regex = new RegExp(q, 'i');
      const [matchingUsers, matchingAds] = await Promise.all([
        User.find({ email: regex }, '_id').lean(),
        Ad.find({ title: regex }, '_id').lean(),
      ]);
      const orClauses = [];
      if (matchingUsers.length) orClauses.push({ reportedBy: { $in: matchingUsers.map(u => u._id) } });
      if (matchingAds.length)   orClauses.push({ adId: { $in: matchingAds.map(a => a._id) } });
      if (!orClauses.length) {
        return res.json({ reports: [], page, totalPages: 1, total: 0, labels: { page: 'الصفحة', totalPages: 'إجمالي الصفحات', total: 'الإجمالي' }, filter: { q, resolved: filter.resolved, type: req.query.type || null } });
      }
      filter.$and = [{ $or: orClauses }];
    }
    const [reports, total] = await Promise.all([
      Report.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Report.countDocuments(filter),
    ]);
    const totalPages = Math.ceil(total / limit) || 1;
    res.json({ reports, page, totalPages, total, labels: { page: 'الصفحة', totalPages: 'إجمالي الصفحات', total: 'الإجمالي' }, filter: { q: req.query.q || null, type: req.query.type || null, resolved: filter.resolved } });
  } catch (e) {
    res.status(500).json({ error: 'خطأ في الخادم', error_en: 'Server error', details: e.message });
  }
});

router.get('/deleted', adminAuth, async (req, res) => {
  try {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    res.json(await Ad.find({ isDeleted: true, deletedAt: { $gte: cutoff } }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/ban', adminAuth, async (req, res) => {
  try {
    const { id, hours } = req.body;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    await User.findByIdAndUpdate(id, { isBanned: true, banExpiresAt: hours ? new Date(Date.now() + hours * 3600000) : null });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/mute', adminAuth, async (req, res) => {
  try {
    const _muteId = req.body.userId || req.body.id;
    if (!_muteId || !mongoose.Types.ObjectId.isValid(_muteId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    await User.findByIdAndUpdate(_muteId, { isMuted: req.body.mute });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/hide-user', adminAuth, async (req, res) => {
  try {
    const _hideId = req.body.userId || req.body.id;
    if (!_hideId || !mongoose.Types.ObjectId.isValid(_hideId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    await User.findByIdAndUpdate(_hideId, { isHidden: req.body.hide });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/rank-ad', adminAuth, async (req, res) => {
  try {
    if (!req.body.adId || !mongoose.Types.ObjectId.isValid(req.body.adId)) {
      return res.status(400).json({ error: 'Invalid adId' });
    }
    await Ad.findByIdAndUpdate(req.body.adId, { visibilityScore: req.body.score });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/feature', adminAuth, async (req, res) => {
  try {
    const { adId, style } = req.body;
    if (!adId || !mongoose.Types.ObjectId.isValid(adId)) {
      return res.status(400).json({ error: 'Invalid adId' });
    }
    let days = parseInt(req.body.days) || 7;
    if (days < 1) days = 1;
    if (days > 90) days = 90;
    const featuredUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const ad = await Ad.findById(adId);
    if (!ad) return res.status(404).json({ error: 'الإعلان غير موجود' });
    const { countFeaturedThisWeek } = await import('../server/featuredManager.js');
    const count = await countFeaturedThisWeek(ad.country);
    if (count >= 16) return res.status(400).json({ error: 'تم الوصول إلى الحد الأقصى 16 إعلاناً مميزاً أسبوعياً لهذا البلد' });
    await Ad.findByIdAndUpdate(adId, {
      isFeatured: true,
      featuredStyle: style || 'normal',
      featuredAt: new Date(),
      featuredUntil,
    });
    res.json({ ok: true, weeklyCount: count + 1, featuredUntil });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/promote-user', superAdminAuth, async (req, res) => {
  try {
    if (!req.body.id || !mongoose.Types.ObjectId.isValid(req.body.id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    await User.findByIdAndUpdate(req.body.id, { role: req.body.role });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/broadcast', adminAuth, async (req, res) => {
  try {
    const b = await sendWeeklyBroadcast(req.user.id, req.body.message);
    res.json(b);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/backup', adminAuth, async (req, res) => {
  try {
    const path = await createBackup();
    res.download(path);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/fix-categories', adminAuth, async (req, res) => {
  try {
    const ads = await Ad.find({ isExpired: { $ne: true }, isDeleted: { $ne: true } });
    let fixed = 0;
    for (const ad of ads) {
      const det = detectCategoryOffline(`${ad.title} ${ad.description || ''}`);
      if (det.main !== 'General' && ad.category !== det.main) {
        ad.category = det.main; ad.subcategory = det.sub; ad.fixedByAI = true;
        await ad.save(); fixed++;
      }
    }
    res.json({ fixed });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/ai-repair/request', adminAuth, async (req, res) => {
  try {
    const log = await requestRepair(req.body.problem, req.user.id);
    res.json(log);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/ai-repair/approve/:id', superAdminAuth, async (req, res) => {
  try {
    await approveRepair(req.params.id);
    const result = await executeRepair(req.params.id);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/ai-logs', adminAuth, async (req, res) => {
  try {
    res.json(await AILog.find().sort({ createdAt: -1 }).limit(50));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/create-simulation', superAdminAuth, async (req, res) => {
  try {
    const { name, country, avatar } = req.body;
    const user = await User.create({ name, country: country || 'EG', avatar, isSimulation: true, email: `sim_${Date.now()}@xtox.internal` });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/cleanup-duplicates', adminAuth, async (req, res) => {
  try {
    const pipeline = [
      { $group: { _id: '$title', ids: { $push: '$_id' }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ];
    const dups = await Ad.aggregate(pipeline);
    let removed = 0;
    for (const d of dups) {
      const [, ...toDelete] = d.ids;
      const r = await Ad.deleteMany({ _id: { $in: toDelete } });
      removed += r.deletedCount || 0;
    }
    res.json({ removed, duplicateGroups: dups.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/fix-all-ads', adminAuth, async (req, res) => {
  try {
    const ads = await Ad.find({ isDeleted: { $ne: true } });
    let fixed = 0;
    for (const ad of ads) {
      let changed = false;
      if (!ad.status) { ad.status = 'active'; changed = true; }
      if (!ad.country) { ad.country = 'EG'; changed = true; }
      if (changed) { await ad.save(); fixed++; }
    }
    res.json({ fixed, total: ads.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/resolve-report', adminAuth, async (req, res) => {
  try {
    const { reportId } = req.body;
    if (!reportId) return res.status(400).json({ error: 'معرف التقرير مطلوب' });
    if (!mongoose.Types.ObjectId.isValid(reportId)) {
      return res.status(400).json({ error: 'معرف التقرير غير صالح' });
    }
    const report = await Report.findByIdAndUpdate(reportId, { resolved: true, resolvedAt: new Date() }, { returnDocument: 'after' });
    if (!report) return res.status(404).json({ error: 'التقرير غير موجود' });
    res.json({ ok: true, report });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/admin/users/:id/role — only existing admins can grant/change roles
// POST also accepted for backwards compatibility
router.patch('/users/:id/role', adminAuth, async (req, res) => {
  try {
    const { role } = req.body;
    const ALLOWED_ROLES = ['user', 'admin', 'sub_admin'];
    if (!ALLOWED_ROLES.includes(role)) return res.status(400).json({ error: 'دور غير صالح' });
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ error: 'معرّف غير صالح' });

    // Prevent self-demotion
    if (String(req.params.id) === String(req.user._id || req.user.id) && role !== 'admin') {
      return res.status(400).json({ error: 'لا يمكنك تغيير دورك بنفسك' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { returnDocument: 'after' }
    ).select('name email role');

    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

    console.log(`[Admin] ${req.user.email || req.user.id} set role="${role}" for ${user.email}`);
    res.json({ success: true, ok: true, user });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router.post('/users/:id/role', adminAuth, async (req, res) => {
  // Forward to PATCH handler logic
  req.method = 'PATCH';
  const { role } = req.body;
  const ALLOWED_ROLES = ['user', 'admin', 'sub_admin'];
  try {
    if (!ALLOWED_ROLES.includes(role)) return res.status(400).json({ error: 'دور غير صالح' });
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ error: 'معرّف غير صالح' });
    if (String(req.params.id) === String(req.user._id || req.user.id) && role !== 'admin') {
      return res.status(400).json({ error: 'لا يمكنك تغيير دورك بنفسك' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { returnDocument: 'after' }).select('name email role');
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
    console.log(`[Admin] ${req.user.email || req.user.id} set role="${role}" for ${user.email}`);
    res.json({ success: true, ok: true, user });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/ai-learn', adminAuth, async (req, res) => {
  try {
    const { runWeeklyLearning } = await import('../server/weeklyLearner.js');
    runWeeklyLearning().catch(() => {});
    res.json({ success: true, message: 'تم بدء مهمة التعلم الأسبوعية للتصنيفات' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/location-vocab', adminAuth, async (req, res) => {
  try {
    const LocationVocab = (await import('../models/LocationVocab.js')).default;
    const vocabs = await LocationVocab.find({}, { terms: 0 }).sort({ updatedAt: -1 }).lean();
    res.json({ success: true, count: vocabs.length, vocabs });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/location-vocab/run', adminAuth, async (req, res) => {
  try {
    const { learnLocationLanguages } = await import('../server/locationLanguageLearner.js');
    learnLocationLanguages().catch(() => {});
    res.json({ success: true, message: 'تم بدء مهمة تعلم لغات المواقع' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});


router.post('/subsub-options/run', adminAuth, async (req, res) => {
  try {
    const { learnNewSubsubOptions } = await import('../server/weeklyLearner.js');
    learnNewSubsubOptions().catch(() => {});
    res.json({ success: true, message: 'تم بدء مهمة تعلم خيارات التصنيف الفرعي الثاني' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Payment Management (Vodafone Cash manual confirmation) ──────────────────

// GET /api/admin/payments — list pending payments
router.get('/payments', adminAuth, async (req, res) => {
  try {
    const PendingPayment = (await import('../models/PendingPayment.js')).default;
    const status = req.query.status || 'pending';
    const payments = await PendingPayment.find({ status })
      .populate('user', 'name email phone xtoxId')
      .populate('ad', 'title category')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, payments });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/admin/payments/:id/confirm — confirm and activate ad
router.post('/payments/:id/confirm', adminAuth, async (req, res) => {
  try {
    const PendingPayment = (await import('../models/PendingPayment.js')).default;
    const Ad = (await import('../models/Ad.js')).default;
    const User = (await import('../models/User.js')).default;
    const { sendOTPEmail } = await import('../utils/mailer.js');

    const payment = await PendingPayment.findById(req.params.id).populate('ad').populate('user');
    if (!payment) return res.status(404).json({ error: 'Order not found' });
    if (payment.status !== 'pending') return res.status(400).json({ error: 'Payment already processed' });

    // Activate the ad
    const expiresAt = new Date(Date.now() + payment.days * 24 * 60 * 60 * 1000);
    const PLAN_STYLES = { free: 'normal', basic: 'normal', featured: 'gold', premium: 'banner' };
    await Ad.findByIdAndUpdate(payment.ad._id, {
      isFeatured: true,
      featuredStyle: PLAN_STYLES[payment.planType] || 'gold',
      featuredPlan: payment.planType || 'featured',
      featuredUntil: expiresAt,
      featuredAt: new Date(),
      visibilityScore: 80,
    });

    // Mark payment confirmed
    payment.status = 'confirmed';
    payment.confirmedAt = new Date();
    payment.confirmedBy = req.user.id;
    await payment.save();

    // Notify user via email
    try {
      const user = payment.user;
      if (user && user.email) {
        await sendOTPEmail(user.email, null, 'ar', {
          subject: 'تم تفعيل إعلانك المميز ✅',
          html: `<div dir="rtl" style="font-family:Cairo,Arial,sans-serif;max-width:520px;margin:auto;padding:32px;background:#f9fafb;border-radius:12px">
            <h2 style="color:#002f34;margin-bottom:8px">مرحباً ${user.name || 'عزيزنا'}!</h2>
            <p style="color:#475569">تم تأكيد دفعتك وتفعيل إعلانك المميز بنجاح 🎉</p>
            <div style="background:#dcfce7;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin:16px 0">
              <p style="margin:0 0 6px;color:#15803d;font-weight:700">تفاصيل الترقية:</p>
              <p style="margin:0;color:#166534">📌 الإعلان: <strong>${payment.ad?.title || 'إعلانك'}</strong></p>
              <p style="margin:0;color:#166534">📅 المدة: <strong>${payment.days} يوم</strong></p>
              <p style="margin:0;color:#166534">⏰ ينتهي: <strong>${expiresAt.toLocaleDateString('ar-EG')}</strong></p>
              <p style="margin:0;color:#166534">💰 المدفوع: <strong>$${payment.amount}</strong></p>
            </div>
            <p style="color:#64748b;font-size:13px">شكراً لثقتك في XTOX. إعلانك الآن يظهر في أعلى النتائج! 🚀</p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
            <p style="color:#cbd5e1;font-size:11px;text-align:center;margin:0">XTOX — xtox.app | XTOX@XTOX.com</p>
          </div>`
        });
      }
    } catch (emailErr) {
      console.error('[PROMOTE] Confirmation email failed:', emailErr.message);
    }

    res.json({ success: true, message: 'Payment confirmed and ad activated', expiresAt });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/admin/payments/:id/reject
router.post('/payments/:id/reject', adminAuth, async (req, res) => {
  try {
    const PendingPayment = (await import('../models/PendingPayment.js')).default;
    const payment = await PendingPayment.findByIdAndUpdate(req.params.id,
      { status: 'rejected', adminNote: req.body.reason || 'Payment not received' },
      { returnDocument: 'after' }
    );
    if (!payment) return res.status(404).json({ error: 'Order not found' });
    res.json({ success: true, message: 'Payment rejected' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────
// GET /api/admin/users/reputation — all users sorted by points (admin-only)
// ─────────────────────────────────────────────────────────
router.get('/users/reputation', adminAuth, async (req, res) => {
  try {
    const users = await User.find({})
      .select('name email xtoxId reputationPoints monthlyPoints role createdAt pointsHistory')
      .sort({ reputationPoints: -1 });
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────
// PATCH /api/admin/users/:id/reputation — add/deduct points (admin-only)
// ─────────────────────────────────────────────────────────
router.patch('/users/:id/reputation', adminAuth, async (req, res) => {
  try {
    const { amount, reason } = req.body;
    if (typeof amount !== 'number') return res.status(400).json({ error: 'amount must be a number' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    await addPointsToUser(user, amount, reason || `تعديل يدوي من الأدمن (${amount > 0 ? '+' : ''}${amount})`);
    res.json({ success: true, reputationPoints: user.reputationPoints, monthlyPoints: user.monthlyPoints });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/reviews — All reviews (including deleted) for admin panel
// ─────────────────────────────────────────────────────────────────────────────
router.get("/reviews", adminAuth, async (req, res) => {
  try {
    const reviews = await Review.find({})
      .populate("reviewer", "name email avatar")
      .populate("seller", "name email")
      .populate("ad", "title")
      .sort({ createdAt: -1 })
      .lean();
    res.json(reviews);
  } catch (err) {
    console.error("[Admin reviews] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/backfill-countries — Backfill missing/invalid country codes
// Reads city text from each ad and assigns the correct 2-letter ISO country code
// ─────────────────────────────────────────────────────────────────────────────
router.post('/backfill-countries', adminAuth, async (req, res) => {
  try {
    const { locationToCountry } = await import('../utils/geoCountry.js');
    const ads = await Ad.find({
      $or: [
        { country: '' },
        { country: { $exists: false } },
        { country: { $regex: /^[^A-Z]{0,1}$|.{3,}/ } }
      ]
    })
      .select('_id location city country seller')
      .populate('seller', 'country');
    let updated = 0;
    for (const ad of ads) {
      const code = locationToCountry(ad.location || ad.city || '') || ad.seller?.country || 'EG';
      if (code) {
        await Ad.updateOne({ _id: ad._id }, { country: code.toUpperCase().slice(0, 2) });
        updated++;
      }
    }
    res.json({ updated, total: ads.length });
  } catch (err) {
    console.error('[Admin backfill-countries] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// ── #128 — POST /api/admin/users/:id/suspend — suspend a user + deactivate their ads ──
router.post('/users/:id/suspend', adminAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ error: 'معرّف غير صالح' });
    const { reason } = req.body;
    await User.findByIdAndUpdate(req.params.id, {
      isSuspended: true,
      suspendReason: reason || 'Violation of terms',
    });
    // Deactivate all their ads — use $or to cover both userId and seller fields
    await Ad.updateMany(
      { $or: [{ userId: req.params.id }, { seller: req.params.id }], isDeleted: { $ne: true } },
      { $set: { status: 'suspended', visibilityScore: 0 } }
    );
    console.log('[ADMIN] User suspended:', req.params.id, 'reason:', reason);
    res.json({ success: true, suspended: true });
  } catch (err) {
    console.error('[ADMIN suspend] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── #128 — POST /api/admin/users/:id/unsuspend — restore a suspended user ──
router.post('/users/:id/unsuspend', adminAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ error: 'معرّف غير صالح' });
    await User.findByIdAndUpdate(req.params.id, {
      isSuspended: false,
      suspendReason: '',
    });
    // Reactivate their ads — use $or to cover both userId and seller fields
    await Ad.updateMany(
      { $or: [{ userId: req.params.id }, { seller: req.params.id }], status: 'suspended' },
      { $set: { status: 'active', visibilityScore: 10 } }
    );
    console.log('[ADMIN] User unsuspended:', req.params.id);
    res.json({ success: true, suspended: false });
  } catch (err) {
    console.error('[ADMIN unsuspend] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── TASK 3: Anonymous Seller Admin Endpoints ──────────────────────────────────
// Root causes of anonymous seller ads:
// 1. Old creation paths before auth was enforced on POST /api/ads
// 2. Google OAuth + WhatsApp OTP early sessions with bad _id population
// 3. AI-generated listings (/sell/ai-generate) submitted without valid token
// 4. Direct MongoDB inserts (debug/admin scripts) without seller field
// 5. Import/migration from WordPress or other sources without seller mapping
//
// All are now blocked by:
//   A) Pre-save hook in Ad.js — throws if userId AND seller are both empty
//   B) POST handler SELLER BLOCK in ads.js — rejects if no sellerId in JWT
//   C) adLifecycle.js cleanup — deleteAnonymousAds() runs on startup + every cycle

// GET /api/admin/anonymous-ads — list ads with no valid seller
router.get('/anonymous-ads', adminAuth, async (req, res) => {
  try {
    const ads = await Ad.find({
      $or: [
        { userId: null, seller: null },
        { userId: { $exists: false }, seller: { $exists: false } },
        { userId: null, seller: { $exists: false } },
        { userId: { $exists: false }, seller: null },
      ]
    }).select('_id title createdAt category').lean();
    res.json({ count: ads.length, ads });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/anonymous-ads — delete all anonymous ads
router.delete('/anonymous-ads', adminAuth, async (req, res) => {
  try {
    const result = await Ad.deleteMany({
      $or: [
        { userId: null, seller: null },
        { userId: { $exists: false }, seller: { $exists: false } },
        { userId: null, seller: { $exists: false } },
        { userId: { $exists: false }, seller: null },
      ]
    });
    console.log(`[ADMIN] Deleted ${result.deletedCount} anonymous ads`);
    res.json({ deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// ─────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────
// GET /api/admin/analytics — ads/users per day, top categories & cities
// ─────────────────────────────────────────────────────────
router.get('/analytics', adminAuth, async (req, res) => {
  try {
    const days  = Math.min(parseInt(req.query.days) || 30, 365);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [adsByDay, usersByDay, topCategories, topCities] = await Promise.all([
      // Ads created per day
      Ad.aggregate([
        { $match: { createdAt: { $gte: since }, isDeleted: { $ne: true } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      // New users per day
      User.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      // Top 10 categories by active ads
      Ad.aggregate([
        { $match: { isDeleted: { $ne: true }, status: 'active', category: { $exists: true, $nin: [null, ''] } } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      // Top 10 cities by active ads
      Ad.aggregate([
        { $match: { isDeleted: { $ne: true }, status: 'active', city: { $exists: true, $nin: [null, ''] } } },
        { $group: { _id: '$city', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    res.json({ adsByDay, usersByDay, topCategories, topCities, days, since });
  } catch (e) {
    console.error('[Admin analytics] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────
// GET /api/admin/categories/stats — all categories with ad counts
// ─────────────────────────────────────────────────────────
router.get('/categories/stats', adminAuth, async (req, res) => {
  try {
    const stats = await Ad.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      {
        $group: {
          _id: { $ifNull: ['$category', 'غير مصنف'] },
          total:  { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        },
      },
      { $sort: { total: -1 } },
    ]);
    res.json({ stats, total: stats.reduce((s, c) => s + c.total, 0) });
  } catch (e) {
    console.error('[Admin categories/stats] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});


// POST /api/admin/categories/generate-image
// Body: { category, subcategory, slug, prompt (optional) }
// Auth: adminAuth
// Generates category image via OpenAI DALL-E 3 and uploads to Cloudinary
router.post('/categories/generate-image', adminAuth, async (req, res) => {
  try {
    const { category, subcategory, slug, prompt: customPrompt } = req.body;
    if (!category || !slug) return res.status(400).json({ error: 'category and slug required' });

    const name = subcategory || category;
    const prompt = customPrompt ||
      `Professional marketplace product photo for "${name}" category, clean white background, photorealistic, e-commerce listing, high quality. Arabic marketplace context.`;

    // Call OpenAI DALL-E 3
    const openaiRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        response_format: 'url',
      }),
    });
    const openaiData = await openaiRes.json();
    if (!openaiData.data?.[0]?.url) {
      throw new Error('OpenAI image generation failed: ' + JSON.stringify(openaiData));
    }

    const imageUrl = openaiData.data[0].url;

    // Upload to Cloudinary
    const { v2: cloudinary } = await import('cloudinary');
    const uploadResult = await cloudinary.uploader.upload(imageUrl, {
      public_id: `category-images/${slug}`,
      folder: 'xtox/categories',
      overwrite: true,
      transformation: [{ width: 800, height: 800, crop: 'fill', quality: 'auto', fetch_format: 'auto' }],
    });

    res.json({
      imageUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      slug,
    });
  } catch (err) {
    console.error('[Admin] Category image generation error:', err);
    res.status(500).json({ error: 'فشل توليد الصورة', details: err.message });
  }
});


// ─────────────────────────────────────────────────────────
// POST /api/admin/ads/:id/enrich — enrich a single ad on demand
// ─────────────────────────────────────────────────────────
router.post('/ads/:id/enrich', adminAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ error: 'معرف غير صالح' });

    const { enrichSingleAd } = await import('../jobs/adEnrichment.js');
    const ad = await Ad.findById(req.params.id);
    if (!ad) return res.status(404).json({ error: 'الإعلان غير موجود' });

    const result = await enrichSingleAd(ad);
    res.json({ success: true, adId: req.params.id, ...result });
  } catch (err) {
    console.error('[Admin] enrichSingleAd error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/admin/ads/enrich-batch — run batch enrichment on all vague ads
// ─────────────────────────────────────────────────────────
router.post('/ads/enrich-batch', adminAuth, async (req, res) => {
  try {
    const { onlyNew = false, limit = 200 } = req.body;
    const { runEnrichmentBatch } = await import('../jobs/adEnrichment.js');

    // Respond immediately, run in background
    res.json({
      success: true,
      message: 'تم بدء عملية التصنيف، قد تستغرق بضع دقائق',
      options: { onlyNew, limit },
    });

    runEnrichmentBatch({ onlyNew, limit })
      .then((summary) => console.log('[Admin] enrich-batch complete:', summary))
      .catch((err) => console.error('[Admin] enrich-batch error:', err));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ─────────────────────────────────────────────────────────
// GET /api/admin/sitemap — get current stored sitemap XML
// ─────────────────────────────────────────────────────────
router.get('/sitemap', adminAuth, async (req, res) => {
  try {
    const xml = await Setting.get('sitemap_xml', '');
    res.json({ xml });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/admin/sitemap — upload/update sitemap XML
// ─────────────────────────────────────────────────────────
router.post('/sitemap', adminAuth, async (req, res) => {
  try {
    const { xml } = req.body;
    if (!xml || typeof xml !== 'string') return res.status(400).json({ error: 'xml field required' });
    if (!xml.includes('<urlset') && !xml.includes('<sitemapindex')) {
      return res.status(400).json({ error: 'Invalid XML: must contain <urlset> or <sitemapindex>' });
    }
    await Setting.set('sitemap_xml', xml);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// ─────────────────────────────────────────────────────────
// GET /api/admin/robots — get current robots.txt content
// ─────────────────────────────────────────────────────────
router.get('/robots', adminAuth, async (req, res) => {
  try {
    const s = await Setting.findOne({ key: 'robots_txt' });
    res.json({ txt: s ? s.value : '' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/admin/robots — save robots.txt content
// ─────────────────────────────────────────────────────────
router.post('/robots', adminAuth, async (req, res) => {
  try {
    const { txt } = req.body;
    if (!txt || typeof txt !== 'string') return res.status(400).json({ error: 'Invalid content' });
    await Setting.findOneAndUpdate(
      { key: 'robots_txt' },
      { key: 'robots_txt', value: txt, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// ─────────────────────────────────────────────────────────
// Category CRUD — /api/admin/categories
// ─────────────────────────────────────────────────────────

// GET /api/admin/categories
router.get('/categories', adminAuth, async (req, res) => {
  try {
    const Category = (await import('../models/Category.js')).default;
    const cats = await Category.find().sort('order').lean();
    res.json({ categories: cats });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/categories — create new category
router.post('/categories', adminAuth, async (req, res) => {
  try {
    const Category = (await import('../models/Category.js')).default;
    const { name, nameAr, emoji, accentColor, defaultImage } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const count = await Category.countDocuments();
    const cat = await Category.create({ name, nameAr, emoji: emoji || '📂', accentColor: accentColor || '#6366f1', defaultImage, order: count });
    res.json({ success: true, category: cat });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/admin/categories/:id — update category
router.put('/categories/:id', adminAuth, async (req, res) => {
  try {
    const Category = (await import('../models/Category.js')).default;
    const cat = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!cat) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, category: cat });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/admin/categories/:id
router.delete('/categories/:id', adminAuth, async (req, res) => {
  try {
    const Category = (await import('../models/Category.js')).default;
    await Category.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/categories/:id/subcategories — add subcategory
router.post('/categories/:id/subcategories', adminAuth, async (req, res) => {
  try {
    const Category = (await import('../models/Category.js')).default;
    const { name, nameAr, emoji, accentColor, defaultImage } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const cat = await Category.findById(req.params.id);
    if (!cat) return res.status(404).json({ error: 'Category not found' });
    cat.subcategories.push({ name, nameAr, emoji: emoji || '📦', accentColor: accentColor || '#6366f1', defaultImage, order: cat.subcategories.length });
    await cat.save();
    res.json({ success: true, category: cat });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/admin/categories/:id/subcategories/:subId
router.put('/categories/:id/subcategories/:subId', adminAuth, async (req, res) => {
  try {
    const Category = (await import('../models/Category.js')).default;
    const cat = await Category.findById(req.params.id);
    if (!cat) return res.status(404).json({ error: 'Not found' });
    const sub = cat.subcategories.id(req.params.subId);
    if (!sub) return res.status(404).json({ error: 'Subcategory not found' });
    Object.assign(sub, req.body);
    await cat.save();
    res.json({ success: true, category: cat });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/admin/categories/:id/subcategories/:subId
router.delete('/categories/:id/subcategories/:subId', adminAuth, async (req, res) => {
  try {
    const Category = (await import('../models/Category.js')).default;
    const cat = await Category.findById(req.params.id);
    if (!cat) return res.status(404).json({ error: 'Not found' });
    cat.subcategories.pull({ _id: req.params.subId });
    await cat.save();
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/categories/:id/generate-image — AI generate default image
router.post('/categories/:id/generate-image', adminAuth, async (req, res) => {
  try {
    const Category = (await import('../models/Category.js')).default;
    const { subId, prompt } = req.body;
    const cat = await Category.findById(req.params.id);
    if (!cat) return res.status(404).json({ error: 'Not found' });

    const target = subId ? cat.subcategories.id(subId) : cat;
    const targetName = target?.nameAr || target?.name || 'category';

    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const imagePrompt = prompt || `Clean, minimal product listing icon for "${targetName}" marketplace category. Flat design, white background, Arabic marketplace. 512x512.`;

    const result = await openai.images.generate({
      model: 'dall-e-3',
      prompt: imagePrompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    });

    const imageUrl = result.data[0].url;

    // Upload to Cloudinary
    const cloudinary = (await import('../utils/cloudinary.js')).default;
    const uploaded = await cloudinary.uploader.upload(imageUrl, {
      folder: 'xtox/categories',
      public_id: `cat_${req.params.id}_${subId || 'main'}_${Date.now()}`,
    });

    // Save URL
    if (subId) {
      cat.subcategories.id(subId).defaultImage = uploaded.secure_url;
    } else {
      cat.defaultImage = uploaded.secure_url;
    }
    await cat.save();

    res.json({ success: true, url: uploaded.secure_url });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────────────────────
// POST /api/admin/backfill-images — generate AI images for all active ads with no images
// Admin only. Processes up to 50 ads with 2s delay between each to respect rate limits.
// ─────────────────────────────────────────────────────────
router.post('/backfill-images', adminAuth, async (req, res) => {
  try {
    const ads = await Ad.find({ images: { $size: 0 }, status: 'active' }).limit(50).lean();
    res.json({ queued: ads.length });
    // Fire and forget for each ad with rate-limit delay
    (async () => {
      for (const ad of ads) {
        await generateAIImage(ad);
        await new Promise(r => setTimeout(r, 2000)); // 2s delay between calls
      }
    })();
  } catch (err) {
    console.error('[backfill-images]', err.message);
    // Response already sent above via res.json — just log
  }
});

// ─────────────────────────────────────────────────────────
// GET /api/admin/whatsapp — get WhatsApp support number
// ─────────────────────────────────────────────────────────
router.get('/whatsapp', adminAuth, async (req, res) => {
  try {
    const s = await Setting.findOne({ key: 'whatsapp_number' });
    res.json({ number: s ? s.value : '201020326953' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────────────────────
// POST /api/admin/whatsapp — update WhatsApp support number
// ─────────────────────────────────────────────────────────
router.post('/whatsapp', adminAuth, async (req, res) => {
  try {
    const { number } = req.body;
    if (!number || !/^\d{10,15}$/.test(number.replace(/[+\s-]/g, ''))) {
      return res.status(400).json({ error: 'Invalid number' });
    }
    const clean = number.replace(/[^\d]/g, '');
    await Setting.findOneAndUpdate(
      { key: 'whatsapp_number' },
      { key: 'whatsapp_number', value: clean, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ success: true, number: clean });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


// ─────────────────────────────────────────────────────────
// GET /api/admin/country-pages-sync
// Upserts WordPress pages for all 18 countries. Returns { created, updated, failed }.
// ─────────────────────────────────────────────────────────
router.get('/country-pages-sync', adminAuth, async (req, res) => {
  try {
    const token = process.env.WP_ACCESS_TOKEN;
    if (!token) {
      // Try DB token
      const dbToken = await Setting.findOne({ key: 'wp_access_token' });
      if (!dbToken?.value) {
        return res.status(400).json({ error: 'No WordPress access token configured' });
      }
      const result = await syncCountryPages(dbToken.value);
      return res.json(result);
    }
    const result = await syncCountryPages(token);
    return res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});



// ─────────────────────────────────────────────────────────
// PATCH /api/admin/ads/:id/meta — update ad category, subcategory, condition
// ─────────────────────────────────────────────────────────
router.patch('/ads/:id/meta', adminAuth, async (req, res) => {
  try {
    const { category, subcategory, condition } = req.body;
    const update = {};
    if (category !== undefined) update.category = category;
    if (subcategory !== undefined) update.subcategory = subcategory;
    if (condition !== undefined) update.condition = condition;
    const ad = await Ad.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!ad) return res.status(404).json({ message: 'Ad not found' });
    res.json({ success: true, ad });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/admin/auto-translate — translate text to all supported languages
// Body: { text: string, fromLang?: string, toLangs?: string[] }
// ─────────────────────────────────────────────────────────
router.post('/auto-translate', adminAuth, async (req, res) => {
  try {
    const { text, fromLang = 'ar', toLangs = ['en', 'fr', 'de', 'tr', 'es', 'ru', 'zh'] } = req.body;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'text is required' });
    }
    const { autoTranslate: translate } = await import('../utils/autoTranslate.js');
    const translations = await translate(text.trim(), fromLang, toLangs);
    res.json({ success: true, source: text, fromLang, translations });
  } catch (err) {
    console.error('[auto-translate] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
