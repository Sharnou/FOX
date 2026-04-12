'use strict';
import { GoogleGenerativeAI } from '@google/generative-ai';
import SubcategoryExample from '../models/SubcategoryExample.js';
import { invalidateCache } from './categoryDetector.js';
import mongoose from 'mongoose';

async function getAdModel() {
  return mongoose.model('Ad');
}

async function runWeeklyLearning() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const Ad = await getAdModel();

  // Find ads in General or with subcategory='Other'
  const unknownAds = await Ad.find({
    $or: [{ subcategory: 'Other' }, { subcategory: '' }, { subcategory: null }],
    isDeleted: { $ne: true },
    isExpired: { $ne: true }
  }).limit(50).lean();

  if (!unknownAds.length) return;

  for (const ad of unknownAds) {
    try {
      const text = `${ad.title || ''} ${ad.description || ''}`.trim();
      if (!text || text.length < 5) continue;

      const prompt = `You are a product classifier for a multilingual marketplace. Given this listing text (which may be in Arabic, English, French, or any language), return the most fitting subcategory as a short English value (like "MobilePhones", "Cars", "Apartments", "FullTime", "HomeServices", etc.) and 3-5 keywords in the same language as the listing text that identify this subcategory.

Listing: "${text}"
Category hint: ${ad.category || 'unknown'}

Respond ONLY as JSON: {"subcategory":"...","keywords":["...","..."]}`;

      const result = await model.generateContent(prompt);
      const raw = result.response.text().replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(raw);

      if (parsed.subcategory && parsed.keywords && parsed.keywords.length) {
        // Update the ad
        await Ad.findByIdAndUpdate(ad._id, { subcategory: parsed.subcategory });

        // Add new keywords to examples
        await SubcategoryExample.findOneAndUpdate(
          { category: ad.category || 'General', subcategory: parsed.subcategory, subsub: '' },
          {
            $addToSet: { examples: { $each: parsed.keywords } },
            $set: { lastUpdated: new Date(), source: 'ai' }
          },
          { upsert: true }
        );
      }
    } catch { /* skip individual failures silently */ }
  }

  invalidateCache();

  // ── Also run location language learning after weekly AI learning ──────────
  try {
    const { learnLocationLanguages } = await import('./locationLanguageLearner.js');
    await learnLocationLanguages();
  } catch { /* non-fatal */ }
}

// Run weekly (every Sunday at 3am)
function scheduleWeeklyLearner() {
  const MS_IN_WEEK = 7 * 24 * 60 * 60 * 1000;
  function getNextSunday3am() {
    const now = new Date();
    const day = now.getDay(); // 0=Sun
    const daysUntilSun = day === 0 ? 7 : 7 - day;
    const next = new Date(now);
    next.setDate(now.getDate() + daysUntilSun);
    next.setHours(3, 0, 0, 0);
    return next.getTime() - Date.now();
  }
  setTimeout(function tick() {
    runWeeklyLearning().catch(() => {});
    setTimeout(tick, MS_IN_WEEK);
  }, getNextSunday3am());
}

export { scheduleWeeklyLearner, runWeeklyLearning };
