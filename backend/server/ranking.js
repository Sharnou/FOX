/**
 * XTOX Ranking Engine
 * Formula: views×2 + chats×3 + reputation×5 + featured_boost + time_decay
 * Supports exponential time decay with configurable half-life.
 */
import redis from './redis.js';

// Half-life for time decay: 7 days in milliseconds
const HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Compute exponential time-decay bonus for an ad.
 * Newer ads score higher; score halves every 7 days.
 * @param {Date|string} createdAt
 * @returns {number} decay bonus (0–100)
 */
function timeDecayScore(createdAt) {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  // Exponential decay: 100 × 2^(−age / halfLife)
  return 100 * Math.pow(2, -ageMs / HALF_LIFE_MS);
}

/**
 * Compute total ranking score for an ad.
 * Matches XTOX business logic spec:
 *   views×2 + chats×3 + reputation×5 + featured_boost + time_decay
 * @param {Object} ad - Ad document from MongoDB
 * @returns {number} composite score
 */
function computeScore(ad) {
  const views      = (ad.views          || 0) * 2;
  const chats      = (ad.chatCount      || 0) * 3;
  const reputation = (ad.reputation     || 0) * 5;   // business-logic weight
  const featured   = ad.isFeatured ? 2000 : 0;
  const decay      = timeDecayScore(ad.createdAt);    // exponential recency bonus
  return views + chats + reputation + featured + decay;
}

/**
 * Rank a single ad in Redis sorted set: rank:{country}:{category}
 * Called on ad create, update, view, or chat event.
 * @param {Object} ad - Ad document
 */
export async function rankAd(ad) {
  if (!redis) return; // Redis optional — skip silently
  try {
    const score = computeScore(ad);
    await redis.zadd(
      `rank:${ad.country}:${ad.category}`,
      score,
      ad._id.toString()
    );
  } catch (e) {
    console.warn('[Ranking] rankAd error:', e.message);
  }
}

/**
 * Bulk re-rank an array of ads atomically via Redis pipeline.
 * Use for nightly cron jobs or after category/country reshuffles.
 * @param {Array} ads - Array of Ad documents
 */
export async function bulkRankAds(ads) {
  if (!redis || !Array.isArray(ads) || ads.length === 0) return;
  try {
    const pipeline = redis.pipeline();
    for (const ad of ads) {
      const score = computeScore(ad);
      pipeline.zadd(
        `rank:${ad.country}:${ad.category}`,
        score,
        ad._id.toString()
      );
    }
    await pipeline.exec();
    console.log(`[Ranking] Bulk ranked ${ads.length} ads`);
  } catch (e) {
    console.warn('[Ranking] bulkRankAds error:', e.message);
  }
}

/**
 * Remove a single ad from its ranking sorted set.
 * Call on ad expiry (30-day lifecycle end) or hard deletion.
 * @param {Object} ad - Ad document
 */
export async function unrankAd(ad) {
  if (!redis) return;
  try {
    await redis.zrem(`rank:${ad.country}:${ad.category}`, ad._id.toString());
  } catch (e) {
    console.warn('[Ranking] unrankAd error:', e.message);
  }
}

/**
 * Retrieve top-ranked ad IDs for a country+category with pagination.
 * Returns highest-score ads first.
 * @param {string} country - Country code
 * @param {string} category - Category slug
 * @param {number} page - Zero-based page index
 * @param {number} limit - Results per page (default 20)
 * @returns {Promise<string[]>} Array of ad _id strings
 */
export async function getTopAds(country, category, page = 0, limit = 20) {
  if (!redis) return [];
  try {
    return await redis.zrevrange(
      `rank:${country}:${category}`,
      page * limit,
      page * limit + limit - 1
    );
  } catch (e) {
    return [];
  }
}
