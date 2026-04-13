import express from 'express';
import { auth } from '../middleware/auth.js';
import Ad from '../models/Ad.js';
import User from '../models/User.js';

const router = express.Router();

const PLANS = {
  free:     { days: 3,  style: 'normal', price: 0 },
  basic:    { days: 7,  style: 'normal', price: 2 },
  featured: { days: 14, style: 'gold',   price: 5 },
  premium:  { days: 30, style: 'banner', price: 15 },
};

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

      // First time or 2+ months passed — allow free, update timestamp
      await User.findByIdAndUpdate(req.user.id, { lastFreePlanUsed: now });
    }

    // ── Paid $1 charge for exceeded free plan ────────────────────────────
    // When frontend sends plan='free' + chargeOverride=true (user paid $1),
    // reset the free plan clock so they get another 2-month window.
    if (req.body.chargeOverride && plan === 'free') {
      await User.findByIdAndUpdate(req.user.id, { lastFreePlanUsed: new Date() });
    }

    await Ad.findByIdAndUpdate(adId, {
      isFeatured: true,
      featuredStyle: planConfig.style,
      featuredUntil: until,
      featuredAt: new Date(),
      visibilityScore: Math.max(ad.visibilityScore || 0, 50),
    });

    // Log promotion request for manual follow-up (for paid plans)
    if (planConfig.price > 0 || req.body.chargeOverride) {
      console.log(`[PROMOTE] Ad ${adId} by user ${req.user.id}: plan=${plan}, payment=${payment}, price=$${req.body.chargeOverride ? 1 : planConfig.price}`);
    }

    res.json({ 
      success: true, 
      plan, 
      durationDays, 
      until,
      style: planConfig.style,
      message: (planConfig.price > 0 || req.body.chargeOverride)
        ? 'تم تقديم طلب الترقية. سيتواصل معك فريق XTOX خلال 24 ساعة.'
        : 'تم تفعيل الإعلان المميز.',
    });
  } catch (err) {
    console.error('[PROMOTE] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
