import express from 'express';
import { auth } from '../middleware/auth.js';
import Ad from '../models/Ad.js';

const router = express.Router();

// Plans config
const PLANS = {
  '1day':   { days: 1,  price: 100,  label: '1 يوم - $1' },
  '3days':  { days: 3,  price: 200,  label: '3 أيام - $2' },
  '7days':  { days: 7,  price: 500,  label: '7 أيام - $5' },
  '30days': { days: 30, price: 1500, label: '30 يوم - $15' },
  'store':  { days: 30, price: 2000, label: 'متجر شهري - $20' },
};

// Activate featured (free for now / after payment webhook)
router.post('/activate-featured', auth, async (req, res) => {
  try {
    const { adId, plan } = req.body;
    const planConfig = PLANS[plan];
    if (!planConfig) return res.status(400).json({ error: 'Invalid plan' });

    const ad = await Ad.findById(adId);
    if (!ad) return res.status(404).json({ error: 'Ad not found' });
    if (ad.userId.toString() !== req.user.id) return res.status(403).json({ error: 'Not your ad' });

    const now = new Date();
    const duration = planConfig.days * 24 * 60 * 60 * 1000;
    ad.isFeatured = true;
    ad.featuredUntil = new Date(now.getTime() + duration);
    ad.featuredPlan = plan;
    await ad.save();

    res.json({ success: true, featuredUntil: ad.featuredUntil, plan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Stripe checkout session
router.post('/create-checkout', auth, async (req, res) => {
  try {
    const { adId, plan } = req.body;
    const planConfig = PLANS[plan];
    if (!planConfig) return res.status(400).json({ error: 'Invalid plan' });

    const stripeKey = process.env.STRIPE_SECRET;
    if (!stripeKey || stripeKey.includes('your_')) {
      // Stripe not configured — activate directly (demo mode)
      const ad = await Ad.findById(adId);
      if (!ad) return res.status(404).json({ error: 'Ad not found' });
      const now = new Date();
      ad.isFeatured = true;
      ad.featuredUntil = new Date(now.getTime() + planConfig.days * 86400000);
      ad.featuredPlan = plan;
      await ad.save();
      return res.json({ success: true, demo: true, message: 'Activated in demo mode (Stripe not configured)', featuredUntil: ad.featuredUntil });
    }

    // Real Stripe checkout
    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(stripeKey);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `XTOX Featured Ad - ${planConfig.label}` },
          unit_amount: planConfig.price,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/my-ads?featured=success&adId=${adId}`,
      cancel_url: `${process.env.FRONTEND_URL}/my-ads`,
      metadata: { adId, plan, userId: req.user.id },
    });

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get plans
router.get('/plans', (req, res) => {
  res.json(PLANS);
});

// Auto-expire featured ads (call this via cron or on each ad fetch)
router.post('/expire-featured', async (req, res) => {
  try {
    const now = new Date();
    const result = await Ad.updateMany(
      { isFeatured: true, featuredUntil: { $lt: now } },
      { $set: { isFeatured: false, featuredUntil: null, featuredPlan: null } }
    );
    res.json({ expired: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
