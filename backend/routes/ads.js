import express from 'express';
import { writeFile, unlink } from 'fs/promises';
import Ad from '../models/Ad.js';
import { dbState, MemAd } from '../server/memoryStore.js';
import { getActiveDB } from '../server/dbManager.js';
import { CouchbaseAd } from '../server/couchbaseModels.js';

import User from '../models/User.js';
import { auth } from '../middleware/auth.js';
import { computeSellerScore } from '../utils/sellerScore.js';
import { moderateText, moderateImage } from '../server/moderation.js';
import { checkDuplicate } from '../server/duplicateDetector.js';
import { rankAd } from '../server/ranking.js';
import { indexAd } from '../server/search.js';
import { buildAdFromMedia } from '../server/ai.js';
import { detectCategoryOffline } from '../server/offlineDict.js';
import { detectSubcategory } from '../server/categoryDetector.js';
import { generateQR } from '../server/qr.js';
import { scoreAdWithAI } from '../server/aiQualityScore.js';
import { getOrCreateCountry } from '../server/countries.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import multer from 'multer';
import { CLOUDINARY_ENABLED } from '../server/cloudinary.js';
import { moderateAdContent } from '../utils/adModeration.js';
import { createWPPost, deleteWPPost, updateWPPost } from '../utils/wordpress.js';
import { addPointsToUser } from '../utils/points.js';
import { locationToCountry, countryFromIP } from '../utils/geoCountry.js';

// ── Anti-gaming: 1 view point per user per ad per 24h ───────────────────────
// Key: "${adId}-${userId}", value: timestamp of last point award
const viewThrottle = new Map();
// Clean stale entries every hour
setInterval(() => {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const [key, ts] of viewThrottle.entries()) {
    if (ts < cutoff) viewThrottle.delete(key);
  }
}, 60 * 60 * 1000);

// Smart model selector: MongoDB → Couchbase → in-memory
function getAdModel() {
  const db = getActiveDB();
  if (db === 'mongodb')   return Ad;
  if (db === 'couchbase') return CouchbaseAd;
  return MemAd;
}

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
  // Accept both http URLs and base64 data: URLs (when Cloudinary is unavailable)
  const rawMedia = Array.isArray(media) ? media : (media ? [media] : []);
  const cleanMedia = rawMedia
    .slice(0, 10)
    .map(u => String(u || '').trim())
    .filter(u => u.startsWith('http') || u.startsWith('data:image/') || u.startsWith('data:video/'));

  // video — optional URL string
  const cleanVideo = video ? String(video).trim() : undefined;
  if (cleanVideo && !cleanVideo.startsWith('http') && !cleanVideo.startsWith('data:')) errors.push('video must be a valid URL');

  // featuredStyle — whitelist
  const STYLES = new Set(['normal', 'cartoon', 'gold', 'banner']);
  const cleanFeaturedStyle = STYLES.has(featuredStyle) ? featuredStyle : 'normal';

  // condition — whitelist only
  
  const cleanCondition = condition ? sanitizeText(String(condition), 50) : null;

  // subcategory — optional, max 60 chars
  const cleanSubcategory = subcategory ? sanitizeText(subcategory, 60) : '';

  // phone — optional, digits/spaces/+/-/() only, max 20 chars
  const cleanPhone = phone ? sanitizeText(phone, 20).replace(/[^+\d\s\-()]/g, '') : '';

  return { errors, sanitized: { title: cleanTitle, description: cleanDescription, category: cleanCategory, subcategory: cleanSubcategory, price: cleanPrice, city: cleanCity, currency: cleanCurrency, media: cleanMedia, video: cleanVideo, featuredStyle: cleanFeaturedStyle, condition: cleanCondition, phone: cleanPhone } };
}
// ─────────────────────────────────────────────────────────────────────────────


// ── GET all ads (country from JWT — locked, user cannot override) ──
// ── GET /countries — ad count by country ──────────────────────────────────
router.get("/countries", async (req, res) => {
  try {
    const results = await Ad.aggregate([
      { $match: { status: { $ne: "deleted" }, sold: { $ne: true }, isDeleted: { $ne: true }, isExpired: { $ne: true } } },
      { $group: { _id: "$country", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    const total = results.reduce((s, r) => s + r.count, 0);
    res.json({ total, countries: results.filter(r => r._id) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/', async (req, res) => {
  try {
    const { category, city, page = 0, q, search, limit, userId, subcategory: querySubcategory, subsub: querySubsub } = req.query;
    const searchQuery = q || search; // accept both ?q= and ?search=
    // COUNTRY LOCK: logged-in users are locked to their registered country; guests can filter by query param
    const countryParam = req.user?.country || req.query.country || req.headers['x-country'] || null;

    const filter = {
      isExpired: { $ne: true },   // matches false, null, undefined — new ads have no isExpired set
      isDeleted: { $ne: true },   // matches false, null, undefined — new ads have no isDeleted set
      visibilityScore: { $gte: 0 }
    };
    // If userId specified, show that user's own ads (including deleted/expired for owner viewing)
    // FIX: use $or to match both userId AND seller fields — older ads may only have seller set
    if (userId) {
      delete filter.isDeleted;
      delete filter.isExpired;
      filter.$or = [{ userId: userId }, { seller: userId }];
    }

    // Country filter is OPTIONAL — only apply if a country param was provided (not when filtering by userId)
    if (countryParam && !userId) filter.country = countryParam;
    if (category && category !== 'الكل' && category !== 'All') {
      filter.category = { $regex: new RegExp('^' + category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') };
    }
    if (city) filter.city = city;
    if (querySubcategory) filter.subcategory = querySubcategory;
    if (querySubsub) filter.subsub = querySubsub;
    // #127 — $text search (MongoDB full-text with relevance scoring)
    // $regex removed: $text is faster, supports Arabic, and enables relevance ranking
    // Note: handled below as early-return aggregation when searchQuery is present
    // Fallback to $regex is kept in a try-catch in case the text index is missing

    // GEO FILTER: if lat/lon/radius params provided, filter by location proximity
    // Uses $geoWithin/$centerSphere (no 2dsphere index required)
    const _lat = parseFloat(req.query.lat);
    const _lon = parseFloat(req.query.lon);
    const _radius = parseFloat(req.query.radius) || 5; // km
    if (!isNaN(_lat) && !isNaN(_lon) && _lat >= -90 && _lat <= 90 && _lon >= -180 && _lon <= 180) {
      try {
        filter.location = {
          $geoWithin: {
            $centerSphere: [[_lon, _lat], _radius / 6371] // radius in km ÷ Earth radius
          }
        };
      } catch (_geoErr) {
        console.warn('[GET /api/ads] Geo filter build failed (skipped):', _geoErr.message);
      }
    }

    // #127 — SEARCH: early-return aggregation with $text + relevance + promotion sort
    // When a search query is present, use full MongoDB text search and return immediately,
    // bypassing the featured-ads logic (search results are sorted by relevance + promotion)
    if (searchQuery && searchQuery.trim()) {
      const _q = searchQuery.trim();
      const _now = new Date();
      const _pageSize = Number(limit) > 0 ? Math.min(Number(limit), 100) : 20;
      const _skip = Number(page) * _pageSize;
      let searchResults = [];
      try {
        // Try $text search with relevance + promotion composite score
        searchResults = await Ad.aggregate([
          {
            $match: {
              ...filter,
              $text: { $search: _q },
            },
          },
          {
            $addFields: {
              _textScore: { $meta: 'textScore' },
              _promotionScore: {
                $switch: {
                  branches: [
                    { case: { $and: [{ $eq: ['$promotion.type', 'premium'] }, { $gt: ['$promotion.expiresAt', _now] }] }, then: 20 },
                    { case: { $and: [{ $eq: ['$promotion.type', 'featured'] }, { $gt: ['$promotion.expiresAt', _now] }] }, then: 10 },
                  ],
                  default: 0,
                },
              },
            },
          },
          { $sort: { _promotionScore: -1, _textScore: -1, createdAt: -1 } },
          { $skip: _skip },
          { $limit: _pageSize },
        ]);
      } catch (_textErr) {
        console.warn('[GET /api/ads] $text search failed, falling back to $regex:', _textErr.message);
        // Fallback: $regex (slower but works without text index)
        try {
          const _regexFilter = {
            ...filter,
            $or: [
              { title: { $regex: _q, $options: 'i' } },
              { description: { $regex: _q, $options: 'i' } },
              { subcategory: { $regex: _q, $options: 'i' } },
              { category: { $regex: _q, $options: 'i' } },
            ],
          };
          searchResults = await Ad.find(_regexFilter)
            .sort({ isFeatured: -1, createdAt: -1 })
            .skip(_skip)
            .limit(_pageSize)
            .lean();
        } catch (_regexErr) {
          console.warn('[GET /api/ads] $regex fallback also failed:', _regexErr.message);
          searchResults = [];
        }
      }
      // Normalize search results
      const normalizedSearch = searchResults.map(ad => {
        const obj = ad.toObject ? ad.toObject() : ad;
        return {
          ...obj,
          images: obj.images?.length ? obj.images : (obj.media?.length ? obj.media : []),
          media: obj.media?.length ? obj.media : (obj.images?.length ? obj.images : []),
        };
      });
      return res.json({ success: true, ads: normalizedSearch, total: normalizedSearch.length, page: Number(page) });
    }

    // FEATURED FIRST: max 16, newest featured → top (only on page 0)
    let featuredAds = [];
    if (Number(page) === 0) {
      try {
        const { getFeaturedAds, getFeaturedByCategory } = await import('../server/featuredManager.js');
        if (category && category !== 'الكل' && category !== 'All') {
          featuredAds = await getFeaturedByCategory(countryParam, filter.category);
        } else {
          featuredAds = await getFeaturedAds(countryParam);
        }
      } catch (_featuredErr) {
        // Featured ads fetch is non-critical — log and continue with regular ads
        console.warn('[GET /api/ads] Featured ads fetch failed (non-fatal):', _featuredErr.message);
        featuredAds = [];
      }
    }

    // REGULAR ADS: high ranking first, exclude already-shown featured
    const featuredIds = featuredAds.map(a => a._id.toString());
    const regularFilter = { ...filter };
    if (featuredIds.length) regularFilter._id = { $nin: featuredIds };

    // #126 — MAIN QUERY: aggregation pipeline with promotion sort
    // Premium (score=2) > Featured (score=1) > none (score=0), then by recency
    // This ensures promotion priority is applied BEFORE pagination (skip/limit)
    let regularAds = [];
    try {
      const _pageSize = Number(limit) > 0 ? Math.min(Number(limit), 100) : 20;
      const _skip = Number(page) * _pageSize;
      const _now = new Date();
      // Use aggregation for MongoDB (promotion-aware sort + correct pagination)
      // Fall back to .find() for non-MongoDB stores (Couchbase, MemAd)
      const _model = getAdModel();
      if (typeof _model.aggregate === 'function') {
        regularAds = await _model.aggregate([
          { $match: regularFilter },
          {
            $addFields: {
              _promotionScore: {
                $switch: {
                  branches: [
                    { case: { $and: [{ $eq: ['$promotion.type', 'premium'] }, { $gt: ['$promotion.expiresAt', _now] }] }, then: 2 },
                    { case: { $and: [{ $eq: ['$promotion.type', 'featured'] }, { $gt: ['$promotion.expiresAt', _now] }] }, then: 1 },
                  ],
                  default: 0,
                },
              },
            },
          },
          { $sort: { _promotionScore: -1, isFeatured: -1, visibilityScore: -1, createdAt: -1 } },
          { $skip: _skip },
          { $limit: _pageSize },
        ]);
      } else {
        regularAds = await _model.find(regularFilter)
          .sort({ isFeatured: -1, visibilityScore: -1, createdAt: -1 })
          .skip(_skip)
          .limit(_pageSize)
          .lean();
      }
    } catch (_queryErr) {
      console.warn('[GET /api/ads] Main query failed (non-fatal):', _queryErr.message);
      regularAds = []; // Return empty list instead of crashing
    }

    // Normalize: ensure both 'images' and 'media' fields exist on every ad
    // #123: also compute promotionPriority for sorting (Premium=2, Featured=1, none=0)
    function normalizeAd(ad) {
      const obj = ad.toObject ? ad.toObject() : ad;
      const now = new Date();
      const promoType = obj.promotion?.type || 'none';
      const promoExpires = obj.promotion?.expiresAt ? new Date(obj.promotion.expiresAt) : null;
      const promotionPriority = promoType === 'premium' && promoExpires > now ? 2
        : promoType === 'featured' && promoExpires > now ? 1
        : 0;
      return {
        ...obj,
        images: obj.images?.length ? obj.images : (obj.media?.length ? obj.media : []),
        media: obj.media?.length ? obj.media : (obj.images?.length ? obj.images : []),
        promotionPriority,
      };
    }
    const normalizedFeatured = featuredAds.map(normalizeAd);
    const normalizedRegular = regularAds.map(normalizeAd);
    // #123: sort by promotion priority (Premium > Featured > regular) within each group
    normalizedFeatured.sort((a, b) => b.promotionPriority - a.promotionPriority || b.createdAt - a.createdAt);
    normalizedRegular.sort((a, b) => b.promotionPriority - a.promotionPriority || b.createdAt - a.createdAt);

    // PROXIMITY SORT: when lat/lon provided, calculate haversine distance and sort by closeness
    if (!isNaN(_lat) && !isNaN(_lon)) {
      const R = 6371; // Earth radius in km
      function haversine(ad) {
        const coords = ad.location?.coordinates;
        if (!Array.isArray(coords) || coords.length < 2) return Infinity;
        const [adLng, adLat] = coords;
        const dLat = (adLat - _lat) * Math.PI / 180;
        const dLng = (adLng - _lon) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
          Math.cos(_lat * Math.PI / 180) * Math.cos(adLat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      }
      normalizedRegular.forEach(ad => { ad.distance = haversine(ad); });
      normalizedRegular.sort((a, b) => a.distance - b.distance);
    }

    // Return featured first, then ranked regular
    let allAds = [...normalizedFeatured, ...normalizedRegular];
    // Dedup by _id — prevents same ad appearing in both featured and regular
    const _seenIds = new Set();
    allAds = allAds.filter(ad => {
      const id = ad._id?.toString();
      if (!id || _seenIds.has(id)) return false;
      _seenIds.add(id);
      return true;
    });

    // Batch load seller info (emailVerified, whatsappVerified, name, avatar)
    try {
      const sellerIds = [...new Set(allAds.map(a => a.userId?.toString()).filter(Boolean))];
      if (sellerIds.length > 0) {
        const sellers = await User.find({ _id: { $in: sellerIds } })
          .select('name avatar emailVerified whatsappVerified sellerScore isVerifiedSeller isSuspended reputationPoints')
          .lean();
        const sellerMap = Object.fromEntries(sellers.map(s => [s._id.toString(), s]));
        allAds = allAds.map(a => {
          const sid = a.userId?.toString();
          if (sid && sellerMap[sid]) {
            return { ...a, userId: sellerMap[sid], seller: sellerMap[sid] };
          }
          return a;
        });
      }
    } catch { /* non-fatal — seller info is optional */ }

    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600'); // 5 min fresh, 1h stale
    res.set('Vary', 'Accept-Language, Accept-Encoding');
    if (allAds.length > 0) {
      const firstAd = allAds[0];
      const lastModified = firstAd.updatedAt || firstAd.createdAt;
      if (lastModified) res.set('Last-Modified', new Date(lastModified).toUTCString());
    }
    res.json({ success: true, ads: allAds, total: allAds.length, page: Number(page) });
  } catch (e) {
    // Return empty results instead of 500 so frontend renders correctly
    res.status(200).json({ success: true, ads: [], total: 0, page: Number(page || 0), pages: 0 });
  }
});

// optionalAuth middleware is now registered at the top of this file (before GET /)

// GET user's own ads (active + expired)
router.get('/my/all', auth, async (req, res) => {
  try {
    // FIX #164: Use $or to match ads stored under either userId OR seller field.
    // Older ads may have only 'seller' set; newer ads have both. The $or ensures all
    // of the user's ads are returned regardless of which field was used at creation time.
    const _userFilter = { $or: [{ userId: req.user.id }, { seller: req.user.id }] };
    const active = await getAdModel().find({ ..._userFilter, isDeleted: { $ne: true }, isExpired: { $ne: true } }).lean();
    const expired = await getAdModel().find({ ..._userFilter, isDeleted: { $ne: true }, isExpired: true }).lean();
    const expiredWithDeadline = expired.map(ad => {
      const expiredAt = ad.expiredAt || ad.expiresAt;
      const deadlineMs = new Date(expiredAt).getTime() + 7 * 24 * 60 * 60 * 1000;
      const daysLeft = Math.max(0, Math.ceil((deadlineMs - Date.now()) / (24 * 60 * 60 * 1000)));
      return { ...ad, daysLeftToReshare: daysLeft };  // FIX: lean() returns plain JS objects, toObject() is not available
    });
    res.json({ active, expired: expiredWithDeadline });
  } catch (e) {
    if (res.headersSent) return;
    res.status(500).json({ success: false, active: [], expired: [], error: e.message });
  }
});



// ── GET price suggestion for a category+city ──────────────────────────────────
router.get('/price-suggest', async (req, res) => {
  try {
    const { category, city } = req.query;
    if (!category || !city) return res.status(400).json(null);

    const AdModel = getAdModel();
    const ads = await AdModel.find({
      category: { $regex: new RegExp(category, 'i') },
      city:     { $regex: new RegExp(city,     'i') },
      status:   'active',
      price:    { $gt: 0 },
    })
      .select('price currency')
      .limit(150)
      .lean();

    if (!ads || ads.length < 2) return res.json(null);
    const prices = ads.map(a => Number(a.price)).filter(p => p > 0);
    if (prices.length < 2) return res.json(null);

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length);
    const currency = ads[0]?.currency || 'ج.م';

    res.json({ min, avg, max, count: prices.length, currency });
  } catch (err) {
    res.status(500).json(null);
  }
});



// ── GET /api/ads/categories — list all top-level categories with ad counts ──
// Must be placed BEFORE router.get('/:id', ...) to avoid ID capture.
router.get('/categories', async (req, res) => {
  try {
    const { country } = req.query;
    const TOP_CATEGORIES = [
      'Electronics', 'Vehicles', 'Real Estate', 'Jobs', 'Services',
      'Supermarket', 'Pharmacy', 'Fast Food', 'Fashion', 'General'
    ];

    const matchFilter = {
      isDeleted: { $ne: true },
      isExpired: { $ne: true },
    };
    if (country) matchFilter.country = country;

    const results = await getAdModel().aggregate([
      { $match: matchFilter },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Merge DB counts into the ordered category list
    const countMap = Object.fromEntries(results.map(r => [r._id, r.count]));
    const categories = TOP_CATEGORIES.map(name => ({
      name,
      count: countMap[name] || 0,
    }));

    // Also include any categories from DB not in the TOP_CATEGORIES list
    results.forEach(r => {
      if (r._id && !TOP_CATEGORIES.includes(r._id)) {
        categories.push({ name: r._id, count: r.count });
      }
    });

    res.set('Cache-Control', 'public, max-age=300');
    res.json({ success: true, categories });
  } catch (err) {
    console.error('[categories] error:', err.message);
    res.status(500).json({ success: false, categories: [], error: err.message });
  }
});

// ── GET /api/ads/subsub-options?category=X&subcategory=Y ──────────────────────
// Returns dynamic sub-sub-category options, complementing the static frontend list.
// Must be placed BEFORE router.get('/:id', ...) to avoid ID capture.
router.get('/subsub-options', async (req, res) => {
  try {
    const { category, subcategory } = req.query;

    // Full category → subcategory → subsub map (mirrors frontend sell/page.js categories)
    const SUBSUB_MAP = {
      Vehicles: {
        'ملاكي': [{ar:'سيدان',en:'سيدان'},{ar:'هاتشباك',en:'هاتشباك'},{ar:'SUV',en:'SUV'},{ar:'كوبيه',en:'كوبيه'},{ar:'مينيفان',en:'مينيفان'},{ar:'بيك أب',en:'بيك أب'},{ar:'كروس أوفر',en:'كروس أوفر'},{ar:'أخرى',en:'أخرى'}],
        'دراجات نارية': [{ar:'رياضية',en:'رياضية'},{ar:'طرق وعرة',en:'طرق وعرة'},{ar:'سكوتر',en:'سكوتر'},{ar:'كلاسيك',en:'كلاسيك'},{ar:'ثلاثية العجلات',en:'ثلاثية العجلات'},{ar:'كهربائية',en:'كهربائية'},{ar:'أخرى',en:'أخرى'}],
        'تجاري': [{ar:'شاحنة نقل',en:'شاحنة نقل'},{ar:'ميكروباص',en:'ميكروباص'},{ar:'ونيت',en:'ونيت'},{ar:'جرار أرضي',en:'جرار أرضي'},{ar:'توك توك',en:'توك توك'},{ar:'كرفانة',en:'كرفانة'},{ar:'مقطورة',en:'مقطورة'},{ar:'أخرى',en:'أخرى'}],
        'قطع غيار': [{ar:'محرك وقير',en:'محرك وقير'},{ar:'كهرباء وإلكترونيات',en:'كهرباء وإلكترونيات'},{ar:'هيكل وبودي',en:'هيكل وبودي'},{ar:'إطارات وجنوط',en:'إطارات وجنوط'},{ar:'زيوت وفلاتر',en:'زيوت وفلاتر'},{ar:'اكسسوارات',en:'اكسسوارات'},{ar:'أخرى',en:'أخرى'}],
        'مراكب وقوارب': [{ar:'قارب بمحرك',en:'قارب بمحرك'},{ar:'قارب صيد',en:'قارب صيد'},{ar:'يخت',en:'يخت'},{ar:'زورق',en:'زورق'},{ar:'كانو وكياك',en:'كانو وكياك'},{ar:'جت سكي',en:'جت سكي'},{ar:'أخرى',en:'أخرى'}],
        'آليات زراعية': [{ar:'جرار زراعي',en:'جرار زراعي'},{ar:'حصادة',en:'حصادة'},{ar:'مضخة مياه',en:'مضخة مياه'},{ar:'تيلر',en:'تيلر'},{ar:'رشاش',en:'رشاش'},{ar:'أخرى',en:'أخرى'}],
      },
      Electronics: {
        'موبايلات': [{ar:'آيفون',en:'آيفون'},{ar:'سامسونج',en:'سامسونج'},{ar:'شاومي',en:'شاومي'},{ar:'هواوي',en:'هواوي'},{ar:'أوبو',en:'أوبو'},{ar:'فيفو',en:'فيفو'},{ar:'ريلمي',en:'ريلمي'},{ar:'جوجل بيكسل',en:'جوجل بيكسل'},{ar:'أخرى',en:'أخرى'}],
        'لابتوب': [{ar:'HP',en:'HP'},{ar:'ديل',en:'ديل'},{ar:'لينوفو',en:'لينوفو'},{ar:'أسوس',en:'أسوس'},{ar:'أيسر',en:'أيسر'},{ar:'ماك/آبل',en:'ماك/آبل'},{ar:'سامسونج',en:'سامسونج'},{ar:'MSI',en:'MSI'},{ar:'أخرى',en:'أخرى'}],
        'تلفزيونات وشاشات': [{ar:'OLED',en:'OLED'},{ar:'QLED/AMOLED',en:'QLED/AMOLED'},{ar:'LED ذكي',en:'LED ذكي'},{ar:'شاشة كمبيوتر',en:'شاشة كمبيوتر'},{ar:'بروجيكتور',en:'بروجيكتور'},{ar:'أخرى',en:'أخرى'}],
        'كاميرات': [{ar:'DSLR/ميرورليس',en:'DSLR/ميرورليس'},{ar:'كاميرا مراقبة',en:'كاميرا مراقبة'},{ar:'أكشن كام GoPro',en:'أكشن كام GoPro'},{ar:'طائرة/درون',en:'طائرة/درون'},{ar:'كاميرا فيديو',en:'كاميرا فيديو'},{ar:'أخرى',en:'أخرى'}],
        'أجهزة منزلية': [{ar:'ثلاجة',en:'ثلاجة'},{ar:'غسالة',en:'غسالة'},{ar:'تكييف مسبليت',en:'تكييف مسبليت'},{ar:'بوتاجاز وأفران',en:'بوتاجاز وأفران'},{ar:'مكيف شباك',en:'مكيف شباك'},{ar:'مكنسة كهربائية',en:'مكنسة كهربائية'},{ar:'أخرى',en:'أخرى'}],
        'ألعاب إلكترونية': [{ar:'بلايستيشن',en:'بلايستيشن'},{ar:'إكس بوكس',en:'إكس بوكس'},{ar:'نينتندو',en:'نينتندو'},{ar:'ألعاب PC',en:'ألعاب PC'},{ar:'اكسسوارات جيمنج',en:'اكسسوارات جيمنج'},{ar:'أخرى',en:'أخرى'}],
        'اكسسوارات وصوتيات': [{ar:'سماعات',en:'سماعات'},{ar:'مكبرات صوت',en:'مكبرات صوت'},{ar:'تابلت',en:'تابلت'},{ar:'ساعات ذكية',en:'ساعات ذكية'},{ar:'شواحن وباورة',en:'شواحن وباورة'},{ar:'أخرى',en:'أخرى'}],
      },
      'Real Estate': {
        'شقق': [{ar:'استوديو',en:'استوديو'},{ar:'1 غرفة',en:'1 غرفة'},{ar:'2 غرفة',en:'2 غرفة'},{ar:'3 غرف',en:'3 غرف'},{ar:'4 غرف+',en:'4 غرف+'},{ar:'دوبلكس',en:'دوبلكس'},{ar:'بنتهاوس',en:'بنتهاوس'},{ar:'أخرى',en:'أخرى'}],
        'فيلات ومنازل': [{ar:'فيلا مستقلة',en:'فيلا مستقلة'},{ar:'دوبلكس',en:'دوبلكس'},{ar:'تاون هاوس',en:'تاون هاوس'},{ar:'منزل شعبي',en:'منزل شعبي'},{ar:'شاليه',en:'شاليه'},{ar:'قصر',en:'قصر'},{ar:'أخرى',en:'أخرى'}],
        'محلات وعيادات': [{ar:'محل تجاري',en:'محل تجاري'},{ar:'عيادة طبية',en:'عيادة طبية'},{ar:'صيدلية',en:'صيدلية'},{ar:'كوفي شوب',en:'كوفي شوب'},{ar:'مطعم جاهز',en:'مطعم جاهز'},{ar:'معرض',en:'معرض'},{ar:'أخرى',en:'أخرى'}],
        'أراضي': [{ar:'سكنية',en:'سكنية'},{ar:'زراعية',en:'زراعية'},{ar:'تجارية',en:'تجارية'},{ar:'صناعية',en:'صناعية'},{ar:'سياحية',en:'سياحية'},{ar:'صحراوية',en:'صحراوية'},{ar:'أخرى',en:'أخرى'}],
        'مكاتب وإدارية': [{ar:'مكتب',en:'مكتب'},{ar:'طابق إداري كامل',en:'طابق إداري كامل'},{ar:'شركة مجهزة',en:'شركة مجهزة'},{ar:'Co-working مشترك',en:'Co-working مشترك'},{ar:'أخرى',en:'أخرى'}],
        'مخازن ومستودعات': [{ar:'مستودع',en:'مستودع'},{ar:'هنجر',en:'هنجر'},{ar:'ثلاجة تبريد',en:'ثلاجة تبريد'},{ar:'منطقة لوجستية',en:'منطقة لوجستية'},{ar:'أخرى',en:'أخرى'}],
      },
      Jobs: {
        'تقنية ومعلومات': [{ar:'مطور برامج',en:'مطور برامج'},{ar:'مصمم UI/UX',en:'مصمم UI/UX'},{ar:'شبكات وأمن',en:'شبكات وأمن'},{ar:'دعم تقني',en:'دعم تقني'},{ar:'بيانات وذكاء اصطناعي',en:'بيانات وذكاء اصطناعي'},{ar:'مدير مشاريع',en:'مدير مشاريع'},{ar:'أخرى',en:'أخرى'}],
        'طبي وصحة': [{ar:'طبيب',en:'طبيب'},{ar:'صيدلاني',en:'صيدلاني'},{ar:'تمريض',en:'تمريض'},{ar:'معالج طبيعي',en:'معالج طبيعي'},{ar:'أسنان',en:'أسنان'},{ar:'مختبر',en:'مختبر'},{ar:'أخرى',en:'أخرى'}],
        'تعليم وتدريب': [{ar:'مدرس',en:'مدرس'},{ar:'مدرب',en:'مدرب'},{ar:'أستاذ جامعي',en:'أستاذ جامعي'},{ar:'معلم لغات',en:'معلم لغات'},{ar:'مشرف تربوي',en:'مشرف تربوي'},{ar:'أخرى',en:'أخرى'}],
        'هندسة': [{ar:'مدني وإنشائي',en:'مدني وإنشائي'},{ar:'كهرباء',en:'كهرباء'},{ar:'ميكانيكا',en:'ميكانيكا'},{ar:'معماري',en:'معماري'},{ar:'بترول',en:'بترول'},{ar:'كيميائي',en:'كيميائي'},{ar:'أخرى',en:'أخرى'}],
        'مبيعات وتسويق': [{ar:'مندوب مبيعات',en:'مندوب مبيعات'},{ar:'مسوق رقمي',en:'مسوق رقمي'},{ar:'مدير مبيعات',en:'مدير مبيعات'},{ar:'خدمة عملاء',en:'خدمة عملاء'},{ar:'تيليسيلز',en:'تيليسيلز'},{ar:'أخرى',en:'أخرى'}],
        'مالي ومحاسبة': [{ar:'محاسب',en:'محاسب'},{ar:'مدقق حسابات',en:'مدقق حسابات'},{ar:'محلل مالي',en:'محلل مالي'},{ar:'مسؤول مشتريات',en:'مسؤول مشتريات'},{ar:'أخرى',en:'أخرى'}],
        'خدمات عامة وعمالة': [{ar:'نظافة وتنظيف',en:'نظافة وتنظيف'},{ar:'حارس وأمن',en:'حارس وأمن'},{ar:'سائق',en:'سائق'},{ar:'طباخ',en:'طباخ'},{ar:'خادمة',en:'خادمة'},{ar:'عامل مصنع',en:'عامل مصنع'},{ar:'أخرى',en:'أخرى'}],
      },
      Services: {
        'صيانة ومقاولات': [{ar:'كهرباء',en:'كهرباء'},{ar:'سباكة',en:'سباكة'},{ar:'نجارة',en:'نجارة'},{ar:'بياض ودهانات',en:'بياض ودهانات'},{ar:'تكييف',en:'تكييف'},{ar:'سيراميك وبلاط',en:'سيراميك وبلاط'},{ar:'حدادة',en:'حدادة'},{ar:'أخرى',en:'أخرى'}],
        'نقل وشحن': [{ar:'نقل أثاث',en:'نقل أثاث'},{ar:'شحن دولي',en:'شحن دولي'},{ar:'توصيل طرود',en:'توصيل طرود'},{ar:'نقل سيارات',en:'نقل سيارات'},{ar:'مطار',en:'مطار'},{ar:'أخرى',en:'أخرى'}],
        'تعليم وتدريس': [{ar:'دروس خصوصية',en:'دروس خصوصية'},{ar:'تدريب مهني',en:'تدريب مهني'},{ar:'لغات أجنبية',en:'لغات أجنبية'},{ar:'تحفيظ قرآن',en:'تحفيظ قرآن'},{ar:'فنون وموسيقى',en:'فنون وموسيقى'},{ar:'أخرى',en:'أخرى'}],
        'تصميم وإعلام': [{ar:'تصميم جرافيك',en:'تصميم جرافيك'},{ar:'تصوير فوتوغرافي',en:'تصوير فوتوغرافي'},{ar:'إنتاج فيديو',en:'إنتاج فيديو'},{ar:'برمجة مواقع',en:'برمجة مواقع'},{ar:'أخرى',en:'أخرى'}],
        'رعاية ومنزل': [{ar:'تمريض منزلي',en:'تمريض منزلي'},{ar:'رعاية أطفال',en:'رعاية أطفال'},{ar:'تنظيف منازل',en:'تنظيف منازل'},{ar:'طهو وضيافة',en:'طهو وضيافة'},{ar:'أخرى',en:'أخرى'}],
        'حيوانات أليفة': [{ar:'تدريب حيوانات',en:'تدريب حيوانات'},{ar:'تزيين وعناية',en:'تزيين وعناية'},{ar:'بيطري متنقل',en:'بيطري متنقل'},{ar:'رعاية مؤقتة',en:'رعاية مؤقتة'},{ar:'أخرى',en:'أخرى'}],
      },
      Supermarket: {
        'خضروات وفاكهة': [{ar:'خضروات',en:'خضروات'},{ar:'فاكهة',en:'فاكهة'},{ar:'أعشاب',en:'أعشاب'},{ar:'بهارات',en:'بهارات'},{ar:'أخرى',en:'أخرى'}],
        'لحوم ودواجن': [{ar:'لحم بقري',en:'لحم بقري'},{ar:'دجاج',en:'دجاج'},{ar:'لحم خروف',en:'لحم خروف'},{ar:'مفروم',en:'مفروم'},{ar:'مشكل',en:'مشكل'},{ar:'أخرى',en:'أخرى'}],
        'أسماك ومأكولات بحرية': [{ar:'بلطي',en:'بلطي'},{ar:'جمبري',en:'جمبري'},{ar:'تونا',en:'تونا'},{ar:'سمك مشكل',en:'سمك مشكل'},{ar:'أخرى',en:'أخرى'}],
        'منتجات الألبان': [{ar:'جبنة',en:'جبنة'},{ar:'زبادي',en:'زبادي'},{ar:'لبن',en:'لبن'},{ar:'زبدة',en:'زبدة'},{ar:'قشطة',en:'قشطة'},{ar:'أخرى',en:'أخرى'}],
        'مواد جافة وتموين': [{ar:'أرز وبقوليات',en:'أرز وبقوليات'},{ar:'معكرونة ومكرونة',en:'معكرونة ومكرونة'},{ar:'دقيق وسكر',en:'دقيق وسكر'},{ar:'كونسروة',en:'كونسروة'},{ar:'أخرى',en:'أخرى'}],
        'مشروبات': [{ar:'عصائر',en:'عصائر'},{ar:'مياه',en:'مياه'},{ar:'مشروبات غازية',en:'مشروبات غازية'},{ar:'عصير طازج',en:'عصير طازج'},{ar:'أخرى',en:'أخرى'}],
        'منظفات ومنزلية': [{ar:'صابون ومنظفات',en:'صابون ومنظفات'},{ar:'مناشف ومفارش',en:'مناشف ومفارش'},{ar:'أدوات مطبخ',en:'أدوات مطبخ'},{ar:'أخرى',en:'أخرى'}],
      },
      Pharmacy: {
        'أدوية وعلاج': [{ar:'مسكنات',en:'مسكنات'},{ar:'مضادات حيوية',en:'مضادات حيوية'},{ar:'ضغط وسكر',en:'ضغط وسكر'},{ar:'قلب وشرايين',en:'قلب وشرايين'},{ar:'أخرى',en:'أخرى'}],
        'مستلزمات طبية': [{ar:'ضغط وسكر (أجهزة)',en:'ضغط وسكر (أجهزة)'},{ar:'تضميد وجروح',en:'تضميد وجروح'},{ar:'قسطرة وانابيب',en:'قسطرة وانابيب'},{ar:'أخرى',en:'أخرى'}],
        'تجميل وعناية': [{ar:'كريمات بشرة',en:'كريمات بشرة'},{ar:'شامبو وعناية شعر',en:'شامبو وعناية شعر'},{ar:'عطور',en:'عطور'},{ar:'مكياج',en:'مكياج'},{ar:'أخرى',en:'أخرى'}],
        'أطفال ورضع': [{ar:'حليب أطفال',en:'حليب أطفال'},{ar:'حفاضات',en:'حفاضات'},{ar:'كريمات أطفال',en:'كريمات أطفال'},{ar:'مستلزمات',en:'مستلزمات'},{ar:'أخرى',en:'أخرى'}],
        'أعشاب وطبيعي': [{ar:'عسل وحبة بركة',en:'عسل وحبة بركة'},{ar:'زيوت طبيعية',en:'زيوت طبيعية'},{ar:'أعشاب طبية',en:'أعشاب طبية'},{ar:'مكملات',en:'مكملات'},{ar:'أخرى',en:'أخرى'}],
      },
      'Fast Food': {
        'مطاعم وكافيهات': [{ar:'شاورما وكباب',en:'شاورما وكباب'},{ar:'مأكولات بحرية',en:'مأكولات بحرية'},{ar:'فطار وفول',en:'فطار وفول'},{ar:'حلويات ومشروبات',en:'حلويات ومشروبات'},{ar:'أخرى',en:'أخرى'}],
        'وجبات منزلية': [{ar:'أكل مصري',en:'أكل مصري'},{ar:'أكل شرقي',en:'أكل شرقي'},{ar:'أكل غربي',en:'أكل غربي'},{ar:'حلويات منزلية',en:'حلويات منزلية'},{ar:'أخرى',en:'أخرى'}],
        'مخابز وحلويات': [{ar:'خبز وعيش',en:'خبز وعيش'},{ar:'كيك وتورتات',en:'كيك وتورتات'},{ar:'حلويات شرقية',en:'حلويات شرقية'},{ar:'بيتزا وفطائر',en:'بيتزا وفطائر'},{ar:'أخرى',en:'أخرى'}],
        'مشروبات وعصائر': [{ar:'عصائر طازجة',en:'عصائر طازجة'},{ar:'قهوة وشاي',en:'قهوة وشاي'},{ar:'كوكتيل',en:'كوكتيل'},{ar:'مشروبات ساخنة',en:'مشروبات ساخنة'},{ar:'أخرى',en:'أخرى'}],
      },
      Fashion: {
        'ملابس رجالي': [{ar:'قميص',en:'قميص'},{ar:'بنطلون',en:'بنطلون'},{ar:'جلابية/جلباب',en:'جلابية/جلباب'},{ar:'بدلة',en:'بدلة'},{ar:'تيشيرت',en:'تيشيرت'},{ar:'جاكيت معطف',en:'جاكيت معطف'},{ar:'كاجوال',en:'كاجوال'},{ar:'أخرى',en:'أخرى'}],
        'ملابس نسائي': [{ar:'فستان',en:'فستان'},{ar:'بلوزة',en:'بلوزة'},{ar:'تنورة',en:'تنورة'},{ar:'بنطلون',en:'بنطلون'},{ar:'عباءة',en:'عباءة'},{ar:'بيجاما',en:'بيجاما'},{ar:'كاجوال',en:'كاجوال'},{ar:'أخرى',en:'أخرى'}],
        'ملابس أطفال': [{ar:'بيبي 0-2سنة',en:'بيبي 0-2سنة'},{ar:'أطفال 2-6سنة',en:'أطفال 2-6سنة'},{ar:'أطفال 6-12سنة',en:'أطفال 6-12سنة'},{ar:'تيجز 12-16سنة',en:'تيجز 12-16سنة'},{ar:'أخرى',en:'أخرى'}],
        'أحذية': [{ar:'رجالي',en:'رجالي'},{ar:'نسائي',en:'نسائي'},{ar:'أطفال',en:'أطفال'},{ar:'رياضي',en:'رياضي'},{ar:'رسمي',en:'رسمي'},{ar:'شبشب',en:'شبشب'},{ar:'أخرى',en:'أخرى'}],
        'حقائب وشنط': [{ar:'شنطة يد',en:'شنطة يد'},{ar:'حقيبة ظهر',en:'حقيبة ظهر'},{ar:'حقيبة سفر',en:'حقيبة سفر'},{ar:'محفظة',en:'محفظة'},{ar:'أخرى',en:'أخرى'}],
        'اكسسوارات': [{ar:'ساعات',en:'ساعات'},{ar:'مجوهرات',en:'مجوهرات'},{ar:'نظارات',en:'نظارات'},{ar:'أحزمة',en:'أحزمة'},{ar:'عطور',en:'عطور'},{ar:'أخرى',en:'أخرى'}],
        'عباءات وحجاب': [{ar:'عباءة خليجية',en:'عباءة خليجية'},{ar:'عباءة مصرية',en:'عباءة مصرية'},{ar:'حجاب وإيشارب',en:'حجاب وإيشارب'},{ar:'خمار ونقاب',en:'خمار ونقاب'},{ar:'أخرى',en:'أخرى'}],
      },
    };

    if (!category) return res.json({ success: true, options: [] });

    const catMap = SUBSUB_MAP[category] || {};
    let options = [];
    if (subcategory) {
      options = catMap[subcategory] || catMap[decodeURIComponent(subcategory)] || [];
    } else {
      // Return all subsubs for the category flattened
      const seen = new Set();
      for (const subs of Object.values(catMap)) {
        for (const s of subs) {
          const key = s.ar;
          if (!seen.has(key)) { seen.add(key); options.push(s); }
        }
      }
    }
    // Filter out أخرى from API response (already present in static frontend list)
    options = options.filter(o => o.ar !== 'أخرى');

    res.set('Cache-Control', 'public, max-age=300');
    res.json({ success: true, options });
  } catch (err) {
    console.error('[subsub-options] error:', err.message);
    res.status(500).json({ success: false, options: [], error: err.message });
  }
});

// ── GET single ad ──
router.get('/:id', async (req, res) => {
  // Fix E: Validate ObjectId before DB query to avoid CastError and return clean 404
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(404).json({ error: 'Invalid ad ID' });
  }
  try {
    const AdModel = getAdModel();
    const ad = await AdModel.findById(req.params.id).lean();

    if (!ad) return res.status(404).json({ message: 'الإعلان غير موجود' });

    // Increment views safely — never block the response on this
    try {
      await AdModel.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
      ad.views = (ad.views || 0) + 1;
    } catch {}

    // Award 1 reputation point to the ad seller — throttled: 1 point per viewer per 24h
    try {
      const sellerId = (ad.userId || ad.seller)?.toString();
      // Only authenticated viewers earn points for sellers
      if (sellerId && req.user) {
        const viewerId = req.user.id?.toString();
        const throttleKey = `${ad._id}-${viewerId}`;
        const lastAward = viewThrottle.get(throttleKey) || 0;
        const elapsed = Date.now() - lastAward;

        // Skip if same viewer already triggered a point within 24h, or if seller views own ad
        if (elapsed >= 24 * 60 * 60 * 1000 && viewerId !== sellerId) {
          viewThrottle.set(throttleKey, Date.now());
          const sellerDoc = await User.findById(sellerId);
          if (sellerDoc) {
            await addPointsToUser(sellerDoc, 1, 'مشاهدة إعلان');
          }
        }
      }
    } catch {}

    // FIX D: Auto-notify seller via system msg if buyer has an open chat for this ad
    if (req.user) {
      try {
        const viewerId  = String(req.user.id || req.user._id);
        const _sellerId = String(ad.userId || ad.seller || '');
        // Only notify if viewer is not the seller
        if (viewerId && _sellerId && viewerId !== _sellerId) {
          const ChatModel = (await import('../models/Chat.js')).default;
          const _chat = await ChatModel.findOne({
            ad: ad._id,
            buyer: viewerId,
            status: 'active',
          }).select('_id buyer seller').lean();
          if (_chat) {
            const viewerName = req.user.name || req.user.username || req.user.xtoxId || 'مستخدم';
            const _io = req.app?.get ? req.app.get('io') : null;
            const _msgText = `👀 ${viewerName} شاهد إعلانك`;
            // Non-blocking: push system message + notify seller
            ChatModel.findByIdAndUpdate(_chat._id, {
              $push: { messages: { sender: null, text: _msgText, type: 'system', status: 'delivered' } }
            }).then(() => {
              if (_io) {
                _io.to('user_' + String(_chat.seller)).emit('system_message', {
                  chatId: _chat._id, text: _msgText
                });
              }
            }).catch(() => {});
          }
        }
      } catch (_viewNotifyErr) {
        // Non-fatal — never block the ad view response
      }
    }

    // Normalize media — ensure both images and media fields are populated
    const normalized = {
      ...ad,
      images: ad.images?.length ? ad.images : (ad.media?.length ? ad.media : []),
      media: ad.media?.length ? ad.media : (ad.images?.length ? ad.images : []),
    };

    // QR code — non-blocking
    const qr = await generateQR((process.env.FRONTEND_URL || 'https://xtox.app') + '/ads/' + ad._id).catch(() => null);

    res.json({ ...normalized, qrCode: qr });
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ message: 'معرّف الإعلان غير صحيح' });
    res.status(500).json({ message: err.message });
  }
});

// ── Multer error-handling wrapper ──
// Wraps upload.fields() so multer errors are returned as JSON (not passed to
// Express default error handler which would produce an HTML 500 response).
// 'next' here is Express's next middleware — always a function, never undefined.
function multerUpload(req, res, next) {
  upload.fields([
    { name: 'images', maxCount: 5 },
    { name: 'media',  maxCount: 10 },
    { name: 'video',  maxCount: 1 },
  ])(req, res, function onMulterDone(err) {
    if (!err) return next();
    // Multer error — return useful JSON, not a raw Express 500
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    const message =
      err.code === 'LIMIT_FILE_SIZE'    ? 'الملف أكبر من الحد المسموح به (50 ميغابايت)' :
      err.code === 'LIMIT_UNEXPECTED_FILE' ? ('حقل غير متوقع: ' + (err.field || '')) :
      (err.message || 'خطأ في رفع الملف');
    return res.status(status).json({ success: false, error: message, code: err.code || 'UPLOAD_ERROR' });
  });
}

// ── POST new ad (AI moderation on ALL media) ──
router.post('/', auth, multerUpload, async (req, res) => {
  try {
    // CHECKPOINT 0: verify we entered the handler (if absent in logs = middleware crash)
    console.log('[ADS POST] handler entered, user=', req.user?.id, 'method=', req.method);
    // CHECKPOINT 1: multer finished, inspect uploaded files
    console.log('[ADS POST] 1: multer done, files=', JSON.stringify(Object.keys(req.files || {})),
      'fileCount=', Object.values(req.files || {}).reduce((n, arr) => n + (Array.isArray(arr) ? arr.length : 1), 0),
      'bodyKeys=', JSON.stringify(Object.keys(req.body || {})));

    // FIX A: null-safe body — multer may leave req.body undefined if Content-Type is wrong
    const body = req.body || {};
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // GATE 1: Only verified users can post ads
    // Fetch the full user record to check real verification fields (JWT only has id/role/xtoxId)
    {
      let _gateUser = null;
      let _gateDbFailed = false;
      try {
        if (mongoose.Types.ObjectId.isValid(req.user.id)) {
          _gateUser = await User.findById(req.user.id).select('googleId whatsappPhone authProvider xtoxId emailVerified email').lean();
        }
      } catch (_gateErr) {
        // DB lookup failed — fail open, do not block the user
        _gateDbFailed = true;
        _gateUser = null;
      }

      // Fail open if DB threw; only block when user record definitively has no verification
      const _isVerified = _gateDbFailed || (
        !!(_gateUser && _gateUser.whatsappPhone) ||   // verified WhatsApp number on file
        !!(_gateUser && _gateUser.googleId) ||         // logged in via Google = email verified
        !!(_gateUser && _gateUser.emailVerified) ||    // verified email OTP user
        !!(_gateUser && _gateUser.xtoxId) ||           // has xtoxId = completed registration
        !!req.user.xtoxId ||                           // xtoxId in JWT (new email users)
        (_gateUser && _gateUser.authProvider && _gateUser.authProvider !== 'email') // apple/whatsapp
      );

      if (!_isVerified) {
        return res.status(403).json({
          error: 'يجب التحقق من هويتك قبل نشر إعلان. يرجى التحقق من رقم واتساب أو البريد الإلكتروني.',
          code: 'UNVERIFIED_USER'
        });
      }

      // GATE 2: Must have xtoxId — auto-generate if missing (lazy assignment for old accounts)
      const _hasXtoxId = req.user.xtoxId || (_gateUser && _gateUser.xtoxId);
      if (!_hasXtoxId && _gateUser && !_gateDbFailed) {
        // Auto-assign xtoxId to this user so they can post ads (non-blocking)
        const _newXtoxId = 'XTOX-' + Date.now().toString(36).toUpperCase().slice(-5) + Math.random().toString(36).toUpperCase().slice(-2);
        try {
          await User.findByIdAndUpdate(req.user.id, { xtoxId: _newXtoxId });
          req.user.xtoxId = _newXtoxId; // inject into request so it's available downstream
          console.log('[ADS POST] Auto-assigned xtoxId:', _newXtoxId, 'for user:', req.user.id);
        } catch (_xtoxErr) {
          console.warn('[ADS POST] xtoxId auto-assign failed (non-fatal):', _xtoxErr.message);
        }
      }
    }
    // #128 — SUSPENSION CHECK: blocked users cannot post ads
    try {
      const _suspendCheck = await User.findById(req.user.id).select('isSuspended suspendReason').lean();
      if (_suspendCheck?.isSuspended) {
        return res.status(403).json({
          error: 'حسابك موقوف. تواصل مع الدعم.',
          suspended: true,
          reason: _suspendCheck.suspendReason || 'Violation',
        });
      }
    } catch (_suspendErr) {
      // Non-fatal: if check fails, allow the user (fail open)
      console.warn('[ADS POST] Suspension check failed (non-fatal):', _suspendErr.message);
    }

    // ── DB CONNECTION CHECK — return 503 if no DB is ready yet ──────────────
    const _activeDB = getActiveDB();
    console.log('[ADS POST] 2: activeDB=', _activeDB, 'mongoState=', mongoose.connection.readyState);
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

    let todayCount = 0;
    try {
      todayCount = await getAdModel().countDocuments({
        userId: req.user.id,
        createdAt: { $gte: startOfDay, $lte: endOfDay },
        isDeleted: { $ne: true }
      });
    } catch (_countErr) {
      console.warn('[ADS POST] countDocuments failed (non-fatal, skipping limit check):', _countErr.message);
      todayCount = 0; // If count fails, allow the ad (non-fatal)
    }

    const DAILY_LIMIT = 5;
    if (todayCount >= DAILY_LIMIT) {
      // Check if user wants to spend 100 reputation points to bypass
      const usePoints = req.body.useReputationPoints === true || req.body.useReputationPoints === 'true';
      if (!usePoints) {
        return res.status(429).json({
          error: 'لقد وصلت إلى الحد الأقصى للإعلانات اليومي',
          canUsePoints: true,
          reputationRequired: 100,
          currentPoints: req.user.reputationPoints || 0
        });
      }
      // Use reputation points path
      const _bypassUser = await User.findById(req.user.id);
      if (!_bypassUser || _bypassUser.reputationPoints < 100) {
        return res.status(400).json({
          error: 'لا تملك نقاط سمعة كافية. تحتاج 100 نقطة.',
          currentPoints: _bypassUser?.reputationPoints || 0
        });
      }
      await addPointsToUser(_bypassUser, -100, 'نشر إعلان إضافي (تجاوز الحد اليومي)');
    }
    // ─────────────────────────────────────────────────────────────────────────

    console.log('[ADS POST] 3: daily limit ok (todayCount=', todayCount, '), processing images');

    // ── PROCESS UPLOADED FILES (multer) — convert to base64 or Cloudinary ────
    let _uploadedImages = [];
    let _uploadedVideoUrl = null;

    // FIX: null-safe access — multer may not populate req.files if Content-Type mismatch
    // Accept both 'images' and 'media' field names (frontend may use either)
    const _imageFiles = req.files?.images
      ? (Array.isArray(req.files.images) ? req.files.images : [req.files.images])
      : [];
    const _mediaFiles = (req.files && req.files.media) ? req.files.media : [];
    const _allUploadedFiles = _imageFiles.concat(_mediaFiles);

    if (_allUploadedFiles.length) {
      _uploadedImages = _allUploadedFiles.map(function(f) {
        return 'data:' + f.mimetype + ';base64,' + f.buffer.toString('base64');
      });
      console.log('[ADS POST] 3a: converted', _uploadedImages.length, 'files to base64');
      // Try Cloudinary for uploaded images — only when all 3 env vars are set
      if (CLOUDINARY_ENABLED) {
        try {
          const { default: cloudinaryClient } = await import('../server/cloudinary.js');
          const processed = [];
          for (const img of _uploadedImages) {
            try {
              const result = await cloudinaryClient.uploader.upload(img, { folder: 'xtox_ads' });
              processed.push(result.secure_url);
            } catch (_imgErr) {
              console.warn('[ADS POST] Cloudinary single image upload failed, keeping base64:', _imgErr.message);
              processed.push(img);
            }
          }
          _uploadedImages = processed;
          console.log('[ADS POST] 3b: Cloudinary upload done,', processed.length, 'images');
        } catch (uploadErr) {
          console.warn('[ADS POST] Cloudinary import/init failed, keeping base64:', uploadErr.message);
        }
      } else {
        console.log('[ADS POST] 3b: Cloudinary not configured — keeping base64 data URLs');
      }
      // Inject into req.body.media so existing pipeline sees them
      body.media = _uploadedImages;
    } else if (body.imageUrl) {
      _uploadedImages = [body.imageUrl];
    }

    // FIX: null-safe video file access
    const _rawVideoFile = (req.files && req.files.video && req.files.video[0]) ? req.files.video[0] : null;
    if (_rawVideoFile) {
      const v = _rawVideoFile;
      _uploadedVideoUrl = 'data:' + v.mimetype + ';base64,' + v.buffer.toString('base64');
      // Try Cloudinary for video — only when all 3 env vars are set
      if (CLOUDINARY_ENABLED) {
        try {
          const { default: cloudinaryClient } = await import('../server/cloudinary.js');
          const result = await cloudinaryClient.uploader.upload(_uploadedVideoUrl, {
            resource_type: 'video', folder: 'xtox_ads'
          });
          _uploadedVideoUrl = result.secure_url;
        } catch (e) {
          console.warn('[ADS POST] Cloudinary video failed, keeping base64:', e.message);
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
    // Only import & attempt Cloudinary when the env vars are actually configured.
    // When CLOUDINARY_ENABLED is false (missing/invalid env vars), keep images as base64 data: URLs.
    const rawMedia = Array.isArray(body.media) ? body.media : (body.media ? [body.media] : []);
    if (rawMedia.some(u => String(u || '').startsWith('data:image/')) && CLOUDINARY_ENABLED) {
      try {
        const { default: cloudinaryClient } = await import('../server/cloudinary.js');
        const processedMedia = [];
        for (const m of rawMedia.slice(0, 10)) {
          const url = String(m || '').trim();
          if (url.startsWith('data:image/')) {
            try {
              const result = await cloudinaryClient.uploader.upload(url, { folder: 'xtox_ads' });
              processedMedia.push(result.secure_url);
            } catch (_singleUploadErr) {
              console.warn('[ADS POST] Single image Cloudinary upload failed, keeping original:', _singleUploadErr.message);
              processedMedia.push(url); // non-fatal: keep original on per-image failure
            }
          } else {
            processedMedia.push(url);
          }
        }
        body.media = processedMedia;
      } catch (uploadErr) {
        // Cloudinary unavailable — keep base64 data: URLs (ad still posts, just no CDN URL)
        body.media = rawMedia;
        console.warn('[ADS POST] Cloudinary base64 upload failed, keeping images as base64:', uploadErr.message);
      }
    } else {
      // No Cloudinary configured — keep whatever we have (base64 or http URLs)
      if (rawMedia.length) body.media = rawMedia;
    }

    // ── FIELD-LEVEL SANITIZATION (run before anything else) ──
    console.log('[ADS POST] 4: sanitizeAdFields starting, mediaCount=', Array.isArray(body.media) ? body.media.length : 0);
    const { errors, sanitized } = sanitizeAdFields(body);
    console.log('[ADS POST] 5: sanitizeAdFields done, errors=', errors, 'title=', sanitized.title?.slice(0, 30));
    if (errors.length) return res.status(400).json({ error: errors.join('; '), received: Object.keys(body), receivedValues: { price: body.price, lat: body.lat, lng: body.lng, city: body.city, currency: body.currency } });
    const { title, description, category, subcategory, price, city, currency, media, video, featuredStyle, condition, phone } = sanitized;
    const whatsapp = body.whatsapp ? String(body.whatsapp).replace(/[^+\d\s\-()]/g, '').slice(0, 20) : undefined;
    const tags = body.tags ? (Array.isArray(body.tags) ? body.tags.slice(0,20).map(t=>String(t).trim()) : String(body.tags).split(',').map(t=>t.trim()).slice(0,20)) : [];
    // FIX D: Extract and validate coordinates — parseFloat + isNaN + non-zero check
    // Accept both lat/lng and latitude/longitude field names for flexibility
    const lng = parseFloat(body.lng || body.longitude);
    const lat = parseFloat(body.lat || body.latitude);
    const validLocation = !isNaN(lng) && !isNaN(lat) && lng !== 0 && lat !== 0;

    // COUNTRY ASSIGNMENT: use 2-letter ISO code from multiple sources
    // Priority: 1) body.country (if valid 2-letter code), 2) IP header, 3) location text, 4) JWT, 5) default EG
    let country = req.user.country || '';
    if (!country || country.length > 3) {
      country =
        (req.body.country && req.body.country.length <= 3 ? req.body.country : '') ||
        countryFromIP(req) ||
        locationToCountry(city || req.body.location || '') ||
        req.user?.country ||
        'EG'; // default Egypt
    }
    // Always uppercase 2-letter code
    country = (country || 'EG').toUpperCase().slice(0, 2);

    // TEXT MODERATION — wrapped in try/catch so a moderation engine crash never returns 400
    let textCheck = { clean: true };
    try {
      textCheck = moderateText(title + ' ' + (description || ''));
    } catch (_modErr) {
      console.warn('[ADS POST] moderateText threw (non-fatal, allowing ad):', _modErr.message);
    }
    if (!textCheck.clean) return res.status(400).json({ error: 'Content blocked: ' + textCheck.reason, received: Object.keys(body) });

    // IMAGE AI MODERATION (scan every uploaded image) — skip large base64 to avoid API issues
    if (media && media.length > 0) {
      for (const imageUrl of media) {
        // Skip base64 images from moderation — too large for API, and offline fallback allows anyway
        if (String(imageUrl || '').startsWith('data:')) continue;
        const imgCheck = await moderateImage(imageUrl).catch(() => ({ clean: true }));
        if (!imgCheck.clean) {
          return res.status(400).json({ error: 'Image blocked: contains ' + imgCheck.reason });
        }
      }
    }

    // DUPLICATE CHECK — non-fatal: if DB fails here, skip duplicate check rather than 500
    if (await checkDuplicate(title, category, city, req.user.id).catch(() => false)) {
      return res.status(400).json({ error: 'Duplicate ad detected' });
    }

    // AUTO CATEGORY DETECTION (offline first) — wrapped in try/catch (non-fatal)
    let detected = { main: 'General', sub: 'Other' };
    try {
      detected = detectCategoryOffline(title + ' ' + (description || ''));
    } catch (_detectErr) {
      console.warn('[ADS POST] detectCategoryOffline failed (non-fatal):', _detectErr.message);
    }
    const finalCategory = category || detected.main;
    let finalSubcategory = detected.sub || subcategory || '';
    // Auto-assign subcategory via keyword matching if not provided or is 'Other'
    if (!finalSubcategory || finalSubcategory === 'Other') {
      const _subText = ((title || '') + ' ' + (description || '')).toLowerCase();
      const _subMap = {
        Vehicles: [{kw:['سيارة','عربية','car','sedan','suv'],v:'Cars'},{kw:['موتور','motorcycle','bike'],v:'Motorcycles'},{kw:['شاحنة','truck'],v:'Trucks'},{kw:['قطع غيار','spare parts'],v:'SpareParts'},{kw:['قارب','boat'],v:'Boats'}],
        Electronics: [{kw:['موبايل','iphone','samsung','phone'],v:'MobilePhones'},{kw:['لابتوب','laptop','macbook'],v:'Laptops'},{kw:['تابلت','ipad','tablet'],v:'Tablets'},{kw:['تليفزيون','tv','شاشة'],v:'TVs'},{kw:['كاميرا','camera'],v:'Cameras'},{kw:['بلايستيشن','xbox','gaming'],v:'Gaming'},{kw:['سماعات','speaker','headphone'],v:'Audio'}],
        'Real Estate': [{kw:['شقة','apartment','flat'],v:'Apartments'},{kw:['فيلا','villa','منزل'],v:'Villas'},{kw:['أرض','land'],v:'Land'},{kw:['محل','commercial','shop'],v:'Commercial'},{kw:['مكتب','office'],v:'Offices'}],
        Jobs: [{kw:['full time','دوام كامل'],v:'FullTime'},{kw:['part time','دوام جزئي'],v:'PartTime'},{kw:['freelance','فريلانس'],v:'Freelance'},{kw:['تدريب','internship'],v:'Internship'},{kw:['remote','عن بعد'],v:'Remote'}],
        Services: [{kw:['سباك','كهربائي','نجار'],v:'HomeServices'},{kw:['تنظيف','cleaning'],v:'Cleaning'},{kw:['تصليح','صيانة','repair'],v:'Repairs'},{kw:['مدرس','دروس','tutor'],v:'Education'},{kw:['صحة','health','تجميل'],v:'Health'},{kw:['نقل','شحن','delivery'],v:'Transport'},{kw:['تصميم','design'],v:'Design'}],
      };
      const _catHints = _subMap[finalCategory] || [];
      for (const _hint of _catHints) {
        if (_hint.kw.some(function(k) { return _subText.includes(k); })) { finalSubcategory = _hint.v; break; }
      }
      if (!finalSubcategory) finalSubcategory = 'Other';
    }

    // Auto-detect sub-subcategory (level 3)
    let finalSubsub = req.body.subsub || 'Other';
    const level4 = req.body.level4 ? String(req.body.level4).trim().slice(0, 100) : null;
    if (!req.body.subsub || req.body.subsub === 'Other') {
      const _subsubMap = {
        Cars: [{kw:['sedan','سيدان'],v:'Sedan'},{kw:['suv','دفع رباعي','jeep','جيب'],v:'SUV'},{kw:['بيك اب','pickup','pick up','هايلكس','hilux'],v:'Pickup'},{kw:['كوبيه','coupe'],v:'Coupe'},{kw:['كهربائي','electric','ev','tesla'],v:'Electric'}],
        MobilePhones: [{kw:['iphone','ايفون','آيفون'],v:'iPhone'},{kw:['samsung','سامسونج','galaxy'],v:'Samsung'},{kw:['huawei','هواوي'],v:'Huawei'},{kw:['xiaomi','شاومي','redmi','poco'],v:'Xiaomi'},{kw:['oppo','realme'],v:'Oppo'}],
        Apartments: [{kw:['استوديو','studio'],v:'Studio'},{kw:['غرفة واحدة','1 bedroom','1br'],v:'1BR'},{kw:['غرفتين','2 bedroom','2br'],v:'2BR'},{kw:['3 غرف','3 bedroom','3br'],v:'3BR'},{kw:['4 غرف','4 bedroom','4br'],v:'4BR'},{kw:['دوبلكس','duplex'],v:'Duplex'},{kw:['بنتهاوس','penthouse'],v:'Penthouse'}],
        Laptops: [{kw:['macbook','ماك'],v:'MacBook'},{kw:['gaming','جيمينج','rog','msi','alienware'],v:'GamingLaptop'},{kw:['thinkpad','xps','elitebook'],v:'Business'}],
        Shoes: [{kw:['سنيكرز','sneakers','كوتشي'],v:'Sneakers'},{kw:['صندل','sandal','شبشب'],v:'Sandals'},{kw:['رياضي','running','sports shoes'],v:'Sports'},{kw:['جزمة رسمية','formal shoes','oxford'],v:'Formal'}],
        Motorcycles: [{kw:['sport','رياضي','cbr','r1'],v:'Sport'},{kw:['سكوتر','scooter','vespa'],v:'Scooter'},{kw:['off road','offroad','dirt'],v:'OffRoad'},{kw:['cruiser','كروزر','harley'],v:'Cruiser'}],
        Villas: [{kw:['كمبوند','compound'],v:'Compound'},{kw:['توين','twin house'],v:'TwinHouse'},{kw:['تاون','town house'],v:'TownHouse'},{kw:['مستقلة','standalone'],v:'Independent'}],
        Gaming: [{kw:['playstation','بلايستيشن','ps4','ps5'],v:'PlayStation'},{kw:['xbox','اكس بوكس'],v:'Xbox'},{kw:['nintendo','نينتندو','switch'],v:'Nintendo'},{kw:['rtx','gtx','gpu','gaming pc'],v:'PCGaming'}],
        HomeServices: [{kw:['سباك','plumber','مواسير'],v:'Plumber'},{kw:['كهربائي','electrician'],v:'Electrician'},{kw:['نجار','carpenter'],v:'Carpenter'},{kw:['دهان','painter'],v:'Painter'},{kw:['تكييف','air condition'],v:'ACRepair'},{kw:['حشرات','pest'],v:'PestControl'}],
      };
      const _subText2 = ((title || '') + ' ' + (description || '')).toLowerCase();
      const _ssMap = _subsubMap[finalSubcategory] || [];
      for (let _ssi = 0; _ssi < _ssMap.length; _ssi++) {
        const _ssEntry = _ssMap[_ssi];
        if (_ssEntry.kw.some(function(k) { return _subText2.includes(k); })) { finalSubsub = _ssEntry.v; break; }
      }
    }

    // Enhanced offline subcategory detection from DB examples
    if (finalCategory && (!finalSubcategory || finalSubcategory === 'Other')) {
      try {
        const _dbDetected = await detectSubcategory(finalCategory, (title || '') + ' ' + (description || ''), country);
        if (_dbDetected.confidence !== 'low') {
          finalSubcategory = _dbDetected.subcategory;
          if (_dbDetected.subsub && _dbDetected.subsub !== 'Other') {
            finalSubsub = _dbDetected.subsub;
          }
        }
      } catch (_dbDetErr) { /* non-fatal */ }
    }

    // CHANGE 2: Prevent same user posting duplicate title or description
    // Skip if client sends forceDuplicate=true (user confirmed they want to post anyway)
    const _forceDuplicate = body.forceDuplicate === 'true' || body.forceDuplicate === true;
    if (!_forceDuplicate) {
      const _titleTrimmed = (title || '').trim();
      const _descTrimmed = (description || '').trim();

      if (_titleTrimmed.length > 0) {
        try {
          const _orClauses = [
            { title: { $regex: new RegExp('^' + _titleTrimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } }
          ];
          if (_descTrimmed.length > 20) {
            _orClauses.push({ description: { $regex: new RegExp(_descTrimmed.slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } });
          }
          const _dup = await getAdModel().findOne({
            userId: req.user.id,
            $or: _orClauses,
            isDeleted: { $ne: true },
            isExpired: { $ne: true }
          }).lean();

          if (_dup) {
            return res.status(409).json({
              error: 'لديك إعلان مشابه بالفعل. لا يمكن نشر إعلانات متكررة من نفس الحساب.',
              code: 'DUPLICATE_AD',
              existingAdId: _dup._id
            });
          }
        } catch (_dupErr) {
          // Duplicate check failure is non-fatal — allow the ad
        }
      }
    }

    // ENSURE COUNTRY EXISTS
    await getOrCreateCountry(country, country).catch(() => {});

    // FIX: prefer Cloudinary-processed sanitized media when available
    // When _uploadedImages has base64 but the pre-process converted body.media to Cloudinary URLs,
    // the sanitized media[] will have the correct URLs -- always prefer those.
    var finalMedia = (media && media.length > 0) ? media : (_uploadedImages.length ? _uploadedImages : []);
    const finalVideoUrl = _uploadedVideoUrl || null;

    console.log('[ADS POST] 6: saving ad, title=', title, 'category=', finalCategory, 'mediaCount=', finalMedia.length, 'validLocation=', validLocation);

    let ad;
    try {
      ad = await getAdModel().create({
        userId: req.user.id,
        seller: req.user.id,  // alias for userId — ensures both fields are set
        title,
        title_original: title,
        description,
        category: finalCategory,
        subcategory: finalSubcategory,
        subsub: finalSubsub,
        level4: level4 || null,
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
        // phone is intentionally excluded from ad creation — taken from seller's profile
        whatsapp: whatsapp || undefined,
        tags: tags || [],
        // language field intentionally omitted from insert — schema default handles it
        // FIX D: Only save location when coordinates are fully valid numbers and non-zero
        location: validLocation ? { type: 'Point', coordinates: [lng, lat] } : undefined,
        visibilityScore: 10,
        createdAt: new Date(),
        isExpired: false,
        isDeleted: false,
      });
    } catch (createErr) {
      // Log full details so the real error is visible in Railway logs
      console.error('[ADS POST] Ad.create FAILED:', createErr?.name, '-', createErr?.message);
      if (createErr?.errors) {
        // Mongoose ValidationError — log each field's error
        Object.entries(createErr.errors).forEach(([field, err]) => {
          console.error('[ADS POST] ValidationError field=' + field + ':', err.message, '| value:', err.value);
        });
      }
      console.error('[ADS POST] Stack:', createErr?.stack?.split('\n').slice(0,5).join(' | '));
      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          error: 'حدث خطأ أثناء نشر الإعلان. يرجى المحاولة مرة أخرى.',
          message: 'Failed to create ad. Please try again.',
          // In development, include the real error for easier debugging
          ...(process.env.NODE_ENV !== 'production' && {
            debug: createErr?.message,
            field: createErr?.errors ? Object.keys(createErr.errors).join(',') : undefined,
          })
        });
      }
      return;
    }

    console.log('[ADS POST] 7: saved ad _id=', ad?._id?.toString());

    // ── FIRST AD BONUS: +5 points when user publishes their first ad ────────
    try {
      const adCount = await getAdModel().countDocuments({
        userId: req.user.id,
        isDeleted: { $ne: true },
      });
      if (adCount === 1) {
        // This is their first ad (just saved = count is exactly 1 now)
        const firstAdUser = await User.findById(req.user.id);
        if (firstAdUser) {
          await addPointsToUser(firstAdUser, 5, 'أول إعلان منشور +5 نقاط');
          console.log('[ADS POST] First-ad bonus +5 awarded to user:', req.user.id);
        }
      }
    } catch (_firstAdErr) {
      console.warn('[ADS POST] First-ad bonus failed (non-fatal):', _firstAdErr.message);
    }

    await rankAd(ad).catch(() => {});
    await indexAd(ad).catch(() => {});
    // #148 — update seller score after new ad (non-blocking)
    computeSellerScore(req.user.id).catch(() => {});

    // AUTO-LEARN local language from this ad — wrapped in try/catch
    // to prevent sync crashes (e.g. undefined.media) from reaching the outer
    // try/catch and returning a 500 instead of the 201 success response.
    try {
      const { learnFromAd } = await import('../server/languageLearner.js');
      const _learnResult = learnFromAd(title, description, country);
      // Handle both sync (no .catch) and async (has .catch) functions safely
      if (_learnResult && typeof _learnResult.catch === 'function') {
        _learnResult.catch(() => {});
      }
    } catch (_learnErr) {
      console.warn('[learnFromAd] non-critical error ignored:', _learnErr.message);
    }

    // AI QUALITY SCORE — async, non-blocking (run after response)
    setImmediate(async () => {
      try {
        const { score, tips } = await scoreAdWithAI({
          title, description, category: finalCategory,
          price, city, currency, media, condition
        });
        await ad.constructor.updateOne(
          { _id: ad._id },
          { $set: { aiQualityScore: score, aiQualityTips: tips } }
        );
        console.log('[AIQuality] Ad ' + ad._id + ' scored: ' + score + '/100');
      } catch (e) {
        console.warn('[AIQuality] Scoring failed:', e.message);
      }
    });

    // AI CONTENT MODERATION — async, non-blocking (run after response)
    // Uses OPENAI_ANALYSIS_KEY to flag inappropriate ads for review
    moderateAdContent(title, description).then(result => {
      if (!result.approved) {
        getAdModel().findByIdAndUpdate(ad._id, {
          $set: { status: 'pending_review', moderationNote: result.reason }
        }).catch(e => console.warn('[Moderation] DB update failed:', e.message));
        console.log('[Moderation] Ad flagged for review:', ad._id, result.reason);
      }
    }).catch(e => console.warn('[Moderation] Error (non-fatal):', e.message));


    // Normalize response — always include both 'images' and 'media' as arrays
    // to prevent "Cannot read properties of undefined (reading 'media')" on client
    const _adObj = ad.toObject ? ad.toObject() : (typeof ad === 'object' ? { ...ad } : {});
    const _normalizedAd = {
      ..._adObj,
      _id: _adObj._id || ad._id,
      images: (_adObj.images && _adObj.images.length) ? _adObj.images : ((_adObj.media && _adObj.media.length) ? _adObj.media : []),
      media: (_adObj.media && _adObj.media.length) ? _adObj.media : ((_adObj.images && _adObj.images.length) ? _adObj.images : []),
    };

    console.log('[ADS POST] 8: responding 201, ad._id=', _normalizedAd._id?.toString());
    res.status(201).json({ success: true, ad: _normalizedAd, _id: _normalizedAd._id });

    // WORDPRESS AUTO-SYNC: create post async after response (non-blocking)
    setImmediate(async () => {
      try {
        const adObj = ad.toObject ? ad.toObject() : ad;
        console.log(`[WP] Auto-sync for new ad ${adObj._id}: ${adObj.title}`);
        const result = await createWPPost(adObj);
        if (result) {
          await getAdModel().findByIdAndUpdate(ad._id, {
            wpPostId: result.wpPostId,
            wpPostUrl: result.wpPostUrl,
          });
          console.log('[WordPress] ✅ Synced ad to WordPress:', result.wpPostUrl);
        } else {
          console.log('[WordPress] ⚠️ createWPPost returned null for ad:', adObj._id);
        }
      } catch (e) {
        console.error('[WordPress] ❌ Sync failed:', e.message, e.stack);
      }
    });
  } catch (fatalErr) {
    console.error('[POST /api/ads] FATAL:', fatalErr?.constructor?.name, fatalErr?.message);
    console.error('[POST /api/ads] Stack:', fatalErr?.stack);
    if (fatalErr?.errors) {
      Object.entries(fatalErr.errors).forEach(([field, err]) => {
        console.error('[POST /api/ads] ValidationError field=' + field + ':', err.message, '| value:', err.value);
      });
    }
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: 'حدث خطأ أثناء نشر الإعلان. يرجى المحاولة مرة أخرى.',
        message: 'Failed to create ad. Please try again.',
        _debug: fatalErr?.message,
        _type: fatalErr?.constructor?.name,
        _fields: fatalErr?.errors ? Object.keys(fatalErr.errors).join(',') : undefined,
      });
    }
  }
});

// ── AI Generate ad from media ──
router.post('/ai-generate', auth, async (req, res) => {
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
        const tempPath = '/tmp/fox_ai_' + Date.now() + '.jpg';
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
    res.status(500).json({ error: err.message });
  }
});


// ── PATCH /:id — edit own ad with 10 reputation point cost ──────────────────
router.patch('/:id', auth, async (req, res) => {
  try {
    // 1. Find the ad
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: 'الإعلان غير موجود' });
    }
    const ad = await getAdModel().findById(req.params.id);
    if (!ad || ad.isDeleted) return res.status(404).json({ error: 'الإعلان غير موجود' });

    // 2. Ownership check
    const sellerId = (ad.seller || ad.userId)?.toString();
    if (sellerId !== req.user.id) {
      return res.status(403).json({ error: 'لا يمكنك تعديل هذا الإعلان' });
    }

    // 3. Reputation check
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ error: 'المستخدم غير موجود' });
    if ((user.reputationPoints || 0) < 10) {
      return res.status(400).json({ error: 'تحتاج 10 نقاط سمعة على الأقل لتعديل الإعلان' });
    }

    // 4. Deduct 10 reputation points (floor at 0) for editing an ad
    await addPointsToUser(user, -10, 'تعديل إعلان -10 نقاط');

    // 5. Update allowed fields
    const { title, description, price, location, subCategory, subSubCategory, images, phoneNumber } = req.body;
    // Update country if provided (with location-text fallback)
    if (req.body.country && req.body.country.length <= 3) {
      ad.country = req.body.country.toUpperCase().slice(0, 2);
    } else if (location !== undefined) {
      const detectedCountry = locationToCountry(String(location).slice(0, 60).trim());
      if (detectedCountry) ad.country = detectedCountry;
    }
    if (title !== undefined) ad.title = String(title).slice(0, 120).trim();
    if (description !== undefined) ad.description = String(description).slice(0, 1500).trim();
    if (price !== undefined) ad.price = Math.max(0, Number(price) || 0);
    if (location !== undefined) ad.city = String(location).slice(0, 60).trim();
    if (subCategory !== undefined) ad.subcategory = String(subCategory).slice(0, 60).trim();
    if (subSubCategory !== undefined) ad.subsub = String(subSubCategory).slice(0, 60).trim();
    if (Array.isArray(images)) {
      const cleanImages = images.slice(0, 10).map(u => String(u || '').trim()).filter(u => u.startsWith('http') || u.startsWith('data:'));
      if (cleanImages.length > 0) { ad.images = cleanImages; ad.media = cleanImages; }
    }
    // phoneNumber update removed — phone is taken from user profile only
    ad.updatedAt = new Date();
    ad.editedAt = new Date();

    // 6. Content moderation on new title+description
    try {
      const modResult = await moderateAdContent(ad.title, ad.description);
      if (!modResult.approved) {
        ad.status = 'rejected';
        await ad.save();
        return res.status(400).json({ error: 'المحتوى لا يتوافق مع سياسة النشر' });
      }
    } catch (_modErr) { /* fail open */ }

    await ad.save();

    // 7. WordPress sync (non-blocking)
    if (ad.wpPostId) {
      setImmediate(async () => {
        try {
          const { updateWPPost } = await import('../utils/wordpress.js');
          await updateWPPost(ad.wpPostId, ad.toObject ? ad.toObject() : ad);
        } catch (_wpErr) {
          console.warn('[PATCH /:id] WP sync failed (non-fatal):', _wpErr.message);
        }
      });
    }

    // 8. Return updated ad
    const adObj = ad.toObject ? ad.toObject() : ad;
    return res.json({
      success: true,
      ad: {
        ...adObj,
        images: adObj.images?.length ? adObj.images : (adObj.media || []),
        media: adObj.media?.length ? adObj.media : (adObj.images || []),
      },
      reputationPoints: user.reputationPoints,
    });
  } catch (e) {
    console.error('[PATCH /api/ads/:id] error:', e.message);
    res.status(500).json({ error: 'حدث خطأ أثناء تعديل الإعلان' });
  }
});

// ── PUT update ad (owner only, full field-level sanitization) ──
router.put('/:id', auth, async (req, res) => {
  try {
    // Immutable fields — strip them from any update payload
    delete req.body._id;
    delete req.body.userId;
    delete req.body.seller;
    delete req.body.createdAt;

    // FIX: For partial PUT updates, fetch existing ad first so we can fill in missing required fields
    // (sanitizeAdFields requires title; a partial update like {price:2} should not wipe the title)
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'معرف الإعلان غير صالح' });
    }
    // Load existing ad for ownership check + field defaults
    const ad = await getAdModel().findOne({
      _id: req.params.id,
      $or: [{ userId: req.user.id }, { seller: req.user.id }],
      isDeleted: { $ne: true }
    });
    if (!ad) return res.status(404).json({ error: 'الإعلان غير موجود أو لا يخصك' });

    // Merge: use existing ad values as defaults for any omitted field
    const mergedBody = {
      title:        req.body.title        !== undefined ? req.body.title        : ad.title,
      description:  req.body.description  !== undefined ? req.body.description  : ad.description,
      category:     req.body.category     !== undefined ? req.body.category     : ad.category,
      price:        req.body.price        !== undefined ? req.body.price        : ad.price,
      city:         req.body.city         !== undefined ? req.body.city         : ad.city,
      currency:     req.body.currency     !== undefined ? req.body.currency     : ad.currency,
      media:        req.body.media        !== undefined ? req.body.media        : ad.media,
      video:        req.body.video        !== undefined ? req.body.video        : ad.video,
      featuredStyle:req.body.featuredStyle!== undefined ? req.body.featuredStyle: ad.featuredStyle,
      condition:    req.body.condition    !== undefined ? req.body.condition    : ad.condition,
      subcategory:  req.body.subcategory  !== undefined ? req.body.subcategory  : ad.subcategory,
      phone:        req.body.phone        !== undefined ? req.body.phone        : ad.phone,
      whatsapp:     req.body.whatsapp     !== undefined ? req.body.whatsapp     : ad.whatsapp,
      tags:         req.body.tags         !== undefined ? req.body.tags         : ad.tags,
      level4:       req.body.level4       !== undefined ? req.body.level4       : ad.level4,
    };

    // ── FIELD-LEVEL SANITIZATION (mirrors POST validation) ──
    const { errors, sanitized } = sanitizeAdFields(mergedBody);
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });
    const { title, description, category, price, city, currency, media, video, featuredStyle } = sanitized;
    const updateWhatsapp = sanitized.whatsapp || undefined;
    const updateLevel4 = sanitized.level4 || undefined;
    const updateTags = sanitized.tags || undefined;


    // TEXT MODERATION on updated content
    const textCheck = moderateText(title + ' ' + (description || ''));
    if (!textCheck.clean) return res.status(400).json({ error: 'Content blocked: ' + textCheck.reason });

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
    if (sanitized.condition !== undefined) ad.condition = sanitized.condition; // FIX: apply condition from mergedBody
    if (updateWhatsapp !== undefined) ad.whatsapp = updateWhatsapp;
    if (updateLevel4 !== undefined) ad.level4 = updateLevel4;
    if (updateTags !== undefined) ad.tags = updateTags;
    // Re-detect subsub when title or description changed
    if (req.body.title !== undefined || req.body.description !== undefined) {
      const _reText = (title || ad.title || '') + ' ' + (description || ad.description || '');
      try {
        const _reCat = category || ad.category;
        const _reDetected = await detectSubcategory(_reCat, _reText, ad.country);
        if (_reDetected && _reDetected.subcategory && _reDetected.confidence !== 'low') {
          if (!ad.subcategory || ad.subcategory === 'Other') ad.subcategory = _reDetected.subcategory;
          if (_reDetected.subsub && _reDetected.subsub !== 'Other') ad.subsub = _reDetected.subsub;
        }
      } catch (_reErr) { /* non-fatal — keep existing subsub */ }
    }
    ad.updatedAt = new Date();
    ad.editedAt = new Date();
    ad.language = /[\u0600-\u06FF]/.test(title || '') ? 'arabic' : 'english'; // FIX: use full language names (not 'ar'/'en')

    await ad.save();
    await rankAd(ad).catch(() => {});
    await indexAd(ad).catch(() => {});
    // #148 — update seller score after new ad (non-blocking)
    computeSellerScore(req.user.id).catch(() => {});

    // AI QUALITY SCORE on update — async, non-blocking
    setImmediate(async () => {
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

    // WORDPRESS SYNC on PUT update (upsert) — non-blocking
    setImmediate(async () => {
      try {
        if (!process.env.WP_ACCESS_TOKEN) {
          console.log('[WP] WP_ACCESS_TOKEN not set — skipping PUT sync for ad:', ad._id);
          return;
        }
        const adObj = ad.toObject ? ad.toObject() : ad;
        console.log(`[WP] Auto-sync for updated ad ${adObj._id}: ${adObj.title}`);
        if (adObj.wpPostId) {
          await updateWPPost(adObj.wpPostId, adObj);
        } else {
          const result = await createWPPost(adObj);
          if (result) {
            await getAdModel().findByIdAndUpdate(ad._id, { wpPostId: result.wpPostId, wpPostUrl: result.wpPostUrl });
          }
        }
      } catch (_wpPutErr) {
        console.warn('[WP] PUT sync failed (non-fatal):', _wpPutErr.message);
      }
    });

    res.json({ ok: true, ad });
  } catch (e) { res.status(500).json({ error: 'فشل تحديث الإعلان', code: 'UPDATE_ERROR' }); }
});

// ── DELETE ad ──
// ── PATCH /:id/sold — mark ad as sold and archive all linked chats ──
// Like dubizzle: when seller marks an item sold, all chats for that ad get closed.
router.patch('/:id/sold', auth, async (req, res) => {
  try {
    const ad = await getAdModel().findOne({ _id: req.params.id, userId: req.user.id });
    if (!ad) return res.status(404).json({ error: 'الإعلان غير موجود أو لا يخصك' });

    // Mark ad as sold
    ad.status = 'sold';
    ad.isExpired = true;
    ad.expiredAt = new Date();
    await ad.save();

    // ── SOLD BONUS: +15 points to seller when ad is marked as sold ──────────
    try {
      const soldSeller = await User.findById(req.user.id);
      if (soldSeller) {
        await addPointsToUser(soldSeller, 15, 'إعلان مباع +15 نقطة');
        console.log('[PATCH /:id/sold] Sold bonus +15 awarded to seller:', req.user.id);
      }
    } catch (_soldErr) {
      console.warn('[PATCH /:id/sold] Sold bonus failed (non-fatal):', _soldErr.message);
    }

    // WORDPRESS: delete post when ad is sold (async, non-blocking)
    if (ad.wpPostId) {
      setImmediate(() => deleteWPPost(ad.wpPostId));
      await getAdModel().findByIdAndUpdate(ad._id, { wpPostId: null, wpPostUrl: null });
    }

    // Archive all chats linked to this ad — no new messages can be sent
    let archivedCount = 0;
    try {
      const Chat = (await import('../models/Chat.js')).default;
      const result = await Chat.updateMany(
        { ad: req.params.id, status: { $ne: 'archived' } },
        {
          $set: { status: 'archived', updatedAt: new Date(), closeAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
          $push: {
            messages: {
              $each: [{
                sender: req.user.id,
                text: 'تم بيع هذا الإعلان. تم إغلاق المحادثة تلقائياً.',
                type: 'system',
                createdAt: new Date(),
              }],
              $slice: -500,
            }
          }
        }
      );
      archivedCount = result.modifiedCount || 0;
    } catch (chatErr) {
      console.warn('[PATCH /:id/sold] Chat archive failed (non-fatal):', chatErr.message);
    }

    res.json({ ok: true, status: 'sold', archivedChats: archivedCount });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── DELETE ad ──
// Also deletes all linked chat conversations and their Cloudinary media.
router.delete('/:id', auth, async (req, res) => {
  try {
    // Validate ObjectId before querying to avoid CastError → 500
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: 'Not found' });
    }
    const isAdmin = req.user.role === 'admin' || req.user.role === 'sub_admin' || req.user.role === 'superadmin';
    const query = isAdmin ? { _id: req.params.id } : { _id: req.params.id, userId: req.user.id };
    const ad = await getAdModel().findOne(query);
    if (!ad) return res.status(404).json({ error: 'Not found' });

    // WORDPRESS: delete post before soft-deleting ad
    if (ad.wpPostId) {
      setImmediate(() => deleteWPPost(ad.wpPostId));
    }

    // Delete Cloudinary images if Cloudinary is configured
    if (CLOUDINARY_ENABLED) {
      const allMedia = [...(ad.media || []), ...(ad.images || [])];
      const uniqueMedia = [...new Set(allMedia)];
      const cloudinaryUrls = uniqueMedia.filter(u => u && String(u).includes('cloudinary.com'));
      if (cloudinaryUrls.length > 0) {
        setImmediate(async () => {
          try {
            const { default: cloudinaryClient } = await import('../server/cloudinary.js');
            for (const url of cloudinaryUrls) {
              try {
                // Extract public_id from Cloudinary URL: .../<folder>/<public_id>.<ext>
                const match = String(url).match(/\/upload\/(?:v\d+\/)?(.+?)\.[^/.]+$/);
                if (match && match[1]) {
                  await cloudinaryClient.uploader.destroy(match[1]);
                }
              } catch (_imgErr) {
                console.warn('[DELETE] Cloudinary destroy failed for', url, ':', _imgErr.message);
              }
            }
          } catch (_cloudErr) {
            console.warn('[DELETE] Cloudinary cleanup failed (non-fatal):', _cloudErr.message);
          }
        });
      }
    }

    // Soft-delete the ad
    ad.isDeleted = true; ad.deletedAt = new Date(); await ad.save();

    // ── Cascade: archive + schedule 7-day auto-delete for linked chats ──
    // Like dubizzle: chats are archived immediately, then permanently deleted after 7 days.
    // The actual hard-delete + Cloudinary cleanup is done by the chatCleanup cron job.
    (async () => {
      try {
        const Chat = (await import('../models/Chat.js')).default;
        const closeAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const result = await Chat.updateMany(
          { ad: req.params.id, status: { $ne: 'archived' } },
          {
            $set: { status: 'archived', updatedAt: new Date(), closeAt },
            $push: {
              messages: {
                $each: [{
                  sender: req.user.id,
                  text: 'تم حذف هذا الإعلان. سيتم حذف المحادثة تلقائياً خلال 7 أيام.',
                  type: 'system',
                  createdAt: new Date(),
                }],
                $slice: -500,
              }
            }
          }
        );
        console.log('[DELETE /api/ads/:id] Scheduled', result.modifiedCount, 'chats for deletion in 7 days for ad', req.params.id);
      } catch (cascadeErr) {
        // Non-fatal — log but don't fail the ad deletion
        console.warn('[DELETE /api/ads/:id] Chat schedule-delete failed (non-fatal):', cascadeErr.message);
      }
    })();

    res.json({ success: true });
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
    ad.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    ad.republishedCount = (ad.republishedCount || 0) + 1;
    ad.createdAt = new Date();
    await ad.save();

    res.json({ ok: true, ad, message: 'Ad republished for 30 more days' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


// RESHARE endpoint: POST /:id/reshare — reactivate an expired ad within 7-day window
// Business rules: status must be 'expired', reshareCount < 1, reshareWindowEndsAt not passed
router.post('/:id/reshare', auth, async (req, res) => {
  try {
    const mongoose = (await import('mongoose')).default || (await import('mongoose'));
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ error: 'Invalid ID' });

    const ad = await getAdModel().findOne({ _id: req.params.id, userId: req.user.id });
    if (!ad) return res.status(404).json({ error: 'Ad not found' });

    const adStatus = ad.status || (ad.isExpired ? 'expired' : 'active');
    if (adStatus !== 'expired' && !ad.isExpired)
      return res.status(400).json({ error: 'Ad is not expired' });
    if ((ad.reshareCount || 0) >= 1)
      return res.status(400).json({ error: 'Reshare limit reached (max 1 reshare)' });

    const windowEnds = ad.reshareWindowEndsAt || (ad.expiredAt ? new Date(new Date(ad.expiredAt).getTime() + 7 * 24 * 60 * 60 * 1000) : null);
    if (windowEnds && new Date() > windowEnds)
      return res.status(400).json({ error: 'Reshare window expired' });

    ad.status = 'active';
    ad.isExpired = false;
    ad.reshareCount = (ad.reshareCount || 0) + 1;
    ad.resharedAt = new Date();
    ad.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    ad.reshareWindowEndsAt = null;
    ad.expiredAt = null;
    await ad.save();

    res.json({ success: true, ad, message: 'Ad reshared and active for 30 days' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /:id/view — increment view count (called by AdCard on mount) ──────
router.patch('/:id/view', async (req, res) => {
  try {
    const ad = await getAdModel().findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { returnDocument: 'after' }
    );
    if (!ad) return res.status(404).json({ error: 'Ad not found' });
    // Award 1 reputation point to ad seller — throttled via viewThrottle map (anti-gaming)
    try {
      const sellerId = (ad.userId || ad.seller)?.toString();
      // optionalAuth sets req.user if a valid JWT was sent
      if (sellerId && req.user) {
        const viewerId = req.user.id?.toString();
        const throttleKey = `${ad._id}-${viewerId}`;
        const lastAward = viewThrottle.get(throttleKey) || 0;
        const elapsed = Date.now() - lastAward;
        if (elapsed >= 24 * 60 * 60 * 1000 && viewerId !== sellerId) {
          viewThrottle.set(throttleKey, Date.now());
          const sellerDoc = await User.findById(sellerId);
          if (sellerDoc) {
            await addPointsToUser(sellerDoc, 1, 'مشاهدة إعلان');
          }
        }
      }
    } catch {}
    res.json({ views: ad.views });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /ai-learn — admin-triggered subcategory AI learning
router.post('/ai-learn', auth, async (req, res) => {
  try {
    const User = (await import('../models/User.js')).default;
    const user = await User.findById(req.user.id);
    if (!user || !['admin', 'sub_admin', 'superadmin'].includes(user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { runWeeklyLearning } = await import('../server/weeklyLearner.js');
    runWeeklyLearning().catch(() => {});
    res.json({ success: true, message: 'AI learning started' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// ── POST /api/ads/detect-category — offline category + subcategory detection ──
router.post('/detect-category', async (req, res) => {
  try {
    const { title = '', description = '', category = '' } = req.body;
    if (!title && !description) {
      return res.status(400).json({ error: 'title or description required' });
    }
    const text = (title + ' ' + (description || '')).trim();

    // 1. Offline category detection
    let detectedCategory = category || '';
    try {
      const offline = detectCategoryOffline(text);
      if (!detectedCategory && offline && offline.main) detectedCategory = offline.main;
    } catch { /* non-fatal */ }

    // 2. Offline subcategory detection (keyword match against SubcategoryExample DB)
    let subcategory = 'Other';
    let subsub = 'Other';
    let confidence = 'low';
    if (detectedCategory) {
      try {
        const result = await detectSubcategory(detectedCategory, text);
        subcategory = result.subcategory || 'Other';
        subsub = result.subsub || 'Other';
        confidence = result.confidence || 'low';
      } catch { /* non-fatal */ }
    }

    return res.json({
      success: true,
      category: detectedCategory,
      subcategory,
      subsub,
      confidence
    });
  } catch (e) {
    return res.status(500).json({ error: 'Detection failed', message: e.message });
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// TEMP DEBUG ENDPOINT: POST /api/ads/debug-create
// Tests ad creation without auth — helps identify validation issues in production
// To use: POST https://xtox-production.up.railway.app/api/ads/debug-create
// with body: { title, category, price, condition, country }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/debug-create', async (req, res) => {
  try {
    const testAd = {
      userId: new mongoose.Types.ObjectId(),
      title: req.body.title || 'test',
      category: req.body.category || 'Supermarket',
      subcategory: req.body.subcategory || 'Other',
      price: Number(req.body.price) || 0,
      country: req.body.country || 'EG',
      currency: req.body.currency || 'EGP',
      condition: req.body.condition || null,
      city: req.body.city || '',
      media: [],
      images: [],
      tags: [],
      isExpired: false,
      isDeleted: false,
    };
    const AdModel = getAdModel();
    const activeDB = getActiveDB();

    // When MongoDB is connected, use Mongoose validation (validateSync)
    // When using in-memory store, use Ad.create() directly to test validation path
    if (activeDB === 'mongodb' && typeof AdModel.schema?.validateSync === 'function') {
      // MongoDB mode: use Mongoose document validation
      const doc = new AdModel(testAd);
      const validationError = doc.validateSync();
      if (validationError) {
        return res.json({
          valid: false,
          activeDB,
          errors: Object.fromEntries(
            Object.entries(validationError.errors).map(([k, v]) => [k, { message: v.message, value: v.value }])
          )
        });
      }
      return res.json({ valid: true, activeDB, fields: Object.keys(testAd), testAd });
    } else {
      // Memory/Couchbase mode: try to create and immediately delete
      try {
        const created = await AdModel.create(testAd);
        const id = created._id;
        // Cleanup — non-fatal if delete fails
        if (typeof AdModel.findByIdAndDelete === 'function') {
          AdModel.findByIdAndDelete(id).catch(() => {});
        }
        return res.json({ valid: true, activeDB, fields: Object.keys(testAd), testAd, note: 'created+deleted in memory store' });
      } catch (createErr) {
        return res.json({
          valid: false,
          activeDB,
          error: createErr.message,
          name: createErr.constructor.name,
          errors: createErr.errors ? Object.fromEntries(
            Object.entries(createErr.errors).map(([k, v]) => [k, { message: v.message, value: v.value }])
          ) : undefined
        });
      }
    }
  } catch (e) {
    return res.json({ error: e.message, name: e.constructor.name, stack: e.stack?.split('\n').slice(0, 5) });
  }
});

export default router;
