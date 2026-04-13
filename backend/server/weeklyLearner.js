'use strict';
import { OpenAI } from 'openai';
import SubcategoryExample from '../models/SubcategoryExample.js';
import { invalidateCache } from './categoryDetector.js';
import mongoose from 'mongoose';

// Initialize OpenAI client (graceful fallback if key not set)
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

async function getAdModel() {
  return mongoose.model('Ad');
}

async function runWeeklyLearning() {
  if (!openai) {
    console.warn('[weeklyLearner] OpenAI not configured — learner disabled');
    return null;
  }

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

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
      });
      const raw = (completion.choices[0]?.message?.content || '').replace(/```json|```/g, '').trim();
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

  // ── Learn new subsub options from recent ads ─────────────────────────────
  try {
    await learnNewSubsubOptions();
  } catch { /* non-fatal */ }
}

async function learnNewSubsubOptions() {
  if (!openai) {
    console.warn('[weeklyLearner] OpenAI not configured — learnNewSubsubOptions disabled');
    return null;
  }

  const Ad = await getAdModel();

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Query last 7 days of ads
  const recentAds = await Ad.find({
    createdAt: { $gte: weekAgo },
    subsub: { $exists: true, $ne: null, $ne: '', $ne: 'Other' },
    category: { $exists: true, $ne: null, $ne: '' },
    subcategory: { $exists: true, $ne: null, $ne: '', $ne: 'Other' },
    isDeleted: { $ne: true },
    isExpired: { $ne: true },
  }).lean();

  if (!recentAds.length) return;

  // Group by category + subcategory → collect unique subsub values
  const groups = {};
  for (const ad of recentAds) {
    const key = `${ad.category}||${ad.subcategory}`;
    if (!groups[key]) groups[key] = { category: ad.category, subcategory: ad.subcategory, subsubs: new Set() };
    if (ad.subsub) groups[key].subsubs.add(ad.subsub);
  }

  const SubsubOption = (await import('../models/SubsubOption.js')).default;

  for (const key of Object.keys(groups)) {
    const { category, subcategory, subsubs } = groups[key];
    const subsubList = [...subsubs].slice(0, 30);
    if (subsubList.length < 2) continue;

    try {
      const prompt = `These are user-submitted sub-subcategory values for category '${category}' > subcategory '${subcategory}' on an Arab marketplace:
${subsubList.join('\n')}

Return a JSON array of the best 10 sub-subcategory labels in Arabic and English for this category.
Format: [{"ar": "...", "en": "..."}]`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
      });
      const raw = (completion.choices[0]?.message?.content || '').replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed) && parsed.length) {
        await SubsubOption.findOneAndUpdate(
          { category, subcategory },
          { $set: { options: parsed, updatedAt: new Date() } },
          { upsert: true }
        );
      }
    } catch { /* skip individual failures silently */ }
  }
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

export { scheduleWeeklyLearner, runWeeklyLearning, learnNewSubsubOptions };
