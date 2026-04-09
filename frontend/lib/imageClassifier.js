'use client';
// frontend/lib/imageClassifier.js
// Smart product classifier using the offline knowledge base.
// Works entirely offline — no API calls.

import { PRODUCT_KB, MOBILENET_LABEL_MAP, KEYWORD_MAP } from './productKB';

// ─── LocalStorage: learned user corrections ───────────────────────────────────
const CORRECTION_KEY = 'xtox_ai_corrections_v2';

function getLearnedCorrections() {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(CORRECTION_KEY) || '{}');
  } catch { return {}; }
}

/**
 * Save a user correction so AI learns for next time.
 * Called when user changes category/subcategory AFTER AI made a suggestion.
 * @param {string} detectedLabel  - The MobileNet label that triggered the wrong result
 * @param {object} userChoices    - { category, subcategory, subsub }
 */
export function saveAICorrection(detectedLabel, userChoices) {
  if (!detectedLabel || typeof window === 'undefined') return;
  try {
    const corrections = getLearnedCorrections();
    corrections[detectedLabel.toLowerCase()] = {
      category:    userChoices.category    || '',
      subcategory: userChoices.subcategory || '',
      subsub:      userChoices.subsub      || 'Other',
      ts:          Date.now(),
    };
    localStorage.setItem(CORRECTION_KEY, JSON.stringify(corrections));
  } catch {}
}

// ─── Label normalisation helpers ─────────────────────────────────────────────

/**
 * MobileNet v2 returns label strings like:
 *   "cellular telephone, cell phone, mobile phone"
 * We split on commas and try each part.
 */
function splitMobilenetLabel(rawLabel) {
  return rawLabel
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Try to find a KB entry from a single label string (already lower-cased).
 * Strategy: exact match first, then partial/contains match over all keys.
 */
function lookupLabel(label) {
  // 1. Exact match
  if (MOBILENET_LABEL_MAP[label] !== undefined) {
    return MOBILENET_LABEL_MAP[label];
  }
  // 2. Check if any map key IS contained within the label
  for (const [key, idx] of Object.entries(MOBILENET_LABEL_MAP)) {
    if (label.includes(key) || key.includes(label)) {
      return idx;
    }
  }
  return undefined;
}

// ─── Main classification function ─────────────────────────────────────────────
/**
 * Classify a product from MobileNet predictions.
 *
 * @param {Array<{label: string, probability: number}>} mobilenetResults
 *   Array returned by model.classify() — each item has .label and .probability
 * @param {string} [titleText='']
 *   Optional title text for keyword-based fallback matching
 *
 * @returns {{
 *   category: string,
 *   subcategory: string,
 *   subsub: string,
 *   title: string,
 *   description: string,
 *   confidence: number,
 *   detectedAs: string,
 *   learned: boolean
 * } | null}
 */
export function classifyProduct(mobilenetResults, titleText = '') {
  if (!mobilenetResults || mobilenetResults.length === 0) return null;

  const corrections = getLearnedCorrections();

  // ── Step 1: Try each MobileNet prediction (sorted by probability, best first) ─
  for (const result of mobilenetResults) {
    const rawLabel  = result.label || '';
    const confidence = result.probability ?? result.confidence ?? 0;
    const labelParts = splitMobilenetLabel(rawLabel);

    for (const label of labelParts) {
      // 1a. Learned corrections take priority
      if (corrections[label]) {
        const c = corrections[label];
        return {
          category:    c.category,
          subcategory: c.subcategory,
          subsub:      c.subsub,
          title:       '',   // user will have already set this
          description: '',
          confidence,
          detectedAs:  rawLabel,
          learned:     true,
        };
      }

      // 1b. KB lookup
      const kbIndex = lookupLabel(label);
      if (kbIndex !== undefined) {
        const entry = PRODUCT_KB[kbIndex];
        return {
          category:    entry.category,
          subcategory: entry.subcategory,
          subsub:      entry.subsub || 'Other',
          title:       entry.titleTemplate,
          description: entry.descTemplate,
          confidence,
          detectedAs:  rawLabel,
          learned:     false,
        };
      }
    }
  }

  // ── Step 2: Keyword matching on title text ─────────────────────────────────
  if (titleText && titleText.trim()) {
    const lower = titleText.toLowerCase();

    // Sort keyword map keys by length (longest first) to prefer specific matches
    const sortedKeywords = Object.keys(KEYWORD_MAP).sort((a, b) => b.length - a.length);

    for (const keyword of sortedKeywords) {
      if (lower.includes(keyword)) {
        const kbIndex = KEYWORD_MAP[keyword];
        const entry   = PRODUCT_KB[kbIndex];
        return {
          category:    entry.category,
          subcategory: entry.subcategory,
          subsub:      entry.subsub || 'Other',
          title:       entry.titleTemplate,
          description: entry.descTemplate,
          confidence:  0.5,
          detectedAs:  keyword,
          learned:     false,
        };
      }
    }
  }

  // ── Step 3: Fallback — return top prediction with no category mapping ───────
  const top = mobilenetResults[0];
  return {
    category:    '',
    subcategory: '',
    subsub:      '',
    title:       '',
    description: '',
    confidence:  top.probability ?? top.confidence ?? 0,
    detectedAs:  top.label || '',
    learned:     false,
  };
}

// ─── Description formatter ────────────────────────────────────────────────────
/**
 * Replace {condition} placeholder in description template.
 * @param {string} template - e.g. "لابتوب بحالة {condition}"
 * @param {string} condition - 'new' | 'used' | 'excellent' | 'rent'
 */
export function formatDescription(template, condition = 'used') {
  if (!template) return '';
  const condMap = {
    new:       'جديد',
    used:      'مستعمل',
    excellent: 'ممتاز',
    rent:      'للإيجار',
    'like new': 'كالجديد',
  };
  const condAr = condMap[condition] || condition || 'مستعمل';
  return template.replace('{condition}', condAr);
}

export default { classifyProduct, saveAICorrection, formatDescription };
