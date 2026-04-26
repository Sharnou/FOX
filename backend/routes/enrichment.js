// Enrichment Ads — profile, segment, and insights endpoints
// Combines user behavior, ad activity, and reputation to compute an
// "enrichment score" that drives smarter ad targeting and engagement.
import express from 'express';
import mongoose from 'mongoose';
import { auth, optionalAuth } from '../middleware/auth.js';
import User from '../models/User.js';
import Ad from '../models/Ad.js';

const router = express.Router();

// ── Helpers ─────────────────────────────────────────────────────────────────
function computeEnrichmentScore(user, stats = {}) {
  if (!user) return 0;
  let score = 0;
  // Profile completeness (0–35)
  if (user.name?.trim())   score += 5;
  if (user.phone?.trim())  score += 5;
  if (user.avatar?.trim()) score += 5;
  if (user.bio?.trim())    score += 5;
  if (user.gender)         score += 5;
  if (user.city?.trim())   score += 5;
  if (user.emailVerified || user.whatsappVerified) score += 5;

  // Reputation (0–25)
  const pts = Number(user.reputationPoints || 0);
  if (pts >= 500)      score += 25;
  else if (pts >= 200) score += 18;
  else if (pts >= 50)  score += 10;
  else                 score += 4;

  // Activity (0–25)
  const adCount = Number(stats.adCount || 0);
  if (adCount >= 20)      score += 25;
  else if (adCount >= 10) score += 18;
  else if (adCount >= 3)  score += 10;
  else if (adCount >= 1)  score += 4;

  // Tenure (0–15) — older accounts are more enriched
  const ageDays = user.createdAt
    ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / 86400000)
    : 0;
  if (ageDays >= 365)     score += 15;
  else if (ageDays >= 90) score += 10;
  else if (ageDays >= 30) score += 5;

  return Math.min(score, 100);
}

function tierFromScore(score) {
  if (score >= 85) return { tier: 'platinum', tierAr: 'بلاتيني', emoji: '💎' };
  if (score >= 65) return { tier: 'gold',     tierAr: 'ذهبي',   emoji: '🥇' };
  if (score >= 40) return { tier: 'silver',   tierAr: 'فضي',    emoji: '🥈' };
  return            { tier: 'bronze',   tierAr: 'برونزي', emoji: '🥉' };
}

function segmentFromUser(user, stats = {}) {
  const segments = [];
  if (user?.gender === 'male') segments.push('male');
  if (user?.gender === 'female') segments.push('female');
  if (user?.country) segments.push(`country:${user.country}`);
  if (user?.city)    segments.push(`city:${user.city}`);
  if ((user?.reputationPoints || 0) >= 200) segments.push('high_reputation');
  if ((stats.adCount || 0) >= 5) segments.push('active_seller');
  if (stats.recentCategories?.length) {
    for (const cat of stats.recentCategories.slice(0, 3)) segments.push(`interest:${cat}`);
  }
  return segments;
}

async function loadUserStats(userId) {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return { adCount: 0, recentCategories: [] };
  }
  try {
    const adCount = await Ad.countDocuments({
      $or: [{ userId }, { seller: userId }],
      isDeleted: { $ne: true },
    });
    const recentAds = await Ad.find({
      $or: [{ userId }, { seller: userId }],
      isDeleted: { $ne: true },
    })
      .select('category')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    const cats = [...new Set(recentAds.map(a => a.category).filter(Boolean))];
    return { adCount, recentCategories: cats };
  } catch {
    return { adCount: 0, recentCategories: [] };
  }
}

// ── GET /api/enrichment/profile — current user's enrichment profile ─────────
router.get('/profile', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.user.id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    const user = await User.findById(req.user.id).select(
      'name phone avatar bio gender city country emailVerified whatsappVerified reputationPoints createdAt'
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    const stats = await loadUserStats(req.user.id);
    const score = computeEnrichmentScore(user, stats);
    const tier = tierFromScore(score);
    const segments = segmentFromUser(user, stats);

    res.json({
      score,
      ...tier,
      segments,
      stats,
      profileComplete: score >= 65,
      recommendations: buildRecommendations(user, score),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/enrichment/segment — segment for current user (or anonymous) ───
router.get('/segment', optionalAuth, async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.json({
        segments: ['anonymous'],
        tier: 'bronze',
        emoji: '🥉',
        score: 0,
      });
    }
    if (!mongoose.Types.ObjectId.isValid(req.user.id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    const user = await User.findById(req.user.id).select(
      'name phone avatar bio gender city country emailVerified whatsappVerified reputationPoints createdAt'
    );
    if (!user) return res.json({ segments: ['anonymous'], tier: 'bronze', emoji: '🥉', score: 0 });

    const stats = await loadUserStats(req.user.id);
    const score = computeEnrichmentScore(user, stats);
    const tier = tierFromScore(score);
    res.json({
      segments: segmentFromUser(user, stats),
      ...tier,
      score,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/enrichment/insights — aggregate insights (for sellers) ─────────
router.get('/insights', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.user.id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    const ads = await Ad.find({
      $or: [{ userId: req.user.id }, { seller: req.user.id }],
      isDeleted: { $ne: true },
    })
      .select('category views createdAt status price')
      .lean();

    const totalAds = ads.length;
    const totalViews = ads.reduce((s, a) => s + (Number(a.views) || 0), 0);
    const avgViews = totalAds ? Math.round(totalViews / totalAds) : 0;
    const byCategory = ads.reduce((acc, a) => {
      const k = a.category || 'other';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
    const topCategories = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }));

    res.json({
      totalAds,
      totalViews,
      avgViews,
      topCategories,
      tips: buildInsightTips(totalAds, totalViews, avgViews),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function buildRecommendations(user, score) {
  const recs = [];
  if (!user.avatar?.trim()) recs.push({ key: 'avatar', ar: 'أضف صورة شخصية لزيادة الثقة', en: 'Add a profile photo to build trust', boost: 5 });
  if (!user.bio?.trim())    recs.push({ key: 'bio',    ar: 'اكتب نبذة مختصرة عنك',           en: 'Write a short bio',                   boost: 5 });
  if (!user.gender)         recs.push({ key: 'gender', ar: 'حدد الجنس لتحسين استهداف الإعلانات', en: 'Select gender for better ad targeting', boost: 5 });
  if (!user.phone?.trim())  recs.push({ key: 'phone',  ar: 'أضف رقم واتساب للتواصل المباشر',  en: 'Add a WhatsApp number',               boost: 5 });
  if (!user.emailVerified && !user.whatsappVerified) {
    recs.push({ key: 'verify', ar: 'وثّق حسابك (بريد أو واتساب)', en: 'Verify your account (email or WhatsApp)', boost: 5 });
  }
  if (score < 40) recs.push({ key: 'engage', ar: 'انشر إعلانك الأول لرفع نقاطك', en: 'Post your first ad to boost your score', boost: 10 });
  return recs;
}

function buildInsightTips(totalAds, totalViews, avgViews) {
  const tips = [];
  if (totalAds === 0) {
    tips.push({ ar: 'لم تنشر أي إعلان بعد. ابدأ الآن لرؤية البيانات.', en: 'No ads yet — post one to see insights.' });
  } else if (avgViews < 20) {
    tips.push({ ar: 'متوسط المشاهدات منخفض — حسّن العنوان والصور.', en: 'Low average views — improve titles and photos.' });
  } else if (avgViews >= 100) {
    tips.push({ ar: 'أداؤك ممتاز! جرّب رفع إعلاناتك للأعلى لزيادة المبيعات.', en: 'Great performance — promote ads to convert faster.' });
  }
  if (totalAds >= 5 && totalViews / Math.max(totalAds, 1) > 50) {
    tips.push({ ar: 'محتواك جذاب — استمر بنفس الأسلوب.', en: 'Engaging content — keep it up.' });
  }
  return tips;
}

export default router;
