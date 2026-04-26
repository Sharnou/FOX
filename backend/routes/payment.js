import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const router = express.Router();

// ── Auth middleware ──────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'يجب تسجيل الدخول أولاً | Authentication required'
      });
    }
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'fox-default-secret');
    next();
  } catch {
    res.status(401).json({
      error: 'invalid_token',
      message: 'جلسة منتهية، الرجاء إعادة تسجيل الدخول | Session expired'
    });
  }
}

// ── Plans config ─────────────────────────────────────────────────────────────
const PLANS = {
  '1day':   { days: 1,  price: 100,  label: '1 يوم - $1',      labelEn: '1 Day - $1' },
  '3days':  { days: 3,  price: 200,  label: '3 أيام - $2',     labelEn: '3 Days - $2' },
  '7days':  { days: 7,  price: 500,  label: '7 أيام - $5',     labelEn: '7 Days - $5' },
  '30days': { days: 30, price: 1500, label: '30 يوم - $15',    labelEn: '30 Days - $15' },
  'store':  { days: 30, price: 2000, label: 'متجر شهري - $20', labelEn: 'Monthly Store - $20' },
};

function getPlanFeatures(planId) {
  const base = [
    { ar: 'ظهور في أعلى نتائج البحث', en: 'Top search results placement' },
    { ar: 'شارة "إعلان مميز"',         en: 'Featured badge on ad' },
    { ar: 'إحصائيات مشاهدة مفصلة',   en: 'Detailed view statistics' },
  ];
  if (['7days', '30days', 'store'].includes(planId)) {
    base.push({ ar: 'دعم أولوية', en: 'Priority support' });
  }
  if (['30days', 'store'].includes(planId)) {
    base.push({ ar: 'تمييز بلون مختلف', en: 'Color-highlighted listing' });
  }
  if (planId === 'store') {
    base.push({ ar: 'صفحة متجر خاصة',    en: 'Dedicated store page' });
    base.push({ ar: 'حتى 50 إعلاناً نشطاً', en: 'Up to 50 active ads' });
  }
  return base;
}

// ── GET /api/payment/plans ───────────────────────────────────────────────────
router.get('/plans', (req, res) => {
  const plans = Object.entries(PLANS).map(([id, p]) => ({
    id,
    ...p,
    features: getPlanFeatures(id),
    recommended: id === '7days',
  }));
  res.json({ plans, currency: 'USD', active: false });
});

// ── GET /api/payment/history ─────────────────────────────────────────────────
router.get('/history', requireAuth, async (req, res) => {
  try {
    const { default: Payment } = await import('../models/Payment.js').catch(() => ({ default: null }));
    if (!Payment) {
      return res.json({
        payments: [],
        total: 0,
        message: 'سجل الدفع غير متاح بعد | Payment history not available yet'
      });
    }
    const payments = await Payment.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    res.json({ payments, total: payments.length });
  } catch (e) {
    console.error('Payment history error:', e);
    res.status(500).json({ error: 'server_error', message: 'خطأ في الخادم | Server error' });
  }
});

// ── GET /api/payment/status/:adId ────────────────────────────────────────────
router.get('/status/:adId', requireAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.adId)) {
      return res.status(400).json({ error: 'invalid_ad_id', message: 'معرّف إعلان غير صالح | Invalid ad ID' });
    }
    const { default: Ad } = await import('../models/Ad.js').catch(() => ({ default: null }));
    if (!Ad) {
      return res.status(404).json({ error: 'not_found', message: 'الإعلان غير موجود | Ad not found' });
    }
    const ad = await Ad.findOne({ _id: req.params.adId, userId: req.user.id }).lean();
    if (!ad) {
      return res.status(404).json({ error: 'not_found', message: 'الإعلان غير موجود | Ad not found' });
    }
    const now = new Date();
    const isFeatured = ad.featuredUntil && new Date(ad.featuredUntil) > now;
    const daysLeft = isFeatured
      ? Math.ceil((new Date(ad.featuredUntil) - now) / (1000 * 60 * 60 * 24))
      : 0;
    res.json({
      adId: ad._id,
      isFeatured,
      featuredUntil: ad.featuredUntil || null,
      daysLeft,
      message: isFeatured
        ? `الإعلان مميز لمدة ${daysLeft} يوم | Featured for ${daysLeft} more days`
        : 'الإعلان غير مميز | Ad is not featured',
    });
  } catch (e) {
    console.error('Payment status error:', e);
    res.status(500).json({ error: 'server_error', message: 'خطأ في الخادم | Server error' });
  }
});

// ── GET /api/payment/methods ──────────────────────────────────────────────────
router.get('/methods', requireAuth, (req, res) => {
  const country = req.user.country || 'EG';
  const methods = getPaymentMethods(country);
  res.json({ country, methods, active: false, comingSoon: true });
});

function getPaymentMethods(country) {
  const cardMethod = {
    id: 'card',
    label: 'بطاقة ائتمان / خصم',
    labelEn: 'Credit / Debit Card',
    icon: '💳',
    available: false,
  };
  const walletMap = {
    EG: [
      { id: 'vodafone_cash', label: 'فودافون كاش',   labelEn: 'Vodafone Cash', icon: '📱', available: false },
      { id: 'fawry',         label: 'فوري',           labelEn: 'Fawry',         icon: '🏪', available: false },
      { id: 'instapay',      label: 'إنستاباي',       labelEn: 'InstaPay',      icon: '💸', available: false },
    ],
    SA: [{ id: 'stc_pay', label: 'STC Pay', labelEn: 'STC Pay', icon: '📱', available: false }],
    AE: [{ id: 'payit',   label: 'PayIt',   labelEn: 'PayIt',   icon: '📱', available: false }],
    MA: [{ id: 'cih_pay', label: 'CIH Pay', labelEn: 'CIH Pay', icon: '📱', available: false }],
    TN: [{ id: 'paymee',  label: 'Paymee',  labelEn: 'Paymee',  icon: '📱', available: false }],
    JO: [{ id: 'orange_money', label: 'Orange Money', labelEn: 'Orange Money', icon: '📱', available: false }],
    IQ: [{ id: 'zain_cash',   label: 'Zain Cash',    labelEn: 'Zain Cash',    icon: '📱', available: false }],
    LB: [{ id: 'wish_money',  label: 'Wish Money',   labelEn: 'Wish Money',   icon: '📱', available: false }],
  };
  return [cardMethod, ...(walletMap[country] || [])];
}

// ── POST /api/payment/create-checkout ────────────────────────────────────────
router.post('/create-checkout', requireAuth, (req, res) => {
  const { plan, adId } = req.body;
  if (!plan || !PLANS[plan]) {
    return res.status(400).json({
      error: 'invalid_plan',
      message: 'خطة غير صالحة | Invalid plan selected',
      validPlans: Object.keys(PLANS),
    });
  }
  if (!adId) {
    return res.status(400).json({
      error: 'missing_ad',
      message: 'يجب تحديد الإعلان | Ad ID is required',
    });
  }
  res.status(503).json({
    error: 'payment_not_active',
    message: 'الدفع غير متاح بعد — قريباً جداً! | Payment not active yet — coming very soon!',
    selectedPlan: PLANS[plan],
    notify: true,
    notifyMessage: "سنُعلمك فور تفعيل نظام الدفع | We'll notify you when payment is activated",
  });
});

// ── POST /api/payment/activate-featured ──────────────────────────────────────
router.post('/activate-featured', requireAuth, async (req, res) => {
  const { adId, plan, sessionId } = req.body;
  if (!sessionId) {
    return res.status(503).json({
      error: 'payment_not_active',
      message: 'الدفع غير متاح بعد — قريباً | Payment not active yet — coming soon',
    });
  }
  if (!adId || !mongoose.Types.ObjectId.isValid(adId)) {
    return res.status(400).json({ error: 'invalid_ad_id', message: 'معرّف إعلان غير صالح | Invalid ad ID' });
  }
  try {
    const { default: Ad } = await import('../models/Ad.js').catch(() => ({ default: null }));
    if (!Ad || !PLANS[plan]) {
      return res.status(400).json({ error: 'invalid_request', message: 'طلب غير صالح | Invalid request' });
    }
    const ad = await Ad.findOne({ _id: adId, userId: req.user.id });
    if (!ad) {
      return res.status(404).json({ error: 'not_found', message: 'الإعلان غير موجود | Ad not found' });
    }
    const days = PLANS[plan].days;
    const now = new Date();
    const base = ad.featuredUntil && new Date(ad.featuredUntil) > now ? new Date(ad.featuredUntil) : now;
    ad.featuredUntil = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
    ad.isFeatured = true;
    await ad.save();
    res.json({
      success: true,
      message: `تم تفعيل التمييز لمدة ${days} يوم | Featured activated for ${days} days`,
      featuredUntil: ad.featuredUntil,
    });
  } catch (e) {
    console.error('Activate featured error:', e);
    res.status(500).json({ error: 'server_error', message: 'خطأ في الخادم | Server error' });
  }
});

// ── POST /api/payment/expire-featured (admin only) ───────────────────────────
router.post('/expire-featured', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'forbidden', message: 'غير مصرح | Admin access required' });
  }
  if (!req.body?.adId || !mongoose.Types.ObjectId.isValid(req.body.adId)) {
    return res.status(400).json({ error: 'invalid_ad_id', message: 'معرّف إعلان غير صالح | Invalid ad ID' });
  }
  try {
    const { default: Ad } = await import('../models/Ad.js').catch(() => ({ default: null }));
    if (!Ad) return res.status(500).json({ error: 'server_error', message: 'خطأ في الخادم | Server error' });
    const ad = await Ad.findById(req.body.adId);
    if (!ad) return res.status(404).json({ error: 'not_found', message: 'الإعلان غير موجود | Ad not found' });
    ad.featuredUntil = new Date();
    ad.isFeatured = false;
    await ad.save();
    res.json({ success: true, message: 'تم إلغاء التمييز | Featured status removed' });
  } catch (e) {
    console.error('Expire featured error:', e);
    res.status(500).json({ error: 'server_error', message: 'خطأ في الخادم | Server error' });
  }
});

// ── POST /api/payment/webhook ─────────────────────────────────────────────────
// Payment provider webhooks (Stripe, PayMob, Fawry, etc.)
// NOTE: Add signature verification when choosing a payment provider
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  let event = null;
  try {
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body);
    event = JSON.parse(rawBody);
  } catch (e) {
    console.error('[Webhook] Failed to parse payload:', e.message);
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const eventType = event?.type || event?.event || event?.obj?.type || 'unknown';
  console.log('[Webhook] Payment webhook received, type:', eventType, 'id:', event?.id || event?.obj?.id || '—');

  try {
    switch (eventType) {
      case 'payment.succeeded':
      case 'charge.succeeded':
      case 'TRANSACTION_PROCESSED_SUCCESSFULLY': {
        // TODO: Look up PendingPayment by event reference → activate featured/promoted ad
        const refId = event?.data?.object?.id || event?.obj?.id || '';
        console.log('[Webhook] payment.succeeded — ref:', refId, '— implement PendingPayment lookup + feature activation');
        break;
      }
      case 'payment.failed':
      case 'charge.failed':
      case 'TRANSACTION_FAILED': {
        // TODO: Look up PendingPayment → notify user via push notification / email
        const refId = event?.data?.object?.id || event?.obj?.id || '';
        console.log('[Webhook] payment.failed — ref:', refId, '— implement user notification');
        break;
      }
      case 'refund.created':
      case 'charge.refunded':
        console.log('[Webhook] refund event — log for manual review');
        break;
      default:
        console.log('[Webhook] Unhandled event type:', eventType);
    }
  } catch (handlerErr) {
    console.error('[Webhook] Handler error:', handlerErr.message);
    // Still return 200 so provider doesn't retry
  }

  res.json({ received: true, type: eventType });
});

export default router;
