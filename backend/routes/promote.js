import express from 'express';
import { auth } from '../middleware/auth.js';
import Ad from '../models/Ad.js';
import User from '../models/User.js';
import PendingPayment from '../models/PendingPayment.js';

const router = express.Router();

const PLANS = {
  free:     { days: 3,  style: 'normal', price: 0 },
  basic:    { days: 7,  style: 'normal', price: 2 },
  featured: { days: 14, style: 'gold',   price: 5 },
  premium:  { days: 30, style: 'banner', price: 15 },
};

// Golden/premium styles are UNLIMITED — only 'normal' style is capped at 16
const UNLIMITED_STYLES = ['gold', 'banner'];
const MAX_NORMAL_FEATURED = 16;

const TWO_MONTHS_MS = 60 * 24 * 60 * 60 * 1000; // 60 days in ms

// GET /api/promote/free-plan-status
router.get('/free-plan-status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('lastFreePlanUsed').lean();
    const lastUsed = user?.lastFreePlanUsed;
    const now = Date.now();
    const canUseFree = !lastUsed || (now - new Date(lastUsed).getTime()) >= TWO_MONTHS_MS;
    const nextFreeAt = lastUsed ? new Date(new Date(lastUsed).getTime() + TWO_MONTHS_MS) : null;
    const daysLeft = nextFreeAt && !canUseFree
      ? Math.ceil((nextFreeAt - now) / (1000 * 60 * 60 * 24))
      : 0;
    res.json({ canUseFree, nextFreeAt, daysLeft });
  } catch (err) {
    console.error('[PROMOTE] free-plan-status error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/promote/featured-slots — remaining normal-style featured slots (max 16)
router.get('/featured-slots', async (req, res) => {
  try {
    const used = await Ad.countDocuments({
      isFeatured: true,
      featuredStyle: { $nin: UNLIMITED_STYLES }, // only count normal-style ads
      featuredUntil: { $gt: new Date() },
      isDeleted: { $ne: true },
    });
    const available = Math.max(0, MAX_NORMAL_FEATURED - used);
    res.json({ used, max: MAX_NORMAL_FEATURED, available });
  } catch (err) {
    console.error('[PROMOTE] featured-slots error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/promote
router.post('/', auth, async (req, res) => {
  try {
    const { adId, plan = 'free', payment, days } = req.body;
    if (!adId) return res.status(400).json({ error: 'adId required' });

    const ad = await Ad.findById(adId);
    if (!ad) return res.status(404).json({ error: 'Ad not found' });
    if (String(ad.userId) !== String(req.user.id) && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Not your ad' });

    const planConfig = PLANS[plan] || PLANS.free;
    const durationDays = days || planConfig.days;
    const until = new Date(Date.now() + durationDays * 86400000);

    // ── Free plan: enforce once every 2 months ────────────────────────────
    if (plan === 'free' || planConfig.price === 0) {
      const user = await User.findById(req.user.id).select('lastFreePlanUsed').lean();
      const lastUsed = user?.lastFreePlanUsed;
      const now = new Date();

      if (lastUsed && (now - new Date(lastUsed)) < TWO_MONTHS_MS) {
        // Within 2 months — user must pay $1
        const nextFreeAt = new Date(new Date(lastUsed).getTime() + TWO_MONTHS_MS);
        return res.status(402).json({
          error: 'free_limit_reached',
          message: 'لقد استخدمت الباقة المجانية مؤخراً. يمكنك الترقية مقابل $1 فقط.',
          chargeAmount: 1,
          nextFreeAt,
          daysLeft: Math.ceil((nextFreeAt - now) / (1000 * 60 * 60 * 24)),
        });
      }

      // ── Max 16 normal-style check for free plan ──────────────────────────
      if (planConfig.style === 'normal') {
        const usedSlots = await Ad.countDocuments({
          isFeatured: true,
          featuredStyle: { $nin: UNLIMITED_STYLES },
          featuredUntil: { $gt: now },
          isDeleted: { $ne: true },
        });
        if (usedSlots >= MAX_NORMAL_FEATURED) {
          return res.status(409).json({
            success: false,
            error: `قائمة الإعلانات المميزة ممتلئة (الحد الأقصى ${MAX_NORMAL_FEATURED} إعلان)`,
            message: 'Featured ads list is full. Try the Gold plan instead!',
            suggestion: 'featured',
            currentCount: usedSlots,
          });
        }
      }

      // First time or 2+ months passed — allow free, update timestamp, activate immediately
      await User.findByIdAndUpdate(req.user.id, { lastFreePlanUsed: now });
      await Ad.findByIdAndUpdate(adId, {
        isFeatured: true,
        featuredStyle: planConfig.style,
        featuredPlan: plan,
        featuredUntil: until,
        featuredAt: new Date(),
        visibilityScore: Math.max(ad.visibilityScore || 0, 50),
      });
      return res.json({
        success: true,
        status: 'active',
        plan,
        durationDays,
        until,
        style: planConfig.style,
        message: 'تم تفعيل الإعلان المميز مجاناً! 🎉',
      });
    }

    // ── Paid $1 charge for exceeded free plan (chargeOverride) ────────────
    if (req.body.chargeOverride && plan === 'free') {
      await User.findByIdAndUpdate(req.user.id, { lastFreePlanUsed: new Date() });
    }

    // ── Max 16 check for basic (normal-style) paid plan ───────────────────
    if (planConfig.style === 'normal') {
      const usedSlots = await Ad.countDocuments({
        isFeatured: true,
        featuredStyle: { $nin: UNLIMITED_STYLES },
        featuredUntil: { $gt: new Date() },
        isDeleted: { $ne: true },
      });
      if (usedSlots >= MAX_NORMAL_FEATURED) {
        return res.status(409).json({
          success: false,
          error: `قائمة الإعلانات المميزة ممتلئة (الحد الأقصى ${MAX_NORMAL_FEATURED} إعلان)`,
          message: 'Featured ads list is full (max 16). Try the Gold plan instead!',
          suggestion: 'featured', // upgrade suggestion
          currentCount: usedSlots,
        });
      }
    }
    // Golden/premium: no limit check needed

    // ── PAID plans: create PENDING order — NO activation yet ──────────────
    // "No money no funny" — ad NEVER activates until payment is manually confirmed by admin
    const order = await PendingPayment.create({
      user:          req.user.id,
      ad:            adId,
      planType:      plan,
      days:          durationDays,
      amount:        planConfig.price,
      currency:      'USD',
      status:        'pending',
      paymentMethod: 'vodafone_cash',
      paymentNumber: '+201020326953',
      expiresAt:     new Date(Date.now() + 48 * 60 * 60 * 1000), // 48h window
    });

    console.log(`[PROMOTE] Pending order created: ${order._id} | Ad: ${adId} | User: ${req.user.id} | Plan: ${plan} | $${planConfig.price}`);

    return res.json({
      success: true,
      status:  'pending_payment',
      orderId: order._id,
      message: 'في انتظار تأكيد الدفع',
      plan,
      durationDays,
      amount:  planConfig.price,
      instructions: {
        ar: `لتفعيل إعلانك المميز:\n1. أرسل ${planConfig.price}$ عبر فودافون كاش على الرقم: +201020326953\n2. أرسل إيصال الدفع عبر واتساب على نفس الرقم أو راسل: XTOX@XTOX.com\n3. سيتم تفعيل إعلانك خلال 24 ساعة من تأكيد الدفع\n\n⚠️ لن يتم تفعيل الإعلان قبل استلام المدفوعات`,
        slogan: 'No money no funny 💸',
      },
      contact: {
        whatsapp: '+201020326953',
        email:    'XTOX@XTOX.com',
      },
    });
  } catch (err) {
    console.error('[PROMOTE] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
