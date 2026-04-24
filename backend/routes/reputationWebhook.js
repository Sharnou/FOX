// Reputation Stripe webhook handler — MUST be registered BEFORE express.json()
// because Stripe webhook signature verification requires raw body (Buffer)
import express from 'express';
import User from '../models/User.js';
import { addPointsToUser } from '../utils/points.js';

const router = express.Router();

router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ error: 'Stripe webhook not configured' });
  }

  const { default: Stripe } = await import('stripe').catch(() => ({ default: null }));
  if (!Stripe) return res.status(503).json({ error: 'Stripe not installed' });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[REPUTATION WEBHOOK] signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    if (session.metadata?.type === 'reputation_points') {
      const { userId, points } = session.metadata;
      const pts = parseInt(points, 10);
      try {
        const user = await User.findById(userId);
        if (user) {
          await addPointsToUser(user, pts, `شراء ${pts} نقطة سمعة بالدفع الإلكتروني (+${pts} نقطة)`);
          console.log(`[REPUTATION WEBHOOK] +${pts} pts credited to user ${userId}`);
        }
      } catch (e) {
        console.error('[REPUTATION WEBHOOK] credit error:', e.message);
      }
    }
  }

  res.json({ received: true });
});

export default router;
