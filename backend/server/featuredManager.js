import Ad from '../models/Ad.js';

// Max 16 featured ads per week per country
// Sorted: newest featured → top, oldest → bottom
export async function getFeaturedAds(country) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const featured = await Ad.find({
    country,
    isFeatured: true,
    isDeleted: false,
    isExpired: false,
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
    isDeleted: false,
    isExpired: false,
    $or: [{ featuredUntil: { $gt: new Date() } }]
  };
  if (category) query.category = category;
  if (subcategory) query.subcategory = subcategory;

  return Ad.find(query).sort({ featuredAt: -1 }).limit(16);
}

// Count featured ads this week for country (enforce max 16)
export async function countFeaturedThisWeek(country) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return Ad.countDocuments({
    country,
    isFeatured: true,
    featuredAt: { $gte: weekAgo }
  });
}
