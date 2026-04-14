import Ad from '../models/Ad.js';
import { dbState, MemAd } from './memoryStore.js';
import { getActiveDB } from './dbManager.js';

// Use getActiveDB() for reliable DB-state detection (same as ads.js)
function getAdModel() {
  const db = getActiveDB();
  if (db === 'mongodb') return Ad;
  return MemAd;
}

// Golden/premium styles — unlimited slots
const UNLIMITED_STYLES = ['gold', 'banner'];

// Build base featured query
function baseFeaturedQuery(country) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return {
    ...(country ? { country } : {}),
    isFeatured: true,
    isDeleted: { $ne: true },
    isExpired: { $ne: true },
    visibilityScore: { $gt: 0 },
    $or: [
      { featuredUntil: { $gt: new Date() } },
      { featuredAt: { $gte: weekAgo } }
    ]
  };
}

// Featured ads for homepage:
//   - Golden (style: gold/banner) — unlimited, sorted by views desc
//   - Normal (style: normal) — max 16, sorted by views desc
// Golden ads always shown first, then normal.
export async function getFeaturedAds(country) {
  try {
    const AdModel = getAdModel();
    const base = baseFeaturedQuery(country);

    // Golden/premium: no limit
    const goldenAds = await AdModel.find({ ...base, featuredStyle: { $in: UNLIMITED_STYLES } })
      .sort({ views: -1, featuredAt: -1 });

    // Normal featured: max 16
    const normalAds = await AdModel.find({ ...base, featuredStyle: { $nin: UNLIMITED_STYLES } })
      .sort({ views: -1, featuredAt: -1 })
      .limit(16);

    // Golden first, then normal — dedup handled by caller
    return [...goldenAds, ...normalAds];
  } catch (err) {
    console.warn('[featuredManager] getFeaturedAds error:', err.message);
    return [];
  }
}

// Get featured ads for a specific category — same split logic
export async function getFeaturedByCategory(country, category, subcategory) {
  try {
    const AdModel = getAdModel();
    const query = {
      ...(country ? { country } : {}),
      isFeatured: true,
      isDeleted: { $ne: true },
      isExpired: { $ne: true },
      $or: [{ featuredUntil: { $gt: new Date() } }]
    };
    if (category) query.category = category;
    if (subcategory) query.subcategory = subcategory;

    const goldenAds = await AdModel.find({ ...query, featuredStyle: { $in: UNLIMITED_STYLES } })
      .sort({ views: -1, featuredAt: -1 });

    const normalAds = await AdModel.find({ ...query, featuredStyle: { $nin: UNLIMITED_STYLES } })
      .sort({ views: -1, featuredAt: -1 })
      .limit(16);

    return [...goldenAds, ...normalAds];
  } catch (err) {
    console.warn('[featuredManager] getFeaturedByCategory error:', err.message);
    return [];
  }
}

// Count active normal-style featured ads (style: normal) — enforces max-16 slot
export async function countNormalFeatured(country) {
  try {
    return await getAdModel().countDocuments({
      ...(country ? { country } : {}),
      isFeatured: true,
      featuredStyle: { $nin: UNLIMITED_STYLES },
      featuredUntil: { $gt: new Date() },
      isDeleted: { $ne: true }
    });
  } catch (err) {
    console.warn('[featuredManager] countNormalFeatured error:', err.message);
    return 0;
  }
}

// Count featured ads this week for country (legacy — kept for compatibility)
export async function countFeaturedThisWeek(country) {
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return await getAdModel().countDocuments({
      ...(country ? { country } : {}),
      isFeatured: true,
      featuredAt: { $gte: weekAgo }
    });
  } catch (err) {
    console.warn('[featuredManager] countFeaturedThisWeek error:', err.message);
    return 0;
  }
}
