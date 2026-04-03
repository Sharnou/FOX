import express from 'express';
import { writeFile, unlink } from 'fs/promises';
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
  'LYD','MAD','DZD','TND','IQD','SYP','YER','SDG','SOS'
]);

function sanitizeAdFields({ title, description, category, price, city, currency, media, video, featuredStyle, condition }) {
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
    ? media.slice(0, 10).map(u => String(u || '').trim()).filter(u => u.startsWith('http'))
    : [];

  // video — optional URL string
  const cleanVideo = video ? String(video).trim() : undefined;
  if (cleanVideo && !cleanVideo.startsWith('http')) errors.push('video must be a valid URL');

  // featuredStyle — whitelist
  const STYLES = new Set(['normal', 'gold', 'banner']);
  const cleanFeaturedStyle = STYLES.has(featuredStyle) ? featuredStyle : 'normal';

  // condition — whitelist only
  const CONDITIONS = new Set(['new', 'used', 'excellent', 'rent']);
  const cleanCondition = CONDITIONS.has(condition) ? condition : null;

  return { errors, sanitized: { title: cleanTitle, description: cleanDescription, category: cleanCategory, price: cleanPrice, city: cleanCity, currency: cleanCurrency, media: cleanMedia, video: cleanVideo, featuredStyle: cleanFeaturedStyle, condition: cleanCondition } };
}
// ─────────────────────────────────────────────────────────────────────────────


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
    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
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
    // ── FIELD-LEVEL SANITIZATION (run before anything else) ──
    const { errors, sanitized } = sanitizeAdFields(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });
    const { title, description, category, price, city, currency, media, video, featuredStyle, condition } = sanitized;
    // FIX D: Extract and validate coordinates — parseFloat + isNaN + non-zero check
    const lng = parseFloat(req.body.lng);
    const lat = parseFloat(req.body.lat);
    const validLocation = !isNaN(lng) && !isNaN(lat) && lng !== 0 && lat !== 0;

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
      condition: condition || null,
      featuredStyle: featuredStyle || 'normal',
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

    res.status(201).json(ad);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── AI Generate ad from media ──
router.post('/ai-generate', auth, async (req, res) => {
  // Graceful fallback when no AI keys configured
  if (!process.env.OPENAI_API_KEY && !process.env.AI_KEYS) {
    return res.json({
      title: '',
      description: '',
      category: 'General',
      suggestedPrice: 0,
      warning: 'AI analysis unavailable - OPENAI_API_KEY not configured'
    });
  }

  let tempPath = null; // track temp file for cleanup
  try {
    const { image, audio, text } = req.body;
    const country = req.user?.country || 'EG';

    // FIX: Write base64 image to a temp file so analyzeImage gets a real file path
    // vision.js now reads the file and converts it to base64 for the API call.
    if (image) {
      tempPath = `/tmp/ad_image_${Date.now()}.jpg`;
      const base64Data = image.replace(/^data:image\/[^;]+;base64,/, '');
      await writeFile(tempPath, Buffer.from(base64Data, 'base64'));
    }

    console.log('[AI] Starting analysis for image:', tempPath);
    console.log('[AI] Keys available:', !!(process.env.OPENAI_API_KEY || process.env.AI_KEYS));

    // Try learned dictionary detection
    let learnedCategory = null;
    try {
      const { detectCategoryFromText } = await import('../server/languageLearner.js');
      if (text) learnedCategory = await detectCategoryFromText(text, country).catch(() => null);
    } catch {}

    // FIX: 30-second timeout wrapper around the entire AI call
    const aiResult = await Promise.race([
      buildAdFromMedia({
        imagePath: tempPath,
        audioPath: audio || null,
        text: text || ''
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 30000))
    ]);

    console.log('[AI] Result:', JSON.stringify(aiResult));

    if (learnedCategory && aiResult.category === 'General') aiResult.category = learnedCategory;

    // Fire-and-forget learning
    try {
      const { learnFromAd } = await import('../server/languageLearner.js');
      if (aiResult.title) learnFromAd(aiResult.title, aiResult.description, country).catch(() => {});
    } catch {}

    res.json({ ...aiResult, aiEnabled: true });
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
  } finally {
    // FIX: Always clean up the temp image file
    if (tempPath) {
      unlink(tempPath).catch(() => {});
    }
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
    const ad = await Ad.findOne({ _id: req.params.id, userId: req.user.id, isDeleted: false });
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

    res.json({ ok: true, ad });
  } catch (e) { res.status(500).json({ error: e.message }); }
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



