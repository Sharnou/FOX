import express from 'express';
import { auth } from '../middleware/auth.js';
import PushSubscription from '../models/PushSubscription.js';
import { dbState } from '../server/memoryStore.js';

const router = express.Router();

// POST /api/push/subscribe — save push subscription for current user
router.post('/subscribe', auth, async (req, res) => {
  try {
    if (dbState.usingMemoryStore) {
      return res.json({ ok: true, note: 'memory-store mode — subscriptions not persisted' });
    }
    const { subscription } = req.body;
    if (!subscription?.endpoint) {
      return res.status(400).json({ error: 'Invalid subscription object' });
    }

    // Upsert by user + endpoint (avoid duplicates)
    await PushSubscription.findOneAndUpdate(
      { user: req.user.id, 'subscription.endpoint': subscription.endpoint },
      {
        user: req.user.id,
        subscription,
        userAgent: req.headers['user-agent'] || '',
      },
      { upsert: true, returnDocument: 'after' }
    );

    res.json({ ok: true });
  } catch (e) {
    console.error('[Push] subscribe error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/push/unsubscribe — remove subscription
router.delete('/unsubscribe', auth, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      await PushSubscription.deleteOne({ user: req.user.id, 'subscription.endpoint': endpoint });
    } else {
      await PushSubscription.deleteMany({ user: req.user.id });
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// GET /api/push/vapid-public-key — returns VAPID public key for frontend subscription
router.get('/vapid-public-key', (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY || 'BCTRfwu1JjM-5_-xGHauSSiVOBd6dkyEJJp3L57_-C6B-oDQW2IAmcnEVpwsGAsvmhBsvWLu9tMHe29zmcOn0UU';
  res.json({ key });
});

export default router;
