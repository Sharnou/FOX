/**
 * Notifications route — /api/notifications
 * Reads notifications from User.notifications array in MongoDB.
 * Falls back to empty array if DB unavailable.
 */
import express from 'express';
import mongoose from 'mongoose';
import { auth } from '../middleware/auth.js';
import { getActiveDB } from '../server/dbManager.js';

const router = express.Router();

// Helper: get User model safely
async function getUserModel() {
  const db = getActiveDB();
  if (db !== 'mongodb') return null;
  return mongoose.models.User || (await import('../models/User.js')).default;
}

// GET /api/notifications — fetch user's notifications
router.get('/', auth, async (req, res) => {
  try {
    const User = await getUserModel();
    if (!User) return res.json([]);
    const user = await User.findById(req.user.id).select('notifications').lean();
    if (!user) return res.json([]);
    const notifs = (user.notifications || [])
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 50);
    res.json(notifs);
  } catch (e) {
    console.error('[Notifications] GET error:', e.message);
    res.json([]); // Graceful fallback — never break the frontend
  }
});

// POST /api/notifications/read-all — mark all as read
router.post('/read-all', auth, async (req, res) => {
  try {
    const User = await getUserModel();
    if (!User) return res.json({ success: true });
    await User.updateOne(
      { _id: req.user.id },
      { $set: { 'notifications.$[].read': true } }
    );
    res.json({ success: true });
  } catch (e) {
    console.error('[Notifications] read-all error:', e.message);
    res.json({ success: true }); // Don't fail the frontend
  }
});

// PATCH /api/notifications/:id/read — mark one as read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const User = await getUserModel();
    if (!User) return res.json({ success: true });
    await User.updateOne(
      { _id: req.user.id, 'notifications._id': req.params.id },
      { $set: { 'notifications.$.read': true } }
    );
    res.json({ success: true });
  } catch (e) {
    console.error('[Notifications] read error:', e.message);
    res.json({ success: true });
  }
});

// DELETE /api/notifications/:id — delete one notification
router.delete('/:id', auth, async (req, res) => {
  try {
    const User = await getUserModel();
    if (!User) return res.json({ success: true });
    await User.updateOne(
      { _id: req.user.id },
      { $pull: { notifications: { _id: req.params.id } } }
    );
    res.json({ success: true });
  } catch (e) {
    console.error('[Notifications] delete error:', e.message);
    res.json({ success: true });
  }
});


// PUT /api/notifications/:id/read — alias for PATCH (some frontends use PUT)
router.put('/:id/read', auth, async (req, res) => {
  try {
    const User = await getUserModel();
    if (!User) return res.json({ success: true });
    await User.updateOne(
      { _id: req.user.id, 'notifications._id': req.params.id },
      { $set: { 'notifications.$.read': true } }
    );
    res.json({ success: true });
  } catch (e) {
    console.error('[Notifications] PUT read error:', e.message);
    res.json({ success: true });
  }
});

export default router;