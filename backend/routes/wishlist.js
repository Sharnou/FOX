import express from 'express';
import { auth } from '../middleware/auth.js';
import Ad from '../models/Ad.js';
import User from '../models/User.js';

const router = express.Router();

// POST /api/wishlist — add ad to wishlist (swipe right)
router.post('/', auth, async (req, res) => {
  try {
    const { adId } = req.body;
    if (!adId) return res.status(400).json({ error: 'adId required', errorAr: 'معرّف الإعلان مطلوب' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const already = user.wishlist && user.wishlist.map(String).includes(String(adId));
    if (!already) {
      user.wishlist = user.wishlist || [];
      user.wishlist.push(adId);
      await user.save();
    }

    res.json({ success: true, message: 'تم الحفظ في قائمتك', saved: !already });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/wishlist/:adId — remove from wishlist
router.delete('/:adId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.wishlist = (user.wishlist || []).filter(id => String(id) !== req.params.adId);
    await user.save();

    res.json({ success: true, message: 'تمت الإزالة من قائمتك' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/wishlist — get user's wishlist
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'wishlist',
      select: 'title price images location category currency status',
      match: { status: { $ne: 'deleted' } }
    });
    res.json(user.wishlist || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
