// backend/utils/sellerScore.js
// #128 — Seller trust score computation
// Score range: 0-100
// Factors: phone verification, sales, ad count, AI quality avg, report count

import User from '../models/User.js';
import Ad from '../models/Ad.js';

/**
 * Compute and persist a seller trust score (0-100) for the given userId.
 * Call this after any event that might change the score:
 *   - Phone verified, sale completed, ad posted, report received
 */
export async function computeSellerScore(userId) {
  const user = await User.findById(userId);
  if (!user) return 0;

  const adCount = await Ad.countDocuments({ userId, status: 'active', isDeleted: { $ne: true } });
  const avgQuality = await Ad.aggregate([
    { $match: { userId: user._id, isDeleted: { $ne: true } } },
    { $group: { _id: null, avg: { $avg: '$aiQualityScore' } } },
  ]);

  let score = 0;

  // Phone or WhatsApp verified: +30
  if (user.phoneVerified || user.whatsappPhone) score += 30;

  // Sales history: +5 per sale, max +20
  if (user.totalSales > 0) score += Math.min(user.totalSales * 5, 20);

  // Ad activity: +2 per active ad, max +15
  if (adCount > 0) score += Math.min(adCount * 2, 15);

  // AI quality average: +20 if avg > 70
  const avgQ = avgQuality[0]?.avg || 0;
  if (avgQ > 70) score += 20;

  // No reports: +15; few reports (1-2): +5; 3+ reports: -10 per report
  const reportCount = user.reportCount || 0;
  if (reportCount === 0) score += 15;
  else if (reportCount < 3) score += 5;

  // Deduct 10 per report (capped between 0 and 100)
  score = Math.max(0, Math.min(100, score - reportCount * 10));

  // Persist and return
  await User.findByIdAndUpdate(userId, { sellerScore: score });
  return score;
}
