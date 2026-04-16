import express from 'express';
import multer from 'multer';
import path from 'path';
import User from '../models/User.js';
import Ad from '../models/Ad.js';
import Review from '../models/Review.js';
import { auth } from '../middleware/auth.js';
import { addPointsToUser } from '../utils/points.js';

const router = express.Router();

// GET full seller profile
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  // Guard: reject [object Object], non-string, too-short, or non-MongoDB-ObjectId values
  if (!id || id === 'undefined' || id === 'null' || id === '[object Object]' ||
      id.length < 5 || !/^[a-f0-9]{24}$/i.test(id)) {
    return res.status(400).json({ success: false, error: 'Invalid user ID' });
  }
  try {
    const user = await User.findById(id).select('-password -registrationIp -fcmToken');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const ads = await Ad.find({ userId: id, isDeleted: { $ne: true }, isExpired: { $ne: true } }).sort({ createdAt: -1 }).limit(20).lean();
    const reviews = await Review.find({ seller: id }).populate('reviewer', 'name avatar').sort({ createdAt: -1 }).limit(20);

    const avgRating = reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : null;

    res.json({ user, ads, reviews, avgRating, reviewCount: reviews.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST review on seller
router.post('/:id/review', auth, async (req, res) => {
  try {
    const { rating, comment, adId } = req.body;
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot review yourself' });

    // ── Input Validation ──────────────────────────────────────────────────
    const ratingNum = Number(rating);
    if (!rating || !Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
    }
    if (comment !== undefined && (typeof comment !== 'string' || comment.trim().length > 500)) {
      return res.status(400).json({ error: 'Comment must be 500 characters or fewer' });
    }
    const cleanComment = comment !== undefined ? comment.trim() : undefined;
    // ─────────────────────────────────────────────────────────────────────

    // Use the correct Review schema fields: seller, reviewer, ad (NOT sellerId, buyerId, adId)
    // Require adId for the review (needed for unique index {ad, reviewer})
    if (!adId) return res.status(400).json({ error: 'adId required for review' });
    const review = await Review.findOneAndUpdate(
      { ad: adId, reviewer: req.user.id },
      { ad: adId, seller: req.params.id, reviewer: req.user.id, rating: ratingNum, comment: cleanComment || '' },
      { upsert: true, new: true, runValidators: true }
    );

    // Update seller reputation
    const all = await Review.find({ seller: req.params.id });
    const avg = all.reduce((s, r) => s + r.rating, 0) / all.length;
    await User.findByIdAndUpdate(req.params.id, { reputation: Math.round(avg * 20) }); // 5 stars = 100 rep

    res.json(review);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT update own profile
router.put('/me', auth, async (req, res) => {
  try {
    const { name, city, avatar, phone, username, bio } = req.body;

    // ── Input Validation & Sanitization ───────────────────────────────────
    const update = {};

    if (name !== undefined) {
      const cleanName = typeof name === 'string' ? name.trim().slice(0, 100) : null;
      if (cleanName !== null && cleanName.length < 2) {
        return res.status(400).json({ error: 'Name must be at least 2 characters' });
      }
      if (cleanName !== null) update.name = cleanName;
    }

    if (city !== undefined) {
      const cleanCity = typeof city === 'string' ? city.trim().slice(0, 60) : null;
      if (cleanCity !== null) update.city = cleanCity;
    }

    if (avatar !== undefined) {
      if (typeof avatar !== 'string' || (!avatar.startsWith('http://') && !avatar.startsWith('https://'))) {
        return res.status(400).json({ error: 'Avatar must be a valid URL' });
      }
      update.avatar = avatar.trim().slice(0, 500);
    }

    // Phone / WhatsApp number — used on all ads from this seller
    if (phone !== undefined) {
      const cleanPhone = String(phone || '').replace(/[^+\d\s\-()]/g, '').slice(0, 20);
      update.phone = cleanPhone;
    }

    if (username !== undefined) {
      update.username = String(username || '').trim().slice(0, 50);
    }

    if (bio !== undefined) {
      update.bio = String(bio || '').trim().slice(0, 500);
    }
    // ──────────────────────────────────────────────────────────────────────

    const updatedUser = await User.findByIdAndUpdate(req.user.id, update, { new: true }).select('-password');

    // ── PROFILE COMPLETION BONUS: +10 points (one-time) ────────────────────
    // Awarded once when user has name + phone + avatar all set
    try {
      if (!updatedUser.profileBonusAwarded) {
        const hasName   = !!updatedUser.name?.trim();
        const hasPhone  = !!updatedUser.phone?.trim();
        const hasAvatar = !!updatedUser.avatar?.trim();
        if (hasName && hasPhone && hasAvatar) {
          await addPointsToUser(updatedUser, 10, 'اكتمال الملف الشخصي +10 نقاط');
          await User.findByIdAndUpdate(req.user.id, { profileBonusAwarded: true });
          updatedUser.profileBonusAwarded = true;
        }
      }
    } catch (_bonusErr) {
      console.warn('[PUT /profile/me] Profile bonus failed (non-fatal):', _bonusErr.message);
    }

    res.json(updatedUser);
  } catch (e) { res.status(500).json({ error: e.message }); }
});


// ── Change 4: PATCH /api/profile/avatar — upload avatar ─────────────────────
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
}).single('avatar');

router.patch('/avatar', auth, (req, res) => {
  avatarUpload(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    try {
      let avatarUrl;
      // Try Cloudinary if configured
      if (process.env.CLOUDINARY_ENABLED === 'true' || process.env.CLOUDINARY_CLOUD_NAME) {
        try {
          const { v2: cloudinary } = await import('cloudinary');
          cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
          });
          const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              { folder: 'xtox/avatars', transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }] },
              (error, result) => error ? reject(error) : resolve(result)
            );
            uploadStream.end(req.file.buffer);
          });
          avatarUrl = result.secure_url;
        } catch (cloudErr) {
          console.warn('[avatar] Cloudinary failed, using base64:', cloudErr.message);
          // Fall through to base64
        }
      }
      // Fallback: base64 data URL stored in MongoDB
      if (!avatarUrl) {
        avatarUrl = 'data:' + req.file.mimetype + ';base64,' + req.file.buffer.toString('base64');
      }
      const user = await User.findByIdAndUpdate(
        req.user.id,
        { avatar: avatarUrl },
        { new: true }
      ).select('-password');
      res.json({ avatar: user.avatar, user });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
});

export default router;
