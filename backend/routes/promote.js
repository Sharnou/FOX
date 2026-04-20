import express from 'express';
import mongoose from 'mongoose';
import { auth } from '../middleware/auth.js';
import Ad from '../models/Ad.js';
import User from '../models/User.js';
import PendingPayment from '../models/PendingPayment.js';

const router = express.Router();

const PLANS = {
  free:     { days: 3,  style: 'normal', price: 0 },
  basic:    { days: 7,  style: 'normal', price: 2 },
  featured: { days: 14, style: 'gold',   price: 5,  promoType: 'featured' },
  premium:  { days: 14, style: 'banner', price: 15, promoType: 'premium'  },
};

// #123 — Promotion tiers for the new promotion.{type,expiresAt} system
const PROMO_PLANS = {
  featured: { label: 'Featured', days: 14, priceUSD: 5,  type: 'featured' },
  premium:  { label: 'Premium',  days: 30, priceUSD: 15, type: 'premium'  },
};

// Golden/premium styles are UNLIMITED — only 'normal' style is capped at 16
const UNLIMITED_STYLES = ['gold', 'banner'];
const MAX_NORMAL_FEATURED = 16;

const TWO_MONTHS_MS = 60 * 24 * 60 * 60 * 1000; // 60 days in ms

// GET /api/promote/plans — list all available promotion plans
router.get('/plans', async (req, res) => {
  try {
    res.json({
      plans: Object.entries(PLANS).map(([key, val]) => ({
        id: key,
        ...val,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
    if (!mongoose.Types.ObjectId.isValid(adId)) {
      return res.status(400).json({ error: 'Invalid adId format' });
    }

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
        // Cooldown active — silently upgrade to paid $1 plan (3-day) instead of returning an error
        const order = await PendingPayment.create({
          user:          req.user.id,
          ad:            adId,
          planType:      'free',
          days:          3,
          amount:        1,
          currency:      'USD',
          status:        'pending',
          paymentMethod: 'vodafone_cash',
          paymentNumber: '+201020326953',
          expiresAt:     new Date(Date.now() + 48 * 60 * 60 * 1000),
        });
        console.log(`[PROMOTE] Free cooldown active — upgraded to $1 paid plan. Order: ${order._id} | Ad: ${adId} | User: ${req.user.id}`);
        return res.json({
          requiresPayment:  true,
          plan:             '3-day',
          price:            1,
          message:          'أرسل 1$ عبر Vodafone Cash إلى +201020326953 ثم انتظر التأكيد',
          vodafoneCash:     '+201020326953',
          whatsapp:         'https://wa.me/201020326953',
          email:            'XTOX@XTOX.com',
          pendingPaymentId: order._id,
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

// ── #123 — POST /api/promote/:adId — apply promotion after payment confirmed ──
router.post('/:adId', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.adId))
      return res.status(400).json({ error: 'Invalid ad ID' });

    const { plan } = req.body; // 'featured' | 'premium'
    const p = PROMO_PLANS[plan];
    if (!p) return res.status(400).json({ error: 'Invalid plan. Use: featured | premium' });

    const ad = await Ad.findOne({
      _id: req.params.adId,
      $or: [{ userId: req.user.id }, { seller: req.user.id }],
    });
    if (!ad && req.user.role !== 'admin') return res.status(404).json({ error: 'Ad not found or not yours' });
    const targetAd = ad || await Ad.findById(req.params.adId);
    if (!targetAd) return res.status(404).json({ error: 'Ad not found' });

    // #132 — Extend ad lifetime from its CURRENT expiry (or from now if already expired)
    const now = new Date();
    const currentExpiry = targetAd.expiresAt && targetAd.expiresAt > now ? targetAd.expiresAt : now;
    const newExpiry = new Date(currentExpiry.getTime() + p.days * 24 * 60 * 60 * 1000);
    targetAd.expiresAt = newExpiry;
    targetAd.hardDeleteAt = new Date(newExpiry.getTime() + 7 * 24 * 60 * 60 * 1000); // reshare window after

    // Reset status to active if it was expired
    if (targetAd.status === 'expired') {
      targetAd.status = 'active';
      targetAd.isExpired = false;
      targetAd.reshareWindowEndsAt = null;
    }

    // promotion.expiresAt = now + plan.days (badge/glow duration)
    // ad.expiresAt = currentExpiry + plan.days (when ad disappears) — set above
    targetAd.promotion = { type: p.type, expiresAt: new Date(now.getTime() + p.days * 24 * 60 * 60 * 1000), paidAt: now, amountUSD: p.priceUSD };
    // Also set legacy isFeatured for backward compat
    targetAd.isFeatured = true;
    targetAd.featuredStyle = p.type === 'premium' ? 'banner' : 'gold';
    targetAd.featuredPlan = plan;
    targetAd.featuredUntil = new Date(now.getTime() + p.days * 24 * 60 * 60 * 1000);
    targetAd.featuredAt = new Date();
    await targetAd.save();

    res.json({ success: true, promotion: targetAd.promotion, ad: { _id: targetAd._id, title: targetAd.title } });
  } catch (err) {
    console.error('[PROMOTE/:adId] Error:', err);
    res.status(500).json({ error: err.message });
  }
});


// ── #143 — POST /api/promote/:adId/checkout — Stripe checkout session ──────
router.post('/:adId/checkout', auth, async (req, res) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(503).json({ error: 'Stripe not configured — use manual payment' });
    }
    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });

    const { plan } = req.body;
    const p = PROMO_PLANS[plan];
    if (!p) return res.status(400).json({ error: 'Invalid plan. Use: featured | premium' });

    if (!mongoose.Types.ObjectId.isValid(req.params.adId))
      return res.status(400).json({ error: 'Invalid ad ID' });

    const ad = await Ad.findOne({
      _id: req.params.adId,
      $or: [{ userId: req.user.id }, { seller: req.user.id }],
    });
    if (!ad) return res.status(404).json({ error: 'Ad not found or not yours' });

    const frontendUrl = process.env.FRONTEND_URL || 'https://xtox.vercel.app';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${p.label} — ${ad.title}`,
            description: `${p.days} days ${p.label} promotion on XTOX`,
          },
          unit_amount: Math.round(p.priceUSD * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${frontendUrl}/promote/success?adId=${req.params.adId}&plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/promote?adId=${req.params.adId}&title=${encodeURIComponent(ad.title)}`,
      metadata: { adId: req.params.adId, plan, userId: req.user.id.toString() },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('[PROMOTE/checkout] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── #143 — POST /api/promote/webhook — Stripe webhook auto-applies promotion ──
// NOTE: This route needs express.raw() body parser — mount in server/index.js BEFORE json()
router.post('/webhook', async (req, res) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(503).json({ error: 'Stripe webhook not configured' });
    }
    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });

    const sig = req.headers['stripe-signature'];
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('[STRIPE WEBHOOK] Signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { adId, plan, userId } = session.metadata || {};
      const p = PROMO_PLANS[plan];
      if (p && adId && mongoose.Types.ObjectId.isValid(adId)) {
        try {
          const ad = await Ad.findById(adId);
          if (ad) {
            const now = new Date();
            const currentExpiry = ad.expiresAt && ad.expiresAt > now ? ad.expiresAt : now;
            ad.expiresAt = new Date(currentExpiry.getTime() + p.days * 24 * 60 * 60 * 1000);
            ad.hardDeleteAt = new Date(ad.expiresAt.getTime() + 7 * 24 * 60 * 60 * 1000);
            ad.promotion = {
              type: p.type,
              expiresAt: new Date(now.getTime() + p.days * 24 * 60 * 60 * 1000),
              paidAt: now,
              amountUSD: p.priceUSD,
            };
            ad.isFeatured = true;
            ad.featuredStyle = p.type === 'premium' ? 'banner' : 'gold';
            ad.featuredPlan = plan;
            ad.featuredUntil = new Date(now.getTime() + p.days * 24 * 60 * 60 * 1000);
            ad.featuredAt = now;
            if (ad.status === 'expired') {
              ad.status = 'active';
              ad.isExpired = false;
              ad.reshareWindowEndsAt = null;
            }
            await ad.save();
            console.log(`[STRIPE WEBHOOK] Promotion applied: adId=${adId} plan=${plan} user=${userId}`);
          }
        } catch (applyErr) {
          console.error('[STRIPE WEBHOOK] Failed to apply promotion:', applyErr.message);
        }
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('[STRIPE WEBHOOK] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── #123 — POST /api/promote/expire-all — Admin: expire old promotions ──
router.post('/expire-all', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    const result = await Ad.updateMany(
      { 'promotion.type': { $ne: 'none' }, 'promotion.expiresAt': { $lt: new Date() } },
      { $set: { 'promotion.type': 'none', 'promotion.expiresAt': null } }
    );
    res.json({ expired: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


export default router;
