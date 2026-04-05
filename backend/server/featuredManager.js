import Ad from '../models/Ad.js';
import { dbState, MemAd } from './memoryStore.js';
function getAdModel() { return dbState.usingMemoryStore ? MemAd : Ad; }

// Max 16 featured ads per week per country
// Sorted: newest featured → top, oldest → bottom
export async function getFeaturedAds(country) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const featured = await getAdModel().find({
    country,
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
}

// Get featured ads for a specific category (shown first in category results)
export async function getFeaturedByCategory(country, category, subcategory) {
  const query = {
    country,
    isFeatured: true,
    isDeleted: { $ne: true },
    isExpired: { $ne: true },
    $or: [{ featuredUntil: { $gt: new Date() } }]
  };
  if (category) query.category = category;
  if (subcategory) query.subcategory = subcategory;

  return getAdModel().find(query).sort({ featuredAt: -1 }).limit(16);
}

// Count featured ads this week for country (enforce max 16)
export async function countFeaturedThisWeek(country) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return getAdModel().countDocuments({
    country,
    isFeatured: true,
    featuredAt: { $gte: weekAgo }
  });
}
