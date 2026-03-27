import redis from './redis.js';
export async function rankAd(ad) {
  const recency = (Date.now() - new Date(ad.createdAt).getTime()) * -0.000001;
  const score = (ad.views || 0) * 2 + (ad.chatCount || 0) * 3 + (ad.visibilityScore || 100) * 0.1 + (ad.isFeatured ? 2000 : 0) + recency;
  await redis.zadd(`rank:${ad.country}:${ad.category}`, score, ad._id.toString());
}
export async function getTopAds(country, category, page = 0, limit = 20) {
  return redis.zrevrange(`rank:${country}:${category}`, page * limit, page * limit + limit - 1);
}
