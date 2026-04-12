'use strict';
import SubcategoryExample from '../models/SubcategoryExample.js';

// In-memory example cache refreshed every 6 hours
let _cache = null;
let _cacheTime = 0;

async function loadExamples() {
  if (_cache && Date.now() - _cacheTime < 6 * 3600 * 1000) return _cache;
  const docs = await SubcategoryExample.find({}).lean();
  _cache = docs;
  _cacheTime = Date.now();
  return _cache;
}

function scoreText(text, examples) {
  if (!text || !examples || !examples.length) return 0;
  const lower = text.toLowerCase();
  let score = 0;
  for (const ex of examples) {
    const exLower = ex.toLowerCase();
    if (lower.includes(exLower)) {
      // Longer matches score higher
      score += exLower.split(/\s+/).length;
    }
  }
  return score;
}

// ─── Location vocab cache (6-hour TTL) ───────────────────────────────────────
let _locVocabCache = {};
let _locVocabCacheTime = {};
const LOC_CACHE_TTL = 6 * 3600 * 1000;

async function getLocationVocab(country) {
  if (!country) return null;
  const key = String(country).toUpperCase().trim();
  const now = Date.now();
  if (_locVocabCache[key] !== undefined && now - (_locVocabCacheTime[key] || 0) < LOC_CACHE_TTL) {
    return _locVocabCache[key];
  }
  try {
    // Lazy import to avoid circular dependency at startup
    const { default: LocationVocab } = await import('../models/LocationVocab.js');
    const doc = await LocationVocab.findOne({ country: key }).lean();
    _locVocabCache[key] = doc || null;
    _locVocabCacheTime[key] = now;
    return doc || null;
  } catch {
    _locVocabCache[key] = null;
    _locVocabCacheTime[key] = now;
    return null;
  }
}

// ─── Build a set of tokens from text (simple split) ──────────────────────────
function textTokens(text) {
  if (!text) return new Set();
  return new Set(
    text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(w => w.length > 1)
  );
}

// Returns { subcategory, subsub, confidence: 'high'|'medium'|'low' }
// country is optional — used to load local vocabulary for score boosting
async function detectSubcategory(category, text, country) {
  try {
    const all = await loadExamples();
    const filtered = all.filter(d => d.category === category);
    if (!filtered.length) return { subcategory: 'Other', subsub: 'Other', confidence: 'low' };

    // Optionally load location vocab for this country
    let locVocab = null;
    if (country) {
      locVocab = await getLocationVocab(country);
    }

    // Build word set from ad text for location vocab lookup
    const adTokens = locVocab ? textTokens(text) : null;

    let bestSub = null, bestSubScore = 0;
    let bestSubsub = null, bestSubsubScore = 0;

    for (const doc of filtered) {
      let s = scoreText(text, doc.examples);

      // ── Location vocab boost ──────────────────────────────────────────────
      // If the ad has a word that appears in this country's topWords AND that
      // word is associated with this doc's subsub, boost the score.
      if (locVocab && adTokens && doc.subsub && doc.subsub !== 'Other') {
        const vocabTopWords = new Set(locVocab.topWords || []);
        // Check if any term from locationVocab.terms matches doc.subsub
        const relevantTerms = (locVocab.terms || []).filter(
          t => t.subsubs && t.subsubs.includes(doc.subsub) && adTokens.has(t.word)
        );
        if (relevantTerms.length > 0) {
          // Each matching local term adds a frequency-weighted boost
          const boost = relevantTerms.reduce((sum, t) => sum + Math.min(t.frequency, 5), 0);
          s += boost;
        }
        // Additional boost: if ad contains any of the country's top 50 words
        // and they're in topWords → small confidence boost
        for (const token of adTokens) {
          if (vocabTopWords.has(token)) { s += 0.5; break; }
        }
      }

      if (s > bestSubScore) {
        bestSubScore = s;
        bestSub = doc.subcategory;
      }
      if (doc.subsub && s > bestSubsubScore) {
        bestSubsubScore = s;
        bestSubsub = doc.subsub;
      }
    }

    const confidence = bestSubScore >= 3 ? 'high' : bestSubScore >= 1 ? 'medium' : 'low';
    return {
      subcategory: bestSub    || 'Other',
      subsub:      bestSubsub || 'Other',
      confidence
    };
  } catch {
    return { subcategory: 'Other', subsub: 'Other', confidence: 'low' };
  }
}

function invalidateCache() {
  _cache = null;
  // Also clear location vocab cache
  _locVocabCache = {};
  _locVocabCacheTime = {};
}

export { detectSubcategory, invalidateCache, loadExamples, getLocationVocab };
