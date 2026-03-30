import express from 'express';
const router = express.Router();

// Plans config (display only — payment not active yet)
const PLANS = {
  '1day':   { days: 1,  price: 100,  label: '1 يوم - $1' },
  '3days':  { days: 3,  price: 200,  label: '3 أيام - $2' },
  '7days':  { days: 7,  price: 500,  label: '7 أيام - $5' },
  '30days': { days: 30, price: 1500, label: '30 يوم - $15' },
  'store':  { days: 30, price: 2000, label: 'متجر شهري - $20' },
};

// Get plans (display only)
router.get('/plans', (req, res) => {
  res.json(PLANS);
});

// Payment not active yet
router.post('/create-checkout', (req, res) => {
  res.status(503).json({ error: 'payment_not_active', message: 'الدفع غير متاح بعد — قريباً' });
});

router.post('/activate-featured', (req, res) => {
  res.status(503).json({ error: 'payment_not_active', message: 'الدفع غير متاح بعد — قريباً' });
});

router.post('/expire-featured', (req, res) => {
  res.status(503).json({ error: 'payment_not_active', message: 'الدفع غير متاح بعد — قريباً' });
});

export default router;
