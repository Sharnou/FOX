import express from 'express';
import { auth } from '../middleware/auth.js';
import PushSubscription from '../models/PushSubscription.js';
import User from '../models/User.js';
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
  // D1: VAPID public key — env var preferred; hardcoded fallback matches spec
  const key = process.env.VAPID_PUBLIC_KEY || 'BF4po3DK_lsqgzuEJ1Su7WSdxXX8xkzjnDQYF3tpe4DftSO6KRh5heBWOSYfef4A76iV1AX4H20hGPiDzo7IIrs';
  res.json({ key });
});

// POST /api/push/ping — background sync calls this to keep lastSeen fresh (WhatsApp-like presence)
router.post('/ping', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { lastSeen: new Date(), isOnline: true });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/push/online-status/:userId — get real-time online status of a user
router.get('/online-status/:userId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('isOnline lastSeen');
    if (!user) return res.status(404).json({ error: 'not found' });
    const onlineThreshold = 5 * 60 * 1000; // 5 minutes
    const recentlyOnline = user.lastSeen && (Date.now() - user.lastSeen.getTime()) < onlineThreshold;
    res.json({
      isOnline: user.isOnline || recentlyOnline,
      lastSeen: user.lastSeen,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
