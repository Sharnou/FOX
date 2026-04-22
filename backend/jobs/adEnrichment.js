// backend/jobs/adEnrichment.js
// AI Ad Enrichment System — auto-classify categories, set default images, detect condition
// Runs every 2 days at 3:00 AM. Also exposes enrichSingleAd for on-demand use.

import cron from 'node-cron';
import Ad from '../models/Ad.js';
import { classifyAdFull } from '../services/autoCategorize.js';
import { getImageSlug } from '../config/categoryImageMap.js';
import { v2 as cloudinary } from 'cloudinary';

const FRONTEND_BASE = process.env.FRONTEND_URL || 'https://fox-kohl-eight.vercel.app';

// Categories that are too vague and need AI reclassification
const VAGUE_CATEGORIES = new Set([
  '', null, undefined,
  'other', 'أخرى', 'general', 'عام', 'عامة',
  'miscellaneous', 'متفرقات',
  'anonymous', 'غير محدد', 'غير معروف',
  'unknown', 'مجهول', 'other/general',
]);

// Cloudinary default image cache (slug → public_id)
const imageCache = {};

/**
 * Upload a default category image to Cloudinary if not already uploaded.
 * Returns the Cloudinary public_id, or null on failure.
 */
async function getOrUploadDefaultImage(slug) {
  if (imageCache[slug]) return imageCache[slug];

  const publicId = `xtox/defaults/${slug}`;

  // Check if already uploaded
  try {
    const result = await cloudinary.api.resource(publicId);
    imageCache[slug] = result.public_id;
    return result.public_id;
  } catch {
    // Not uploaded yet — upload from frontend static
  }

  // Upload from Vercel static assets
  const imageUrl = `${FRONTEND_BASE}/category-images/${slug}.jpg`;
  try {
    const uploaded = await cloudinary.uploader.upload(imageUrl, {
      public_id: publicId,
      overwrite: false,
      folder: 'xtox/defaults',
      transformation: [{ width: 800, height: 800, crop: 'fill', quality: 'auto', fetch_format: 'auto' }],
    });
    imageCache[slug] = uploaded.public_id;
    console.log(`[AdEnrichment] Uploaded default image: ${slug}`);
    return uploaded.public_id;
  } catch (err) {
    console.error(`[AdEnrichment] Failed to upload default image ${slug}:`, err.message);
    return null;
  }
}

/**
 * Enrich a single ad: classify category, detect condition, set default image.
 * @param {object} ad - Mongoose Ad document
 * @returns {{ enriched: boolean, updates?: object, reason?: string }}
 */
export async function enrichSingleAd(ad) {
  const catLower = (ad.category || '').toLowerCase().trim();
  const needsCategory = VAGUE_CATEGORIES.has(catLower) || VAGUE_CATEGORIES.has(ad.category);
  const needsImage =
    !ad.images ||
    ad.images.length === 0 ||
    (ad.images.length === 1 && (!ad.images[0] || ad.images[0] === ''));
  const needsCondition =
    !ad.condition || ad.condition === '' || ad.condition === 'unknown' || ad.condition === null;

  // Skip if nothing to do
  if (!needsCategory && !needsImage && !needsCondition) {
    return { enriched: false, reason: 'nothing_to_do' };
  }

  let updates = {};
  let category = ad.category;
  let subcategory = ad.subcategory;

  // ── 1. AI Classification ─────────────────────────────────────────────────
  if (needsCategory || needsCondition) {
    const text = [
      ad.title || '',
      ad.description || '',
      ad.price ? `السعر: ${ad.price}` : '',
      ad.city ? `في ${ad.city}` : '',
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    if (text.length > 5) {
      try {
        const result = await classifyAdFull(text);
        if (result) {
          if (needsCategory && result.category) {
            updates.category = result.category;
            updates.subcategory = result.subcategory || subcategory;
            updates.categoryAutoClassified = true;
            updates.classificationProvider = result.provider;
            category = result.category;
            subcategory = result.subcategory || subcategory;
            console.log(
              `[AdEnrichment] ${ad._id}: classified as ${result.category} > ${result.subcategory} (${result.provider}, conf: ${result.confidence})`
            );
          }
          if (needsCondition && result.condition && result.condition !== 'لا ينطبق') {
            updates.condition = result.condition;
            updates.conditionAutoDetected = true;
            console.log(`[AdEnrichment] ${ad._id}: condition set to "${result.condition}"`);
          }
        }
      } catch (err) {
        console.error(`[AdEnrichment] AI classify failed for ${ad._id}:`, err.message);
      }
    }
  }

  // ── 2. Default Image Upload ───────────────────────────────────────────────
  if (needsImage) {
    const slug = getImageSlug(
      updates.subcategory || subcategory,
      updates.category || category
    );
    const publicId = await getOrUploadDefaultImage(slug);
    if (publicId) {
      updates.images = [publicId];
      updates.defaultImageAutoSet = true;
      console.log(`[AdEnrichment] ${ad._id}: default image set to ${publicId}`);
    }
  }

  // ── 3. Save ───────────────────────────────────────────────────────────────
  if (Object.keys(updates).length > 0) {
    updates.enrichedAt = new Date();
    updates.enrichmentVersion = (ad.enrichmentVersion || 0) + 1;
    await Ad.findByIdAndUpdate(ad._id, { $set: updates });
    return { enriched: true, updates };
  }

  return { enriched: false, reason: 'no_updates' };
}

/**
 * Run enrichment batch on ads with missing/vague data.
 * @param {{ onlyNew?: boolean, limit?: number }} options
 */
export async function runEnrichmentBatch({ onlyNew = true, limit = 500 } = {}) {
  const filter = {
    status: { $ne: 'deleted' },
    $or: [
      // No images
      { images: { $exists: false } },
      { images: { $size: 0 } },
      // Vague/missing category
      {
        category: {
          $in: [
            '',
            null,
            'other',
            'أخرى',
            'general',
            'عام',
            'عامة',
            'miscellaneous',
            'متفرقات',
            'anonymous',
            'غير محدد',
            'unknown',
          ],
        },
      },
      { category: { $exists: false } },
      // Missing condition
      { condition: { $in: ['', null, 'unknown'] } },
      { condition: { $exists: false } },
    ],
  };

  // Only process new ads from last 48 hours if onlyNew = true
  if (onlyNew) {
    filter.createdAt = { $gte: new Date(Date.now() - 48 * 60 * 60 * 1000) };
  }

  const ads = await Ad.find(filter).limit(limit).lean();
  console.log(`[AdEnrichment] Found ${ads.length} ads to enrich`);

  let enriched = 0,
    skipped = 0,
    failed = 0;

  for (const rawAd of ads) {
    try {
      const ad = await Ad.findById(rawAd._id);
      if (!ad) {
        skipped++;
        continue;
      }
      const result = await enrichSingleAd(ad);
      if (result.enriched) enriched++;
      else skipped++;
      // Rate limit: 600ms between AI calls to avoid rate limiting
      await new Promise((r) => setTimeout(r, 600));
    } catch (err) {
      console.error(`[AdEnrichment] Error on ad ${rawAd._id}:`, err.message);
      failed++;
    }
  }

  const summary = { total: ads.length, enriched, skipped, failed };
  console.log('[AdEnrichment] Batch complete:', summary);
  return summary;
}

/**
 * Start the enrichment cron job (every 2 days at 3:00 AM) and optionally wire to app.
 */
export function startAdEnrichmentJob(app) {
  // Run every 2 days at 3:00 AM
  cron.schedule('0 3 */2 * *', async () => {
    console.log('[AdEnrichment] Starting scheduled enrichment job...');
    try {
      await runEnrichmentBatch({ onlyNew: true, limit: 500 });
    } catch (err) {
      console.error('[AdEnrichment] Scheduled job error:', err.message);
    }
  });

  // Expose on app for programmatic access
  if (app) {
    app.set('runAdEnrichment', runEnrichmentBatch);
    app.set('enrichSingleAd', enrichSingleAd);
  }

  console.log('[AdEnrichment] Job scheduled — runs every 2 days at 3:00 AM');
}
