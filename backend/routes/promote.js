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

// POST /api/promote
router.post('/', auth, async (req, res) => {
  try {
    const { adId, plan = 'free', payment, days } = req.body;
    if (!adId) return res.status(400).json({ error: 'adId required' });

    const ad = await Ad.findById(adId);
    if (!ad) return res.status(404).json({ error: 'Ad not found' });
    if (String(ad.userId) !== String(req.user._id) && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Not your ad' });

    const planConfig = PLANS[plan] || PLANS.free;
    const durationDays = days || planConfig.days;
    const until = new Date(Date.now() + durationDays * 86400000);

    await Ad.findByIdAndUpdate(adId, {
      isFeatured: true,
      featuredStyle: planConfig.style,
      featuredUntil: until,
      featuredAt: new Date(),
      visibilityScore: Math.max(ad.visibilityScore || 0, 50),
    });

    // Log promotion request for manual follow-up (for paid plans)
    if (planConfig.price > 0) {
      console.log(`[PROMOTE] Ad ${adId} by user ${req.user._id}: plan=${plan}, payment=${payment}, price=$${planConfig.price}`);
    }

    res.json({ 
      success: true, 
      plan, 
      durationDays, 
      until,
      style: planConfig.style,
      message: planConfig.price > 0 ? 'تم تقديم طلب الترقية. سيتواصل معك فريق XTOX خلال 24 ساعة.' : 'تم تفعيل الإعلان المميز.'
    });
  } catch (err) {
    console.error('[PROMOTE] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
