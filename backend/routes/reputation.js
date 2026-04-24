import express from 'express';
import User from '../models/User.js';
import { addPointsToUser } from '../utils/points.js';
import { getUSDRates, COUNTRY_CURRENCY, CURRENCY_SYMBOLS } from '../utils/exchangeRates.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// POINTS_PACKAGES: define in USD cents
const PACKAGES = [
  { id: 'pts_100',   points: 100,   usdCents: 20,   label: '100 نقطة' },
  { id: 'pts_500',   points: 500,   usdCents: 100,  label: '500 نقطة' },
  { id: 'pts_1000',  points: 1000,  usdCents: 200,  label: '1,000 نقطة' },
  { id: 'pts_2500',  points: 2500,  usdCents: 500,  label: '2,500 نقطة' },
  { id: 'pts_5000',  points: 5000,  usdCents: 1000, label: '5,000 نقطة' },
  { id: 'pts_10000', points: 10000, usdCents: 2000, label: '10,000 نقطة' },
];

// Zero-decimal currencies (Stripe requires no ×100 multiplier)
const ZERO_DECIMAL = ['JPY', 'KRW', 'VND', 'IDR', 'UGX', 'RWF', 'BIF', 'CLP', 'GNF', 'MGA', 'PYG', 'XAF', 'XOF'];

// Currencies Stripe natively supports
const STRIPE_SUPPORTED = [
  'usd', 'eur', 'gbp', 'aud', 'cad', 'chf', 'jpy', 'nzd', 'sek', 'nok',
  'dkk', 'pln', 'czk', 'huf', 'ron', 'bgn', 'hrk', 'try', 'mxn', 'brl',
  'sgd', 'hkd', 'inr', 'myr', 'thb', 'php', 'idr', 'krw', 'twd', 'ils',
];

// GET /api/reputation/packages?country=EG
// Returns packages with local currency prices
router.get('/packages', async (req, res) => {
  try {
    const country = (req.query.country || req.headers['x-vercel-ip-country'] || 'US').toUpperCase();
    const currency = COUNTRY_CURRENCY[country] || 'USD';
    const rates = await getUSDRates();
    const rate = rates[currency] || 1;
    const symbol = CURRENCY_SYMBOLS[currency] || currency;

    const packages = PACKAGES.map(pkg => {
      const usdPrice = pkg.usdCents / 100;
      const localPrice = usdPrice * rate;
      // Round to sensible local values
      const localPriceRounded = localPrice < 10
        ? Math.round(localPrice * 100) / 100  // 2 decimal places for small amounts
        : Math.round(localPrice);              // round to integer for larger amounts

      return {
        ...pkg,
        usdPrice: usdPrice.toFixed(2),
        localPrice: localPriceRounded,
        localPriceFormatted: `${symbol} ${localPriceRounded}`,
        currency,
        symbol,
      };
    });

    res.json({ packages, currency, symbol, country, rate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reputation/checkout
// Creates Stripe checkout session for buying reputation points
router.post('/checkout', auth, async (req, res) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(503).json({ error: 'Stripe not configured' });
    }
    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });

    const { packageId, country } = req.body;
    const pkg = PACKAGES.find(p => p.id === packageId);
    if (!pkg) return res.status(400).json({ error: 'Invalid package' });

    const countryUpper = (country || 'US').toUpperCase();
    const currency = (COUNTRY_CURRENCY[countryUpper] || 'USD').toLowerCase();
    const rates = await getUSDRates();
    const usdRate = rates[currency.toUpperCase()] || 1;

    const usdPrice = pkg.usdCents / 100;

    // Use USD for currencies Stripe doesn't support natively
    const useCurrency = STRIPE_SUPPORTED.includes(currency) ? currency : 'usd';
    const useRate = useCurrency === 'usd' ? 1 : usdRate;
    const usePrice = usdPrice * useRate;
    const isZeroDecimal = ZERO_DECIMAL.includes(useCurrency.toUpperCase());
    const useAmount = isZeroDecimal ? Math.round(usePrice) : Math.round(usePrice * 100);

    // User email from JWT
    const userEmail = req.user.email || req.user.xtoxEmail || undefined;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      ...(userEmail ? { customer_email: userEmail } : {}),
      line_items: [{
        price_data: {
          currency: useCurrency,
          unit_amount: Math.max(useAmount, 50), // Stripe minimum ~$0.50
          product_data: {
            name: `${pkg.points} نقطة سمعة — XTOX`,
            description: `شراء ${pkg.points} نقطة سمعة على منصة XTOX (${pkg.points} Reputation Points)`,
            images: ['https://fox-kohl-eight.vercel.app/icon-192.png'],
          },
        },
        quantity: 1,
      }],
      metadata: {
        userId: req.user.id || req.user._id?.toString(),
        packageId: pkg.id,
        points: pkg.points.toString(),
        type: 'reputation_points',
      },
      success_url: `${process.env.FRONTEND_URL || 'https://fox-kohl-eight.vercel.app'}/honor-roll?purchased=${pkg.points}`,
      cancel_url: `${process.env.FRONTEND_URL || 'https://fox-kohl-eight.vercel.app'}/honor-roll`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('[REPUTATION] checkout error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
