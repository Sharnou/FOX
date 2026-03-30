import express from 'express';
import Ad from '../models/Ad.js';
import { auth } from '../middleware/auth.js';
import { moderateText, moderateImage } from '../server/moderation.js';
import { checkDuplicate } from '../server/duplicateDetector.js';
import { rankAd } from '../server/ranking.js';
import { indexAd } from '../server/search.js';
import { buildAdFromMedia } from '../server/ai.js';
import { detectCategoryOffline } from '../server/offlineDict.js';
import { generateQR } from '../server/qr.js';
import { getOrCreateCountry } from '../server/countries.js';

const router = express.Router();

// ── GET all ads (country from JWT — locked, user cannot override) ──
router.get('/', async (req, res) => {
  try {
    const country = req.user?.country || req.headers['x-country'] || req.query.country || 'EG';
    const { category, city, page = 0 } = req.query;

    const filter = {
      country,
      isExpired: false,
      isDeleted: false,
      visibilityScore: { $gt: 0 }
    };
    if (category && category !== 'الكل' && category !== 'All') filter.category = category;
    if (city) filter.city = city;

    // FEATURED FIRST: max 16, newest featured → top (only on page 0)
    let featuredAds = [];
    if (Number(page) === 0) {
      const { getFeaturedAds, getFeaturedByCategory } = await import('../server/featuredManager.js');
      if (category && category !== 'الكل' && category !== 'All') {
        featuredAds = await getFeaturedByCategory(country, filter.category);
      } else {
        featuredAds = await getFeaturedAds(country);
      }
    }

    // REGULAR ADS: high ranking first, exclude already-shown featured
    const featuredIds = featuredAds.map(a => a._id.toString());
    const regularFilter = { ...filter };
    if (featuredIds.length) regularFilter._id = { $nin: featuredIds };

    const regularAds = await Ad.find(regularFilter)
      .sort({ isFeatured: -1, featuredUntil: -1, visibilityScore: -1, createdAt: -1 })
      .skip(Number(page) * 20)
      .limit(20);

    // Return featured first, then ranked regular
    res.json([...featuredAds, ...regularAds]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Middleware to auto-attach user country from token for authenticated routes
router.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    try {
      import('jsonwebtoken').then(({ default: jwt }) => {
        const decoded = jwt.verify(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET);
        if (!req.user) req.user = decoded;
        next();
      }).catch(() => next());
    } catch { next(); }
  } else { next(); }
});

// ── GET single ad ──
router.get('/:id', async (req, res) => {
  try {
    const ad = await Ad.findById(req.params.id).populate('userId', 'name avatar lastActive');
    if (!ad) return res.status(404).json({ error: 'Not found' });
    ad.views++; await ad.save();
    await rankAd(ad).catch(() => {});
    const qr = await generateQR(`${process.env.FRONTEND_URL}/ads/${ad._id}`).catch(() => null);
    res.json({ ...ad.toObject(), qrCode: qr });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST new ad (AI moderation on ALL media) ──
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, category, price, city, currency, media, video, featuredStyle } = req.body;

    // COUNTRY LOCK: always use country from JWT token — user cannot override
    const country = req.user.country;
    if (!country) return res.status(400).json({ error: 'Country not set on your account' });

    // TEXT MODERATION
    const textCheck = moderateText(`${title} ${description || ''}`);
    if (!textCheck.clean) return res.status(400).json({ error: `Content blocked: ${textCheck.reason}` });

    // IMAGE AI MODERATION (scan every uploaded image)
    if (media && media.length > 0) {
      for (const imageUrl of media) {
        const imgCheck = await moderateImage(imageUrl).catch(() => ({ clean: true }));
        if (!imgCheck.clean) {
          return res.status(400).json({ error: `Image blocked: contains ${imgCheck.reason}` });
        }
      }
    }

    // DUPLICATE CHECK
    if (await checkDuplicate(title, category, city, req.user.id)) {
      return res.status(400).json({ error: 'Duplicate ad detected' });
    }

    // AUTO CATEGORY DETECTION (offline first)
    const detected = detectCategoryOffline(`${title} ${description || ''}`);
    const finalCategory = category || detected.main;
    const finalSubcategory = detected.sub;

    // ENSURE COUNTRY EXISTS
    await getOrCreateCountry(country, country).catch(() => {});

    const ad = await Ad.create({
      userId: req.user.id,
      title,
      title_original: title,
      description,
      category: finalCategory,
      subcategory: finalSubcategory,
      price,
      city,
      currency: currency || 'USD',
      media: media || [],
      video,
      country, // LOCKED from JWT
      featuredStyle: featuredStyle || 'normal',
      language: /[\u0600-\u06FF]/.test(title) ? 'ar' : 'en'
    });

    await rankAd(ad).catch(() => {});
    await indexAd(ad).catch(() => {});

    // AUTO-LEARN local language from this ad
    const { learnFromAd } = await import('../server/languageLearner.js');
    learnFromAd(title, description, country).catch(() => {});

    res.status(201).json(ad);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── AI Generate ad from media ──
router.post('/ai-generate', auth, async (req, res) => {
  try {
    const { image, audio, text } = req.body;
    const country = req.user?.country || 'EG';

    // Try learned dictionary detection
    let learnedCategory = null;
    try {
      const { detectCategoryFromText, learnFromAd } = await import('../server/languageLearner.js');
      if (text) learnedCategory = await detectCategoryFromText(text, country).catch(() => null);
    } catch {}

    const result = await buildAdFromMedia({
      imagePath: image || null,
      audioPath: audio || null,
      text: text || ''
    });

    if (learnedCategory && result.category === 'General') result.category = learnedCategory;

    // Fire-and-forget learning
    try {
      const { learnFromAd } = await import('../server/languageLearner.js');
      if (result.title) learnFromAd(result.title, result.description, country).catch(() => {});
    } catch {}

    res.json({ ...result, aiEnabled: true });
  } catch (e) {
    // Always return something useful — never fail completely
    console.warn('[AI Generate] Failed, using offline mode:', e.message);
    try {
      const { detectCategoryOffline } = await import('../server/offlineDict.js');
      const detected = detectCategoryOffline(req.body.text || '');
      return res.json({
        title: (req.body.text || '').slice(0, 60),
        description: '',
        category: detected.main || 'General',
        subcategory: detected.sub || 'Other',
        suggestedPrice: 0,
        language: 'ar',
        hashtags: [],
        aiEnabled: false,
        message: 'AI offline — using smart detection'
      });
    } catch {}
    res.json({ title: (req.body.text || '').slice(0, 60), description: '', category: 'General', subcategory: 'Other', suggestedPrice: 0, language: 'ar', hashtags: [], aiEnabled: false });
  }
});

// ── DELETE ad ──
router.delete('/:id', auth, async (req, res) => {
  try {
    const ad = await Ad.findOne({ _id: req.params.id, userId: req.user.id });
    if (!ad) return res.status(404).json({ error: 'Not found' });
    ad.isDeleted = true; ad.deletedAt = new Date(); await ad.save();
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET user's own ads (active + expired)
router.get('/my/all', auth, async (req, res) => {
  try {
    const active = await Ad.find({ userId: req.user.id, isDeleted: false, isExpired: false }).sort({ createdAt: -1 });
    const expired = await Ad.find({ userId: req.user.id, isDeleted: false, isExpired: true }).sort({ expiredAt: -1 });
    const expiredWithDeadline = expired.map(ad => {
      const expiredAt = ad.expiredAt || ad.expiresAt;
      const deadlineMs = new Date(expiredAt).getTime() + 7 * 24 * 60 * 60 * 1000;
      const daysLeft = Math.max(0, Math.ceil((deadlineMs - Date.now()) / (24 * 60 * 60 * 1000)));
      return { ...ad.toObject(), daysLeftToReshare: daysLeft };
    });
    res.json({ active, expired: expiredWithDeadline });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// REPUBLISH expired ad (within 7-day grace period only)
router.post('/:id/republish', auth, async (req, res) => {
  try {
    const ad = await Ad.findOne({ _id: req.params.id, userId: req.user.id, isExpired: true });
    if (!ad) return res.status(404).json({ error: 'Expired ad not found' });

    const expiredAt = ad.expiredAt || ad.expiresAt;
    const deadline = new Date(expiredAt).getTime() + 7 * 24 * 60 * 60 * 1000;
    if (Date.now() > deadline) {
      return res.status(400).json({ error: 'Grace period expired. Please create a new ad.' });
    }

    ad.isExpired = false;
    ad.expiredAt = null;
    ad.expiresAt = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000);
    ad.republishedCount = (ad.republishedCount || 0) + 1;
    ad.createdAt = new Date();
    await ad.save();

    res.json({ ok: true, ad, message: 'Ad republished for 45 more days' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;

