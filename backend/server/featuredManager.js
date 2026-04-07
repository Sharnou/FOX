import Ad from '../models/Ad.js';
import { dbState, MemAd } from './memoryStore.js';
import { getActiveDB } from './dbManager.js';

// Use getActiveDB() for reliable DB-state detection (same as ads.js)
function getAdModel() {
  const db = getActiveDB();
  if (db === 'mongodb') return Ad;
  return MemAd;
}

// Max 16 featured ads per week per country
// Sorted: newest featured → top, oldest → bottom
export async function getFeaturedAds(country) {
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const featured = await getAdModel().find({
      ...(country ? { country } : {}),
      isFeatured: true,
      isDeleted: { $ne: true },
      isExpired: { $ne: true },
      visibilityScore: { $gt: 0 },
      $or: [
        { featuredUntil: { $gt: new Date() } },
        { featuredAt: { $gte: weekAgo } }
      ]
    })
    .sort({ featuredAt: -1 }) // newest featured first
    .limit(16);

    return featured;
  } catch (err) {
    console.warn('[featuredManager] getFeaturedAds error:', err.message);
    return [];
  }
}

// Get featured ads for a specific category (shown first in category results)
export async function getFeaturedByCategory(country, category, subcategory) {
  try {
    const query = {
      ...(country ? { country } : {}),
      isFeatured: true,
      isDeleted: { $ne: true },
      isExpired: { $ne: true },
      $or: [{ featuredUntil: { $gt: new Date() } }]
    };
    if (category) query.category = category;
    if (subcategory) query.subcategory = subcategory;

    return await getAdModel().find(query).sort({ featuredAt: -1 }).limit(16);
  } catch (err) {
    console.warn('[featuredManager] getFeaturedByCategory error:', err.message);
    return [];
  }
}

// Count featured ads this week for country (enforce max 16)
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
