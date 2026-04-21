// backend/routes/calls.js
// Call-related REST endpoints (push notification for offline calls)
// Socket.IO handles real-time call signaling (see server/socket.js)
import express from 'express';
import { auth } from '../middleware/auth.js';
import PushSubscription from '../models/PushSubscription.js';

const router = express.Router();

// POST /api/calls/push
// Triggered by frontend /api/send-call proxy when socket is unavailable
// Looks up user's push subscriptions and sends a web-push call notification
router.post('/push', auth, async (req, res) => {
  try {
    const { token: targetToken, data } = req.body;
    if (!targetToken) {
      return res.status(400).json({ error: 'token required' });
    }

    // If token looks like a userId (MongoDB ObjectId), look up subscriptions
    let subscriptions = [];
    try {
      const PushSub = PushSubscription;
      subscriptions = await PushSub.find({ user: targetToken }).lean();
    } catch (_) {}

    if (!subscriptions.length) {
      return res.json({ ok: true, sent: 0, note: 'no subscriptions found for user' });
    }

    const webpushModule = await import('web-push').catch(() => null);
    if (!webpushModule) {
      return res.json({ ok: true, sent: 0, note: 'web-push module not available' });
    }
    const webpush = webpushModule.default;

    const vapidPublicKey  = process.env.VAPID_PUBLIC_KEY  || 'BCTRfwu1JjM-5_-xGHauSSiVOBd6dkyEJJp3L57_-C6B-oDQW2IAmcnEVpwsGAsvmhBsvWLu9tMHe29zmcOn0UU';
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
    const vapidSubject    = process.env.VAPID_SUBJECT     || 'mailto:support@xtox.app';

    if (!vapidPrivateKey) {
      return res.json({ ok: true, sent: 0, note: 'VAPID_PRIVATE_KEY not set' });
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const payload = JSON.stringify({
      type: 'incoming_call',
      ...(data || {}),
    });

    let sent = 0;
    const stale = [];

    await Promise.all(subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(sub.subscription, payload);
        sent++;
      } catch (e) {
        if (e.statusCode === 410 || e.statusCode === 404) {
          stale.push(sub._id);
        }
        console.warn('[calls/push] sendNotification failed:', e.message);
      }
    }));

    // Clean up stale subscriptions
    if (stale.length) {
      await PushSubscription.deleteMany({ _id: { $in: stale } }).catch(() => {});
    }

    res.json({ ok: true, sent, stale: stale.length });
  } catch (e) {
    console.error('[calls/push] error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

export default router;
