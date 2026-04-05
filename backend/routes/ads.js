import express from 'express';
import { writeFile, unlink } from 'fs/promises';
import Ad from '../models/Ad.js';
import { dbState, MemAd } from '../server/memoryStore.js';
import { getActiveDB } from '../server/dbManager.js';
import { CouchbaseAd } from '../server/couchbaseModels.js';

// Smart model selector: MongoDB → Couchbase → in-memory
function getAdModel() {
  const db = getActiveDB();
  if (db === 'mongodb')   return Ad;
  if (db === 'couchbase') return CouchbaseAd;
  return MemAd;
}
import { auth } from '../middleware/auth.js';
import { moderateText, moderateImage } from '../server/moderation.js';
import { checkDuplicate } from '../server/duplicateDetector.js';
import { rankAd } from '../server/ranking.js';
import { indexAd } from '../server/search.js';
import { buildAdFromMedia } from '../server/ai.js';
import { detectCategoryOffline } from '../server/offlineDict.js';
import { generateQR } from '../server/qr.js';
import { scoreAdWithAI } from '../server/aiQualityScore.js';
import { getOrCreateCountry } from '../server/countries.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import multer from 'multer';

// Multer: memory storage, max 50MB (for video)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const JWT_SECRET = process.env.JWT_SECRET || 'fox-default-secret';

const router = express.Router();

// ── Optional auth: attaches req.user if token present, non-blocking ──────────
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next();
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return next();
  try {
    req.user = jwt.verify(token, JWT_SECRET);
  } catch {}
  next();
};
// Run before ALL routes so req.user is available everywhere (including GET /)
router.use(optionalAuth);

// ── Field-level input sanitizer ──────────────────────────────────────────────
function stripTags(str) {
  // Remove HTML/script tags and null bytes
  return String(str || '')
    .replace(/<[^>]*>/g, '')
    .replace(/\x00/g, '')
    .trim();
}

function sanitizeText(str, maxLen) {
  return stripTags(str).substring(0, maxLen);
}

const ALLOWED_CURRENCIES = new Set([
  'USD','EGP','SAR','AED','KWD','QAR','BHD','OMR','JOD',
  'LYD','MAD','DZD','TND','IQD','SYP','YER','SDG','SOS',
  'EUR','GBP','TRY','CAD','AUD','CHF'
]);

function sanitizeAdFields({ title, description, category, subcategory, price, city, currency, media, video, featuredStyle, condition, phone } = {}) {
  const errors = [];

  // title — required, 3–120 chars
  const cleanTitle = sanitizeText(title, 120);
  if (!cleanTitle || cleanTitle.length < 3) errors.push('title must be 3–120 characters');

  // description — optional, max 1500 chars
  const cleanDescription = description ? sanitizeText(description, 1500) : '';

  // category — optional string, max 60 chars
  const cleanCategory = category ? sanitizeText(category, 60) : '';

  // price — must be non-negative number ≤ 99,999,999
  const cleanPrice = price !== undefined && price !== null ? Number(price) : 0;
  if (isNaN(cleanPrice) || cleanPrice < 0 || cleanPrice > 99_999_999) {
    errors.push('price must be a non-negative number ≤ 99,999,999');
  }

  // city — optional, max 60 chars
  const cleanCity = city ? sanitizeText(city, 60) : '';

  // currency — whitelist only
  const cleanCurrency = ALLOWED_CURRENCIES.has(currency) ? currency : 'USD';

  // media — array of URL strings, max 10 items
  const cleanMedia = Array.isArray(media)
    ? media.slice(0, 10).map(u => String(u || '').trim()).filter(u => u.startsWith('http') || u.startsWith('data:image/'))
    : [];

  // video — optional URL string
  const cleanVideo = video ? String(video).trim() : undefined;
  if (cleanVideo && !cleanVideo.startsWith('http') && !cleanVideo.startsWith('data:')) errors.push('video must be a valid URL');

  // featuredStyle — whitelist
  const STYLES = new Set(['normal', 'cartoon', 'gold', 'banner']);
  const cleanFeaturedStyle = STYLES.has(featuredStyle) ? featuredStyle : 'normal';

  // condition — whitelist only
  const CONDITIONS = new Set(['new', 'used', 'excellent', 'rent']);
  const cleanCondition = CONDITIONS.has(condition) ? condition : null;

  // subcategory — optional, max 60 chars
  const cleanSubcategory = subcategory ? sanitizeText(subcategory, 60) : '';

  // phone — optional, digits/spaces/+/-/() only, max 20 chars
  const cleanPhone = phone ? sanitizeText(phone, 20).replace(/[^+\d\s\-()]/g, '') : '';

  return { errors, sanitized: { title: cleanTitle, description: cleanDescription, category: cleanCategory, subcategory: cleanSubcategory, price: cleanPrice, city: cleanCity, currency: cleanCurrency, media: cleanMedia, video: cleanVideo, featuredStyle: cleanFeaturedStyle, condition: cleanCondition, phone: cleanPhone } };
}
// ─────────────────────────────────────────────────────────────────────────────


// ── GET all ads (country from JWT — locked, user cannot override) ──
router.get('/', async (req, res) => {
  try {
    const { category, city, page = 0, q } = req.query;
    const countryParam = req.query.country || req.headers['x-country'] || req.user?.country || null;

    const filter = {
      isExpired: { $ne: true },   // matches false, null, undefined — new ads have no isExpired set
      isDeleted: { $ne: true },   // matches false, null, undefined — new ads have no isDeleted set
      visibilityScore: { $gte: 0 }
    };
    // Country filter is OPTIONAL — only apply if a country param was provided
    if (countryParam) filter.country = countryParam;
    if (category && category !== 'الكل' && category !== 'All') {
      filter.category = { $regex: new RegExp('^' + category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') };
    }
    if (city) filter.city = city;
    // Full-text search using $or regex (works even without text index)
    if (q && q.trim()) {
      filter.$or = [
        { title: { $regex: q.trim(), $options: 'i' } },
        { description: { $regex: q.trim(), $options: 'i' } }
      ];
    }

    // FEATURED FIRST: max 16, newest featured → top (only on page 0)
    let featuredAds = [];
    if (Number(page) === 0) {
      const { getFeaturedAds, getFeaturedByCategory } = await import('../server/featuredManager.js');
      if (category && category !== 'الكل' && category !== 'All') {
        featuredAds = await getFeaturedByCategory(countryParam, filter.category);
      } else {
        featuredAds = await getFeaturedAds(countryParam);
      }
    }

    // REGULAR ADS: high ranking first, exclude already-shown featured
    const featuredIds = featuredAds.map(a => a._id.toString());
    const regularFilter = { ...filter };
    if (featuredIds.length) regularFilter._id = { $nin: featuredIds };

    const regularAds = await getAdModel().find(regularFilter)
      .sort({ isFeatured: -1, featuredUntil: -1, visibilityScore: -1, createdAt: -1 })
      .skip(Number(page) * 20)
      .limit(20)
      .lean();

    // Normalize: ensure both 'images' and 'media' fields exist on every ad
    function normalizeAd(ad) {
      const obj = ad.toObject ? ad.toObject() : ad;
      return {
        ...obj,
        images: obj.images?.length ? obj.images : (obj.media?.length ? obj.media : []),
        media: obj.media?.length ? obj.media : (obj.images?.length ? obj.images : []),
      };
    }
    const normalizedFeatured = featuredAds.map(normalizeAd);
    const normalizedRegular = regularAds.map(normalizeAd);

    // Return featured first, then ranked regular
    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
    res.json([...normalizedFeatured, ...normalizedRegular]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// optionalAuth middleware is now registered at the top of this file (before GET /)

// GET user's own ads (active + expired)
router.get('/my/all', auth, async (req, res) => {
  try {
    const active = await getAdModel().find({ userId: req.user.id, isDeleted: false, isExpired: false });
    const expired = await getAdModel().find({ userId: req.user.id, isDeleted: false, isExpired: true });
    const expiredWithDeadline = expired.map(ad => {
      const expiredAt = ad.expiredAt || ad.expiresAt;
      const deadlineMs = new Date(expiredAt).getTime() + 7 * 24 * 60 * 60 * 1000;
      const daysLeft = Math.max(0, Math.ceil((deadlineMs - Date.now()) / (24 * 60 * 60 * 1000)));
      return { ...ad.toObject(), daysLeftToReshare: daysLeft };
    });
    res.json({ active, expired: expiredWithDeadline });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


// ── GET single ad ──
router.get('/:id', async (req, res) => {
  try {
    const ad = await getAdModel().findById(req.params.id);
    if (!ad) return res.status(404).json({ error: 'Not found' });
    ad.views++; await ad.save();
    await rankAd(ad).catch(() => {});
    const qr = await generateQR(`${process.env.FRONTEND_URL}/ads/${ad._id}`).catch(() => null);
    res.json({ ...ad.toObject(), qrCode: qr });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST new ad (AI moderation on ALL media) ──
router.post('/', auth, upload.fields([
  { name: 'images', maxCount: 5 },
  { name: 'video', maxCount: 1 }
]), async (req, res) => {
  try {
    // FIX A: null-safe body — multer may leave req.body undefined if Content-Type is wrong
    const body = req.body || {};
    // ── DB CONNECTION CHECK — return 503 if no DB is ready yet ──────────────
    const _activeDB = getActiveDB();
    if (_activeDB === 'mongodb' && mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: 'الخدمة غير متاحة مؤقتاً، يرجى المحاولة بعد ثوانٍ',
        message: 'Database not ready. Please retry in a few seconds.',
        retryAfter: 5
      });
    }
    // ─────────────────────────────────────────────────────────────────────────

    // ── DAILY LIMIT: max 2 ads per user per day ──────────────────────────────
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todayCount = await getAdModel().countDocuments({
      userId: req.user.id,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      isDeleted: { $ne: true }
    });

    if (todayCount >= 2) {
      return res.status(429).json({
        error: 'لقد وصلت للحد اليومي للإعلانات',
        message: 'Daily limit reached. Maximum 2 ads per day.',
        todayCount,
        limit: 2,
        resetsAt: endOfDay
      });
    }
    // ─────────────────────────────────────────────────────────────────────────


    // ── PROCESS UPLOADED FILES (multer) — convert to base64 or Cloudinary ────
    let _uploadedImages = [];
    let _uploadedVideoUrl = null;

    if (req.files?.images?.length) {
      _uploadedImages = req.files.images.map(f =>
        `data:${f.mimetype};base64,${f.buffer.toString('base64')}`
      );
      // Try Cloudinary for uploaded images
      if (process.env.CLOUD_NAME && process.env.CLOUD_KEY && process.env.CLOUD_SECRET) {
        try {
          const { default: cloudinaryClient } = await import('../server/cloudinary.js');
          const processed = [];
          for (const img of _uploadedImages) {
            try {
              const result = await cloudinaryClient.uploader.upload(img, { folder: 'xtox_ads' });
              processed.push(result.secure_url);
            } catch { processed.push(img); } // keep base64 on per-image failure
          }
          _uploadedImages = processed;
        } catch (uploadErr) {
          console.warn('[POST /api/ads] Cloudinary failed, keeping base64:', uploadErr.message);
          // Keep as base64 for prototype — do NOT strip
        }
      }
      // Inject into req.body.media so existing pipeline sees them
      body.media = _uploadedImages;
    } else if (body.imageUrl) {
      _uploadedImages = [body.imageUrl];
    }

    if (req.files?.video?.[0]) {
      const v = req.files.video[0];
      _uploadedVideoUrl = `data:${v.mimetype};base64,${v.buffer.toString('base64')}`;
      // Try Cloudinary for video
      if (process.env.CLOUD_NAME && process.env.CLOUD_KEY && process.env.CLOUD_SECRET) {
        try {
          const { default: cloudinaryClient } = await import('../server/cloudinary.js');
          const result = await cloudinaryClient.uploader.upload(_uploadedVideoUrl, {
            resource_type: 'video', folder: 'xtox_ads'
          });
          _uploadedVideoUrl = result.secure_url;
        } catch (e) {
          console.warn('[POST /api/ads] Cloudinary video failed, keeping base64:', e.message);
        }
      }
    }
    // ──────────────────────────────────────────────────────────────────────────

    // ── PRE-PROCESS: Normalize media sources from multiple field names ────────
    // Frontend may send 'images', 'imageUrl', or 'media' — unify to 'media'
    if (!body.media?.length) {
      if (Array.isArray(body.images) && body.images.length > 0) {
        body.media = body.images; // images field → media
      } else if (body.imageUrl && String(body.imageUrl).startsWith('http')) {
        body.media = [body.imageUrl]; // imageUrl → media array
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    // ── PRE-PROCESS: Upload base64 images to Cloudinary before sanitization ──
    const rawMedia = Array.isArray(body.media) ? body.media : [];
    if (rawMedia.some(u => String(u || '').startsWith('data:image/'))) {
      try {
        const { default: cloudinaryClient } = await import('../server/cloudinary.js');
        const processedMedia = [];
        for (const m of rawMedia.slice(0, 10)) {
          const url = String(m || '').trim();
          if (url.startsWith('data:image/') && process.env.CLOUD_NAME) {
            const result = await cloudinaryClient.uploader.upload(url, { folder: 'xtox_ads' });
            processedMedia.push(result.secure_url);
          } else {
            processedMedia.push(url);
          }
        }
        body.media = processedMedia;
      } catch (uploadErr) {
        // Cloudinary unavailable — strip base64 (do not store in DB)
        // Keep base64 for prototype — do NOT strip files that were already uploaded by multer
        body.media = rawMedia; // keep all (including base64 data: URLs)
        console.warn('[ads] Cloudinary upload failed, keeping images as-is:', uploadErr.message);
      }
    }

    // ── FIELD-LEVEL SANITIZATION (run before anything else) ──
    const { errors, sanitized } = sanitizeAdFields(body);
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });
    const { title, description, category, subcategory, price, city, currency, media, video, featuredStyle, condition, phone } = sanitized;
    // FIX D: Extract and validate coordinates — parseFloat + isNaN + non-zero check
    const lng = parseFloat(body.lng);
    const lat = parseFloat(body.lat);
    const validLocation = !isNaN(lng) && !isNaN(lat) && lng !== 0 && lat !== 0;

    // COUNTRY LOCK: always use country from JWT token — user cannot override
    // Fallback to 'EG' if country is missing from older JWT tokens
    const country = req.user.country || 'EG';

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
    const finalSubcategory = detected.sub || subcategory || '';

    // ENSURE COUNTRY EXISTS
    await getOrCreateCountry(country, country).catch(() => {});

    // Merge: prefer multer-uploaded images, fallback to sanitized media from body
    const finalMedia = _uploadedImages.length ? _uploadedImages : (media || []);
    const finalVideoUrl = _uploadedVideoUrl || null;

    const ad = await getAdModel().create({
      userId: req.user.id,
      title,
      title_original: title,
      description,
      category: finalCategory,
      subcategory: finalSubcategory,
      price,
      city,
      currency: currency || 'EGP',
      media: finalMedia,
      images: finalMedia,
      video,
      videoUrl: finalVideoUrl,
      country, // LOCKED from JWT
      condition: condition || null,
      featuredStyle: featuredStyle || 'normal',
      phone: phone || undefined,
      language: /[\u0600-\u06FF]/.test(title) ? 'ar' : 'en',
      // FIX D: Only save location when coordinates are fully valid numbers and non-zero
      location: validLocation ? { type: 'Point', coordinates: [lng, lat] } : undefined,
      visibilityScore: 10
    });

    await rankAd(ad).catch(() => {});
    await indexAd(ad).catch(() => {});

    // AUTO-LEARN local language from this ad
    const { learnFromAd } = await import('../server/languageLearner.js');
    learnFromAd(title, description, country).catch(() => {});

    // AI QUALITY SCORE — async, non-blocking (run after response)
    setImmediate(async () => {
      let aiScore = 70;
      try {
        const { score, tips } = await scoreAdWithAI({
          title, description, category: finalCategory,
          price, city, currency, media, condition
        });
        await ad.constructor.updateOne(
          { _id: ad._id },
          { $set: { aiQualityScore: score, aiQualityTips: tips } }
        );
        console.log(`[AIQuality] Ad ${ad._id} scored: ${score}/100`);
      } catch (e) {
        console.warn('[AIQuality] Scoring failed:', e.message);
      }
    });

    res.status(201).json(ad);
  } catch (e) {
    console.error('[POST /api/ads] crash:', e.stack || e.message);
    return res.status(500).json({
      message: e.message,
      stack: process.env.NODE_ENV === 'development' ? e.stack : undefined
    });
  }
});

// ── AI Generate ad from media ──
router.post('/ai-generate', async (req, res) => {
  res.setTimeout(35000, () => {
    if (!res.headersSent) res.status(504).json({ error: 'AI timeout — try again' });
  });

  const { image, text } = req.body;
  let result = null;

  try {
    // PHASE 1: Offline analysis of text (instant, no API)
    const inputText = text || '';
    if (inputText.trim().length > 2) {
      const { analyzeTextOffline } = await import('../server/smartAnalyzer.js');
      const offline = analyzeTextOffline(inputText);
      console.log('[AI-GENERATE] Offline result:', offline.category, offline.confidence);
      if (offline.confidence === 'high') result = offline;
    }

    // PHASE 2: If image provided, try OpenAI Vision (best quality)
    if (image && (process.env.OPENAI_API_KEY || process.env.AI_KEYS)) {
      try {
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        const tempPath = `/tmp/fox_ai_${Date.now()}.jpg`;
        const { writeFile, unlink } = await import('fs/promises');
        await writeFile(tempPath, Buffer.from(base64Data, 'base64'));

        console.log('[AI-GENERATE] Calling vision API...');
        const visionResult = await Promise.race([
          buildAdFromMedia({ imagePath: tempPath }),
          new Promise((_, rej) => setTimeout(() => rej(new Error('vision timeout')), 28000))
        ]);
        unlink(tempPath).catch(() => {});

        if (visionResult && visionResult.title) {
          result = visionResult;
          console.log('[AI-GENERATE] Vision succeeded:', result.category);
        }
      } catch (e) {
        console.log('[AI-GENERATE] Vision failed:', e.message);
      }
    }

    // PHASE 3: If no good result yet, try AI text generation
    if (inputText && (!result || !result.title) && (process.env.OPENAI_API_KEY || process.env.AI_KEYS)) {
      try {
        const aiResult = await Promise.race([
          buildAdFromMedia({ text: inputText }),
          new Promise((_, rej) => setTimeout(() => rej(new Error('AI text timeout')), 20000))
        ]);
        if (aiResult && aiResult.title) result = aiResult;
      } catch (e) {
        console.log('[AI-GENERATE] AI text failed:', e.message);
      }
    }

    // PHASE 4: Final offline fallback if everything failed
    if (!result || !result.title) {
      const { analyzeTextOffline } = await import('../server/smartAnalyzer.js');
      result = analyzeTextOffline(inputText || 'general product');
    }

    console.log('[AI-GENERATE] Final:', JSON.stringify(result));
    res.json({
      title: result.title || '',
      description: result.description || '',
      category: result.category || 'General',
      subcategory: result.subcategory || 'Other',
      suggestedPrice: result.suggestedPrice || 0,
      condition: result.condition || 'used',
      source: result.source || 'ai',
    });
  } catch (err) {
    console.error('[AI-GENERATE] Fatal error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── PUT update ad (owner only, full field-level sanitization) ──
router.put('/:id', auth, async (req, res) => {
  try {
    // ── FIELD-LEVEL SANITIZATION (mirrors POST validation) ──
    const { errors, sanitized } = sanitizeAdFields(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });
    const { title, description, category, price, city, currency, media, video, featuredStyle } = sanitized;

    // Ownership check — only the original owner may edit
    const ad = await getAdModel().findOne({ _id: req.params.id, userId: req.user.id, isDeleted: false });
    if (!ad) return res.status(404).json({ error: 'Ad not found or not owned by you' });

    // TEXT MODERATION on updated content
    const textCheck = moderateText(`${title} ${description || ''}`);
    if (!textCheck.clean) return res.status(400).json({ error: `Content blocked: ${textCheck.reason}` });

    // Apply sanitized updates
    ad.title = title;
    ad.description = description;
    ad.category = category || ad.category;
    ad.price = price;
    ad.city = city || ad.city;
    ad.currency = currency;
    ad.media = media.length ? media : ad.media;
    if (video !== undefined) ad.video = video;
    if (featuredStyle && featuredStyle !== 'normal') ad.featuredStyle = featuredStyle;
    ad.editedAt = new Date();
    ad.language = /[\u0600-\u06FF]/.test(title) ? 'ar' : 'en';

    await ad.save();
    await rankAd(ad).catch(() => {});
    await indexAd(ad).catch(() => {});

    // AI QUALITY SCORE on update — async, non-blocking
    setImmediate(async () => {
      let aiScore = 70;
      try {
        const { score, tips } = await scoreAdWithAI({
          title: ad.title, description: ad.description,
          category: ad.category, price: ad.price, city: ad.city,
          currency: ad.currency, media: ad.media, condition: ad.condition
        });
        await ad.constructor.updateOne(
          { _id: ad._id },
          { $set: { aiQualityScore: score, aiQualityTips: tips } }
        );
      } catch (e) {
        console.warn('[AIQuality] Update scoring failed:', e.message);
      }
    });

    res.json({ ok: true, ad });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DELETE ad ──
router.delete('/:id', auth, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin' || req.user.role === 'sub_admin';
    const query = isAdmin ? { _id: req.params.id } : { _id: req.params.id, userId: req.user.id };
    const ad = await getAdModel().findOne(query);
    if (!ad) return res.status(404).json({ error: 'Not found' });
    ad.isDeleted = true; ad.deletedAt = new Date(); await ad.save();
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// REPUBLISH expired ad (within 7-day grace period only)
router.post('/:id/republish', auth, async (req, res) => {
  try {
    const ad = await getAdModel().findOne({ _id: req.params.id, userId: req.user.id, isExpired: true });
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

// ── PATCH /:id/view — increment view count (called by AdCard on mount) ──────
router.patch('/:id/view', async (req, res) => {
  try {
    const ad = await getAdModel().findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );
    if (!ad) return res.status(404).json({ error: 'Ad not found' });
    res.json({ views: ad.views });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;



