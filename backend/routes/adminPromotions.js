import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import Promotion from '../models/Promotion.js';
import Ad from '../models/Ad.js';
import User from '../models/User.js';
import { adminAuth } from '../middleware/auth.js';
import cloudinary, { CLOUDINARY_ENABLED } from '../server/cloudinary.js';

const router = express.Router();

// Use memory storage; upload to Cloudinary manually if available
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('نوع الملف غير مدعوم'), false);
  }
});

// Helper: upload buffer to Cloudinary or return base64 data URL
async function uploadToCloudinary(buffer, mimetype, folder = 'xtox/receipts') {
  if (CLOUDINARY_ENABLED) {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'auto', transformation: [{ width: 1200, quality: 'auto' }] },
        (err, result) => {
          if (err) reject(err);
          else resolve({ url: result.secure_url, publicId: result.public_id });
        }
      );
      stream.end(buffer);
    });
  }
  // Fallback: base64 data URL
  const b64 = buffer.toString('base64');
  return { url: `data:${mimetype};base64,${b64}`, publicId: null };
}

// ─── GRANT (must be before /:id routes) ───────────────────────────────────
// POST /api/admin/promotions/grant
router.post('/grant', adminAuth, async (req, res) => {
  try {
    const { adId, plan, durationDays = 14, adminNote } = req.body;
    if (!adId || !plan) return res.status(400).json({ error: 'adId و plan مطلوبان' });
    if (!mongoose.Types.ObjectId.isValid(adId)) return res.status(400).json({ error: 'معرف إعلان غير صالح' });
    if (!['featured', 'premium'].includes(plan)) return res.status(400).json({ error: 'الخطة غير صالحة' });

    const ad = await Ad.findById(adId).populate('seller userId', 'name email phone').lean();
    if (!ad) return res.status(404).json({ error: 'الإعلان غير موجود' });

    const seller = ad.seller || ad.userId;
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + Number(durationDays) * 24 * 60 * 60 * 1000);

    const promo = await Promotion.create({
      adId,
      userId: seller?._id || ad.userId,
      plan,
      amount: 0,
      currency: 'USD',
      paymentMethod: 'admin_grant',
      status: 'active',
      confirmedBy: req.user.id,
      confirmedAt: new Date(),
      startDate,
      endDate,
      durationDays: Number(durationDays),
      adminNote,
      adSnapshot: {
        title: ad.title,
        price: ad.price,
        category: ad.category,
        city: ad.city,
        image: ad.images?.[0] || ad.media?.[0]
      },
      sellerSnapshot: {
        name: seller?.name,
        email: seller?.email,
        phone: seller?.phone
      }
    });

    const adUpdate = { promotionScore: plan === 'premium' ? 2 : 1, expiresAt: endDate };
    if (plan === 'featured') adUpdate.featured = true;
    if (plan === 'premium') { adUpdate.premium = true; adUpdate.featured = true; }
    // Also update legacy fields
    adUpdate.isFeatured = true;
    adUpdate.featuredStyle = plan === 'premium' ? 'banner' : 'gold';
    adUpdate.featuredPlan = plan;
    adUpdate.featuredUntil = endDate;
    adUpdate.featuredAt = startDate;
    adUpdate['promotion.type'] = plan;
    adUpdate['promotion.expiresAt'] = endDate;
    adUpdate['promotion.paidAt'] = startDate;
    adUpdate['promotion.amountUSD'] = 0;
    await Ad.findByIdAndUpdate(adId, { $set: adUpdate });

    res.json({ success: true, promo });
  } catch (err) {
    console.error('[adminPromotions/grant]', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ─── STATS ────────────────────────────────────────────────────────────────
// GET /api/admin/promotions/stats
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const [total, pending, active, confirmed, rejected, revenue] = await Promise.all([
      Promotion.countDocuments(),
      Promotion.countDocuments({ status: 'pending' }),
      Promotion.countDocuments({ status: 'active' }),
      Promotion.countDocuments({ status: 'confirmed' }),
      Promotion.countDocuments({ status: 'rejected' }),
      Promotion.aggregate([
        { $match: { status: { $in: ['confirmed', 'active', 'expired'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);
    res.json({
      total, pending, active, confirmed, rejected,
      revenue: revenue[0]?.total || 0,
      revenueFormatted: `$${((revenue[0]?.total || 0) / 100).toFixed(2)}`
    });
  } catch (err) {
    console.error('[adminPromotions/stats]', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ─── LIST ALL ──────────────────────────────────────────────────────────────
// GET /api/admin/promotions?status=pending&plan=featured&page=1&limit=20
router.get('/', adminAuth, async (req, res) => {
  try {
    const { status, plan, method, page = 1, limit = 20, search, from, to } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (plan && plan !== 'all') filter.plan = plan;
    if (method && method !== 'all') filter.paymentMethod = method;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to + 'T23:59:59Z');
    }
    if (search) {
      filter.$or = [
        { 'adSnapshot.title': { $regex: search, $options: 'i' } },
        { 'sellerSnapshot.name': { $regex: search, $options: 'i' } },
        { 'sellerSnapshot.email': { $regex: search, $options: 'i' } },
        { stripeSessionId: { $regex: search, $options: 'i' } }
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [promotions, total] = await Promise.all([
      Promotion.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('adId', 'title images media category city price status featured premium')
        .populate('userId', 'name email phone sellerScore')
        .populate('confirmedBy', 'name')
        .populate('rejectedBy', 'name')
        .lean(),
      Promotion.countDocuments(filter)
    ]);
    res.json({
      promotions,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error('[adminPromotions/list]', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ─── SINGLE ────────────────────────────────────────────────────────────────
// GET /api/admin/promotions/:id
router.get('/:id', adminAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ error: 'معرف غير صالح' });
    const promo = await Promotion.findById(req.params.id)
      .populate('adId')
      .populate('userId', 'name email phone sellerScore isSuspended createdAt')
      .populate('confirmedBy', 'name email')
      .populate('rejectedBy', 'name email')
      .lean();
    if (!promo) return res.status(404).json({ error: 'لم يتم العثور على الطلب' });
    res.json(promo);
  } catch (err) {
    console.error('[adminPromotions/single]', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ─── CONFIRM ───────────────────────────────────────────────────────────────
// POST /api/admin/promotions/:id/confirm
router.post('/:id/confirm', adminAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ error: 'معرف غير صالح' });
    const promo = await Promotion.findById(req.params.id);
    if (!promo) return res.status(404).json({ error: 'الطلب غير موجود' });
    if (['confirmed', 'active'].includes(promo.status))
      return res.status(400).json({ error: 'تم تأكيد هذا الطلب مسبقاً' });

    const startDate = req.body.startDate ? new Date(req.body.startDate) : new Date();
    const duration = parseInt(req.body.durationDays) || promo.durationDays || 14;
    const endDate = new Date(startDate.getTime() + duration * 24 * 60 * 60 * 1000);

    promo.status = 'active';
    promo.confirmedBy = req.user.id;
    promo.confirmedAt = new Date();
    promo.startDate = startDate;
    promo.endDate = endDate;
    promo.durationDays = duration;
    if (req.body.adminNote) promo.adminNote = req.body.adminNote;
    await promo.save();

    const adUpdate = { promotionScore: promo.plan === 'premium' ? 2 : 1 };
    if (promo.plan === 'featured') adUpdate.featured = true;
    if (promo.plan === 'premium') { adUpdate.premium = true; adUpdate.featured = true; }
    adUpdate.expiresAt = endDate;
    // Legacy fields
    adUpdate.isFeatured = true;
    adUpdate.featuredStyle = promo.plan === 'premium' ? 'banner' : 'gold';
    adUpdate.featuredPlan = promo.plan;
    adUpdate.featuredUntil = endDate;
    adUpdate.featuredAt = startDate;
    adUpdate['promotion.type'] = promo.plan;
    adUpdate['promotion.expiresAt'] = endDate;
    adUpdate['promotion.paidAt'] = startDate;
    adUpdate['promotion.amountUSD'] = promo.amount / 100;
    await Ad.findByIdAndUpdate(promo.adId, { $set: adUpdate });

    res.json({ success: true, promo });
  } catch (err) {
    console.error('[adminPromotions/confirm]', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ─── REJECT ────────────────────────────────────────────────────────────────
// POST /api/admin/promotions/:id/reject
router.post('/:id/reject', adminAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ error: 'معرف غير صالح' });
    const promo = await Promotion.findById(req.params.id);
    if (!promo) return res.status(404).json({ error: 'الطلب غير موجود' });

    promo.status = 'rejected';
    promo.rejectedBy = req.user.id;
    promo.rejectedAt = new Date();
    promo.rejectionReason = req.body.reason || 'تم الرفض من قبل الإدارة';
    if (req.body.adminNote) promo.adminNote = req.body.adminNote;
    await promo.save();

    await Ad.findByIdAndUpdate(promo.adId, {
      $set: {
        featured: false,
        premium: false,
        promotionScore: 0,
        isFeatured: false,
        'promotion.type': 'none',
        'promotion.expiresAt': null
      }
    });
    res.json({ success: true });
  } catch (err) {
    console.error('[adminPromotions/reject]', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ─── EXTEND ────────────────────────────────────────────────────────────────
// POST /api/admin/promotions/:id/extend
router.post('/:id/extend', adminAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ error: 'معرف غير صالح' });
    const promo = await Promotion.findById(req.params.id);
    if (!promo) return res.status(404).json({ error: 'الطلب غير موجود' });

    const days = parseInt(req.body.days) || 7;
    const base = promo.endDate || new Date();
    promo.endDate = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
    promo.durationDays = (promo.durationDays || 0) + days;
    if (req.body.adminNote) promo.adminNote = req.body.adminNote;
    await promo.save();

    await Ad.findByIdAndUpdate(promo.adId, {
      $set: {
        expiresAt: promo.endDate,
        featuredUntil: promo.endDate,
        'promotion.expiresAt': promo.endDate
      }
    });
    res.json({ success: true, newEndDate: promo.endDate });
  } catch (err) {
    console.error('[adminPromotions/extend]', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ─── CANCEL ────────────────────────────────────────────────────────────────
// POST /api/admin/promotions/:id/cancel
router.post('/:id/cancel', adminAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ error: 'معرف غير صالح' });
    const promo = await Promotion.findById(req.params.id);
    if (!promo) return res.status(404).json({ error: 'الطلب غير موجود' });

    promo.status = 'cancelled';
    if (req.body.reason) promo.adminNote = req.body.reason;
    await promo.save();

    await Ad.findByIdAndUpdate(promo.adId, {
      $set: {
        featured: false,
        premium: false,
        promotionScore: 0,
        isFeatured: false,
        'promotion.type': 'none',
        'promotion.expiresAt': null
      }
    });
    res.json({ success: true });
  } catch (err) {
    console.error('[adminPromotions/cancel]', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ─── UPLOAD RECEIPT ────────────────────────────────────────────────────────
// POST /api/admin/promotions/:id/receipt
router.post('/:id/receipt', adminAuth, upload.single('receipt'), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ error: 'معرف غير صالح' });
    const promo = await Promotion.findById(req.params.id);
    if (!promo) return res.status(404).json({ error: 'الطلب غير موجود' });
    if (!req.file) return res.status(400).json({ error: 'الرجاء رفع ملف الإيصال' });

    // Delete old receipt if exists
    if (promo.receiptPublicId && CLOUDINARY_ENABLED) {
      await cloudinary.uploader.destroy(promo.receiptPublicId).catch(() => {});
    }

    const { url, publicId } = await uploadToCloudinary(req.file.buffer, req.file.mimetype);
    promo.receiptUrl = url;
    if (publicId) promo.receiptPublicId = publicId;
    if (req.body.notes) promo.receiptNotes = req.body.notes;
    await promo.save();

    res.json({ success: true, receiptUrl: promo.receiptUrl });
  } catch (err) {
    console.error('[adminPromotions/receipt]', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ─── UPDATE NOTE ───────────────────────────────────────────────────────────
// PATCH /api/admin/promotions/:id/note
router.patch('/:id/note', adminAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ error: 'معرف غير صالح' });
    const promo = await Promotion.findByIdAndUpdate(
      req.params.id,
      { adminNote: req.body.note },
      { new: true }
    );
    if (!promo) return res.status(404).json({ error: 'الطلب غير موجود' });
    res.json({ success: true });
  } catch (err) {
    console.error('[adminPromotions/note]', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

export default router;
