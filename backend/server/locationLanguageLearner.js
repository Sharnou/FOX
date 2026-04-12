'use strict';
/**
 * locationLanguageLearner.js
 * ---------------------------
 * Runs daily at 4am. Groups recent ads by country, extracts vocabulary,
 * detects language/dialect, upserts LocationVocab, and enriches
 * SubcategoryExample with newly learned country-specific terms.
 */

import mongoose from 'mongoose';
import LocationVocab from '../models/LocationVocab.js';
import SubcategoryExample from '../models/SubcategoryExample.js';
import { invalidateCache } from './categoryDetector.js';

// ─── Stop words ──────────────────────────────────────────────────────────────
const ARABIC_STOP = new Set([
  'من','في','إلى','على','مع','هذا','هذه','التي','الذي','يا','لا','ما','كل',
  'ذلك','هو','هي','أو','و','ب','ل','ك','ف','عن','أن','إن','قد','كان','كانت',
  'هم','نحن','أنت','أنا','هل','عند','بين','بعد','قبل','حتى','أي','لقد','لكن',
  'بس','ده','دي','دا','اللي','عليه','عليها','فيه','فيها','منه','منها'
]);

const ENGLISH_STOP = new Set([
  'the','a','an','is','are','was','were','in','on','at','to','for','with',
  'this','that','and','or','of','it','its','be','been','being','have','has',
  'had','do','does','did','will','would','could','should','may','might','shall',
  'by','from','up','about','into','through','during','after','before','between',
  'but','if','not','no','so','than','then','now','just','also','can','get',
  'all','one','two','i','we','you','he','she','they','my','your','our','their'
]);

const FRENCH_STOP = new Set([
  'le','la','les','de','du','des','un','une','et','en','au','aux','ce','se',
  'je','tu','il','elle','nous','vous','ils','elles','qui','que','dont','où',
  'pas','plus','très','bien','avec','pour','par','sur','dans','à','est','sont'
]);

// ─── Language detection ───────────────────────────────────────────────────────
function detectLanguage(texts) {
  let arabicChars = 0, latinChars = 0, frenchAccents = 0, total = 0;
  const frenchAccentRe = /[éàèùâêîôûäëïöüç]/gi;

  for (const t of texts) {
    if (!t) continue;
    for (const ch of t) {
      const cp = ch.codePointAt(0);
      if (cp >= 0x0600 && cp <= 0x06FF) arabicChars++;
      else if ((cp >= 0x0041 && cp <= 0x005A) || (cp >= 0x0061 && cp <= 0x007A)) latinChars++;
      total++;
    }
    frenchAccents += (t.match(frenchAccentRe) || []).length;
  }

  if (total === 0) return 'unknown';
  const arabicRatio = arabicChars / total;
  const latinRatio  = latinChars  / total;

  if (arabicRatio > 0.25) return 'ar';
  if (latinRatio  > 0.25) {
    if (frenchAccents > 5) return 'fr';
    return 'en';
  }
  return 'unknown';
}

// ─── Tokenize a string into meaningful tokens ────────────────────────────────
function tokenize(text) {
  if (!text || typeof text !== 'string') return [];
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(w => {
      if (w.length < 2) return false;
      if (ARABIC_STOP.has(w)) return false;
      if (ENGLISH_STOP.has(w)) return false;
      if (FRENCH_STOP.has(w)) return false;
      return true;
    });
}

// ─── Call Gemini for dialect detection ───────────────────────────────────────
async function detectDialectWithGemini(sampleTitles) {
  try {
    if (!process.env.GEMINI_API_KEY && !process.env.NEXT_PUBLIC_GEMINI_KEY) return null;
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(
      process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_KEY
    );
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const samples = sampleTitles.slice(0, 5).map((t, i) => `${i + 1}. ${t}`).join('\n');
    const prompt = `What dialect/language are these marketplace listings written in?\n${samples}\n\nReply with ONLY: language_code|dialect_name\nExamples: ar|Egyptian Arabic  /  ar|Gulf Arabic  /  fr|French  /  en|American English`;
    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();
    const [langCode, dialectName] = raw.split('|');
    if (langCode && dialectName) {
      return { language: langCode.trim().toLowerCase(), dialect: dialectName.trim() };
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Main learning function ───────────────────────────────────────────────────
async function learnLocationLanguages() {
  try {
    const Ad = mongoose.models.Ad || mongoose.model('Ad');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const ads = await Ad.find(
      {
        createdAt: { $gte: thirtyDaysAgo },
        country:   { $exists: true, $ne: null, $ne: '' },
        isDeleted: { $ne: true }
      },
      { country: 1, title: 1, description: 1, category: 1, subsub: 1 }
    ).lean();

    if (!ads.length) return;

    // Group by country
    const byCountry = {};
    for (const ad of ads) {
      const c = String(ad.country || 'UNKNOWN').toUpperCase().trim();
      if (!byCountry[c]) byCountry[c] = [];
      byCountry[c].push(ad);
    }

    for (const [country, countryAds] of Object.entries(byCountry)) {
      if (countryAds.length < 5) continue; // need at least 5 ads to learn

      // ── Extract vocabulary ────────────────────────────────────────────────
      const termMap = {}; // word → { frequency, categories: Set, subsubs: Set }
      const allTexts = [];

      for (const ad of countryAds) {
        const text = `${ad.title || ''} ${ad.description || ''}`.trim();
        allTexts.push(ad.title || '');

        const tokens = tokenize(text);
        for (const token of tokens) {
          if (!termMap[token]) {
            termMap[token] = { frequency: 0, categories: new Set(), subsubs: new Set() };
          }
          termMap[token].frequency++;
          if (ad.category) termMap[token].categories.add(ad.category);
          if (ad.subsub && ad.subsub !== 'Other') termMap[token].subsubs.add(ad.subsub);
        }
      }

      // ── Detect language ───────────────────────────────────────────────────
      const detectedLang = detectLanguage(allTexts);

      // ── Detect dialect via Gemini (best-effort) ───────────────────────────
      const sampleTitles = countryAds
        .slice(0, 10)
        .map(a => a.title || '')
        .filter(Boolean);
      const geminiResult = await detectDialectWithGemini(sampleTitles);

      // ── Build sorted terms list ───────────────────────────────────────────
      const terms = Object.entries(termMap)
        .sort(([, a], [, b]) => b.frequency - a.frequency)
        .slice(0, 500) // keep top 500 terms
        .map(([word, data]) => ({
          word,
          frequency:  data.frequency,
          categories: [...data.categories],
          subsubs:    [...data.subsubs],
          lastSeen:   new Date()
        }));

      const topWords = terms.slice(0, 50).map(t => t.word);
      const sampleAds = sampleTitles.slice(0, 5);

      const finalLang    = geminiResult?.language || detectedLang;
      const finalDialect = geminiResult?.dialect   || '';

      // ── Upsert LocationVocab ──────────────────────────────────────────────
      await LocationVocab.findOneAndUpdate(
        { country },
        {
          $set: {
            language:  finalLang,
            dialect:   finalDialect,
            terms,
            topWords,
            sampleAds,
            updatedAt: new Date()
          }
        },
        { upsert: true, new: true }
      );

      // ── Update SubcategoryExample with high-frequency local terms ─────────
      // For each term that has a single dominant subsub, add it as an example
      for (const term of terms) {
        if (term.frequency < 3) break; // sorted by freq, so we can break early
        if (term.subsubs.length !== 1) continue; // only if unambiguous
        if (term.categories.length !== 1) continue;

        const category   = term.categories[0];
        const subsub     = term.subsubs[0];

        // Derive subcategory from subsub (best-effort) — use subsub as subcategory key too
        await SubcategoryExample.findOneAndUpdate(
          { category, subsub },
          {
            $addToSet:  { examples: term.word },
            $set:       { lastUpdated: new Date(), source: 'location-learner' }
          },
          { upsert: true }
        );
      }
    }

    // Invalidate categoryDetector cache so new examples are picked up
    invalidateCache();
    // Also invalidate location vocab cache
    _locVocabCache = {};
  } catch {
    // Silent — non-fatal background job
  }
}

// ─── In-memory location vocab cache (shared with categoryDetector) ────────────
let _locVocabCache = {};
let _locVocabCacheTime = {};
const LOC_CACHE_TTL = 6 * 3600 * 1000; // 6 hours

async function getLocationVocab(country) {
  if (!country) return null;
  const key = String(country).toUpperCase().trim();
  const now = Date.now();
  if (_locVocabCache[key] && now - (_locVocabCacheTime[key] || 0) < LOC_CACHE_TTL) {
    return _locVocabCache[key];
  }
  try {
    const doc = await LocationVocab.findOne({ country: key }).lean();
    _locVocabCache[key] = doc || null;
    _locVocabCacheTime[key] = now;
    return doc || null;
  } catch {
    return null;
  }
}

function invalidateLocVocabCache() {
  _locVocabCache = {};
  _locVocabCacheTime = {};
}

// ─── Scheduler: daily at 4am ──────────────────────────────────────────────────
function scheduleLocationLanguageLearner() {
  // Use cron if available, else setInterval polling
  (async () => {
    try {
      const cron = (await import('node-cron')).default;
      cron.schedule('0 4 * * *', () => {
        learnLocationLanguages().catch(() => {});
      });
    } catch {
      // Fallback: check every minute if it's 4:00am
      setInterval(() => {
        const now = new Date();
        if (now.getHours() === 4 && now.getMinutes() === 0) {
          learnLocationLanguages().catch(() => {});
        }
      }, 60 * 1000);
    }
  })();
}

// ─── CHANGE 4 & 5: recordDetectedLanguage ────────────────────────────────────
/**
 * Called every time a new language is detected in any content (audio, text, etc.).
 * Records it in LocationVocab for the given country so future Whisper calls can
 * use the right vocabulary prompt.
 * NEVER throws.
 */
async function recordDetectedLanguage(langCode, context) {
  try {
    if (!context) return;
    const country = (context.country || 'XX').toUpperCase();

    // Determine language from langCode or from sample text
    let lang = langCode || '';
    if (!lang && context.sampleText) {
      lang = detectLanguage([context.sampleText]);
    }
    if (!lang || lang === 'unknown') return;

    await LocationVocab.findOneAndUpdate(
      { country },
      {
        $set: { language: lang, updatedAt: new Date() },
        $setOnInsert: { country, terms: [], topWords: [], sampleAds: [] }
      },
      { upsert: true, new: true }
    );

    // Also record in the GLOBAL catch-all entry
    await LocationVocab.findOneAndUpdate(
      { country: 'GLOBAL' },
      {
        $addToSet: { topWords: lang },
        $set: { updatedAt: new Date() }
      },
      { upsert: true, new: true }
    );

    // If we have a sample text, extract top tokens and push to sampleAds / topWords
    if (context.sampleText && context.sampleText.length > 5) {
      const tokens = tokenize(context.sampleText).slice(0, 10);
      if (tokens.length > 0) {
        await LocationVocab.findOneAndUpdate(
          { country },
          {
            $addToSet: { topWords: { $each: tokens } },
            $push: { sampleAds: { $each: [context.sampleText.slice(0, 80)], $slice: -20 } },
            $set: { updatedAt: new Date() }
          },
          { upsert: true }
        );
      }
    }
  } catch { /* NEVER throw from learning functions */ }
}

// ─── CHANGE 5: buildLanguagePrompt ───────────────────────────────────────────
/**
 * Builds a Whisper initial_prompt string from learned vocabulary for a country.
 * Returns a comma-separated string of top local words, or null if no vocab exists.
 * Used by whisper.js to nudge transcription toward the correct local language.
 * NEVER throws.
 */
async function buildLanguagePrompt(country) {
  try {
    if (!country) return null;
    const key = String(country).toUpperCase().trim();

    // Try local cache first
    const cached = await getLocationVocab(key);
    if (!cached || !cached.topWords || cached.topWords.length === 0) return null;

    // Return top 10 words as a natural-language prompt hint
    const words = cached.topWords
      .filter(w => typeof w === 'string' && w.length > 1 && w.length < 30)
      .slice(0, 10);
    if (words.length === 0) return null;

    return words.join('، ');
  } catch {
    return null; // NEVER throw
  }
}

export {
  learnLocationLanguages,
  scheduleLocationLanguageLearner,
  getLocationVocab,
  invalidateLocVocabCache,
  recordDetectedLanguage,
  buildLanguagePrompt
};
