import { Router } from 'express';
import mongoose from 'mongoose';
import { auth as requireAuth, adminAuth } from '../middleware/auth.js';
import Review from '../models/Review.js';
import Ad from '../models/Ad.js';
import User from '../models/User.js';
import { addPointsToUser } from '../utils/points.js';

const router = Router();

// ─── Points map: 1★ → -5 pts, 2★ → 1, 3★ → 3, 4★ → 7, 5★ → 10 ────────────
const pointsMap = { 1: -5, 2: 1, 3: 3, 4: 7, 5: 10 };

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/reviews — Submit a new review (auth required)
// Body: { adId, rating, comment }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  try {
    const { adId, rating, comment } = req.body;
    const reviewerId = req.user.id;

    // Validate required fields
    if (!adId)   return res.status(400).json({ error: 'معرّف الإعلان مطلوب' });
    if (!rating) return res.status(400).json({ error: 'التقييم مطلوب' });
    if (!comment || String(comment).trim().length < 5) {
      return res.status(400).json({ error: 'التعليق مطلوب (5 أحرف على الأقل)' });
    }

    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: 'التقييم يجب أن يكون بين 1 و 5' });
    }

    // Validate adId
    if (!mongoose.Types.ObjectId.isValid(adId))
      return res.status(400).json({ error: 'معرّف الإعلان غير صالح' });

    // Find the ad
    const ad = await Ad.findById(adId);
    if (!ad) return res.status(404).json({ error: 'الإعلان غير موجود' });

    // Get seller ID from ad
    const sellerId = String((ad.seller || ad.userId) || '');
    if (!sellerId) return res.status(400).json({ error: 'لا يمكن تحديد البائع' });

    // Reviewer must not be the seller
    if (reviewerId === sellerId) {
      return res.status(403).json({ error: 'لا يمكنك تقييم نفسك' });
    }

    // Build ad snapshot
    const adSnapshot = {
      title:    ad.title || '',
      price:    ad.price || 0,
      image:    (ad.images && ad.images[0]) || (ad.media && ad.media[0]) || '',
      category: ad.category || '',
    };

    // Create review (unique index enforces 1 per reviewer per ad)
    let review;
    try {
      review = await Review.create({
        ad:       adId,
        seller:   sellerId,
        reviewer: reviewerId,
        rating:   ratingNum,
        comment:  String(comment).trim(),
        adSnapshot,
      });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ error: 'لقد قيّمت هذا الإعلان مسبقاً' });
      }
      throw err;
    }

    // Award / deduct points from seller (non-blocking)
    try {
      const pts = pointsMap[ratingNum];
      const sellerDoc = await User.findById(sellerId);
      if (sellerDoc) {
        const sign = pts >= 0 ? '+' : '';
        await addPointsToUser(
          sellerDoc,
          pts,
          `تقييم ${ratingNum}★ من مستخدم (${sign}${pts} نقطة)`
        );
      }
    } catch (e) {
      console.error('[Reviews] Points award error:', e.message);
    }

    // Populate reviewer name for response
    await review.populate('reviewer', 'name avatar');
    res.status(201).json(review);
  } catch (err) {
    console.error('[Reviews POST] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reviews/ad/:adId — All reviews for a specific ad (public)
// Returns: { reviews, avgRating, totalCount }
// ─────────────────────────────────────────────────────────────────────────────
router.get('/ad/:adId', async (req, res) => {
  try {
    const { adId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(adId)) {
      return res.status(400).json({ error: 'معرّف الإعلان غير صالح' });
    }

    const reviews = await Review.find({
      ad: adId,
      deletedByAdmin: false,
    })
      .populate('reviewer', 'name avatar reputationPoints')
      .sort({ createdAt: -1 })
      .lean();

    const totalCount = reviews.length;
    const avgRating = totalCount > 0
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / totalCount) * 10) / 10
      : 0;

    res.json({ reviews, avgRating, totalCount });
  } catch (err) {
    console.error('[Reviews GET ad] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reviews/seller/:sellerId — All reviews for a seller (public)
// Returns: { reviews, avgRating, totalCount }
// ─────────────────────────────────────────────────────────────────────────────
router.get('/seller/:sellerId', async (req, res) => {
  try {
    const { sellerId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(sellerId)) {
      return res.status(400).json({ error: 'معرّف البائع غير صالح' });
    }

    const reviews = await Review.find({
      seller: sellerId,
      deletedByAdmin: false,
    })
      .populate('reviewer', 'name avatar reputationPoints')
      .sort({ createdAt: -1 })
      .lean();

    const totalCount = reviews.length;
    const avgRating = totalCount > 0
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / totalCount) * 10) / 10
      : 0;

    res.json({ reviews, avgRating, totalCount });
  } catch (err) {
    console.error('[Reviews GET seller] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reviews/check/:adId — Check if current user already reviewed this ad
// Returns: { reviewed: bool, review: object | null }
// ─────────────────────────────────────────────────────────────────────────────
router.get('/check/:adId', requireAuth, async (req, res) => {
  try {
    const { adId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(adId)) {
      return res.status(400).json({ error: 'معرّف الإعلان غير صالح' });
    }
    const review = await Review.findOne({
      ad: adId,
      reviewer: req.user.id,
      deletedByAdmin: false,
    }).lean();
    res.json({ reviewed: !!review, review: review || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/reviews/:id — Admin soft-delete + points reversal
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'معرّف التقييم غير صالح' });
    }
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ error: 'التقييم غير موجود' });
    if (review.deletedByAdmin) return res.status(400).json({ error: 'محذوف مسبقاً' });

    // Reverse the points effect
    try {
      const originalPts = pointsMap[review.rating] || 0;
      const sellerDoc = await User.findById(review.seller);
      if (sellerDoc && originalPts !== 0) {
        await addPointsToUser(
          sellerDoc,
          -originalPts,
          `حذف تقييم ${review.rating}★ بواسطة الأدمن (${originalPts > 0 ? '-' : '+'}${Math.abs(originalPts)} نقطة)`
        );
      }
    } catch (e) {
      console.error('[Reviews DELETE] Points reversal error:', e.message);
    }

    review.deletedByAdmin = true;
    await review.save();

    res.json({ success: true });
  } catch (err) {
    console.error('[Reviews DELETE] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
