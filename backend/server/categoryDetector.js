'use strict';
import SubcategoryExample from '../models/SubcategoryExample.js';

// In-memory cache refreshed every 6 hours
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

// Returns { subcategory, subsub, confidence: 'high'|'medium'|'low' }
async function detectSubcategory(category, text) {
  try {
    const all = await loadExamples();
    const filtered = all.filter(d => d.category === category);
    if (!filtered.length) return { subcategory: 'Other', subsub: 'Other', confidence: 'low' };

    let bestSub = null, bestSubScore = 0;
    let bestSubsub = null, bestSubsubScore = 0;

    for (const doc of filtered) {
      const s = scoreText(text, doc.examples);
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
      subcategory: bestSub || 'Other',
      subsub: bestSubsub || 'Other',
      confidence
    };
  } catch {
    return { subcategory: 'Other', subsub: 'Other', confidence: 'low' };
  }
}

function invalidateCache() { _cache = null; }

export { detectSubcategory, invalidateCache, loadExamples };
