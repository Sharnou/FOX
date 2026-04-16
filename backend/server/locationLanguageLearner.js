'use strict';
/**
 * locationLanguageLearner.js
 * ---------------------------
 * Runs daily at 4am. Groups recent ads by country, extracts vocabulary,
 * detects language/dialect offline (no AI), upserts LocationVocab, and
 * enriches SubcategoryExample with newly learned country-specific terms.
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

// ─── Offline language detection ───────────────────────────────────────────────
/**
 * Fast offline language detection. Returns 'ar', 'fr', 'en', or 'unknown'.
 * Uses Unicode character analysis — no network request.
 */
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

// ─── Offline dialect detection ────────────────────────────────────────────────
// Maps country codes to dialect labels (no AI needed)
const COUNTRY_DIALECT_MAP = {
  EG: { language: 'ar', dialect: 'Egyptian Arabic' },
  SA: { language: 'ar', dialect: 'Gulf Arabic' },
  AE: { language: 'ar', dialect: 'Gulf Arabic' },
  KW: { language: 'ar', dialect: 'Gulf Arabic' },
  QA: { language: 'ar', dialect: 'Gulf Arabic' },
  BH: { language: 'ar', dialect: 'Gulf Arabic' },
  OM: { language: 'ar', dialect: 'Gulf Arabic' },
  IQ: { language: 'ar', dialect: 'Iraqi Arabic' },
  SY: { language: 'ar', dialect: 'Levantine Arabic' },
  LB: { language: 'ar', dialect: 'Levantine Arabic' },
  JO: { language: 'ar', dialect: 'Levantine Arabic' },
  PS: { language: 'ar', dialect: 'Levantine Arabic' },
  LY: { language: 'ar', dialect: 'Libyan Arabic' },
  TN: { language: 'ar', dialect: 'Tunisian Arabic' },
  DZ: { language: 'ar', dialect: 'Algerian Arabic' },
  MA: { language: 'ar', dialect: 'Moroccan Arabic' },
  SD: { language: 'ar', dialect: 'Sudanese Arabic' },
  YE: { language: 'ar', dialect: 'Yemeni Arabic' },
  FR: { language: 'fr', dialect: 'French' },
  BE: { language: 'fr', dialect: 'Belgian French' },
  CH: { language: 'fr', dialect: 'Swiss French' },
  US: { language: 'en', dialect: 'American English' },
  GB: { language: 'en', dialect: 'British English' },
  AU: { language: 'en', dialect: 'Australian English' },
  CA: { language: 'en', dialect: 'Canadian English' },
};

function detectDialectOffline(country, detectedLang) {
  const key = String(country || '').toUpperCase().trim();
  const mapped = COUNTRY_DIALECT_MAP[key];
  if (mapped) return mapped;
  if (detectedLang === 'ar') return { language: 'ar', dialect: 'Arabic' };
  if (detectedLang === 'fr') return { language: 'fr', dialect: 'French' };
  if (detectedLang === 'en') return { language: 'en', dialect: 'English' };
  return { language: detectedLang || 'unknown', dialect: '' };
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
      if (countryAds.length < 5) continue;

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

      // ── Detect language offline ───────────────────────────────────────────
      const detectedLang = detectLanguage(allTexts);

      // ── Detect dialect offline (no AI call) ───────────────────────────────
      const dialectResult = detectDialectOffline(country, detectedLang);

      // ── Build sorted terms list ───────────────────────────────────────────
      const terms = Object.entries(termMap)
        .sort(([, a], [, b]) => b.frequency - a.frequency)
        .slice(0, 500)
        .map(([word, data]) => ({
          word,
          frequency:  data.frequency,
          categories: [...data.categories],
          subsubs:    [...data.subsubs],
          lastSeen:   new Date()
        }));

      const topWords = terms.slice(0, 50).map(t => t.word);
      const sampleAds = allTexts.slice(0, 5);

      const finalLang    = dialectResult.language || detectedLang;
      const finalDialect = dialectResult.dialect   || '';

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
        { upsert: true, returnDocument: 'after' }
      );

      // ── Update SubcategoryExample with high-frequency local terms ─────────
      for (const term of terms) {
        if (term.frequency < 3) break;
        if (term.subsubs.length !== 1) continue;
        if (term.categories.length !== 1) continue;

        const category   = term.categories[0];
        const subsub     = term.subsubs[0];

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

    invalidateCache();
    _locVocabCache = {};
  } catch {
    // Silent — non-fatal background job
  }
}

// ─── In-memory location vocab cache (shared with categoryDetector) ────────────
let _locVocabCache = {};
let _locVocabCacheTime = {};
const LOC_CACHE_TTL = 6 * 3600 * 1000;

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
  (async () => {
    try {
      const cron = (await import('node-cron')).default;
      cron.schedule('0 4 * * *', () => {
        learnLocationLanguages().catch(() => {});
      });
    } catch {
      setInterval(() => {
        const now = new Date();
        if (now.getHours() === 4 && now.getMinutes() === 0) {
          learnLocationLanguages().catch(() => {});
        }
      }, 60 * 1000);
    }
  })();
}

// ─── recordDetectedLanguage ────────────────────────────────────────────────────
/**
 * Called every time a new language is detected in any content.
 * Records it in LocationVocab for the given country.
 * NEVER throws.
 */
async function recordDetectedLanguage(langCode, context) {
  try {
    if (!context) return;
    const country = (context.country || 'XX').toUpperCase();

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
      { upsert: true, returnDocument: 'after' }
    );

    await LocationVocab.findOneAndUpdate(
      { country: 'GLOBAL' },
      {
        $addToSet: { topWords: lang },
        $set: { updatedAt: new Date() }
      },
      { upsert: true, returnDocument: 'after' }
    );

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

// ─── buildLanguagePrompt ───────────────────────────────────────────────────────
/**
 * Builds a Whisper initial_prompt string from learned vocabulary for a country.
 * Returns a comma-separated string of top local words, or null if no vocab exists.
 * NEVER throws.
 */
async function buildLanguagePrompt(country) {
  try {
    if (!country) return null;
    const key = String(country).toUpperCase().trim();
    const cached = await getLocationVocab(key);
    if (!cached || !cached.topWords || cached.topWords.length === 0) return null;

    const words = cached.topWords
      .filter(w => typeof w === 'string' && w.length > 1 && w.length < 30)
      .slice(0, 10);
    if (words.length === 0) return null;

    return words.join('، ');
  } catch {
    return null;
  }
}

export {
  learnLocationLanguages,
  scheduleLocationLanguageLearner,
  getLocationVocab,
  invalidateLocVocabCache,
  recordDetectedLanguage,
  buildLanguagePrompt,
  detectLanguage
};
