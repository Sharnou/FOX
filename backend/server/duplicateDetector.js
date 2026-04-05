import Ad from '../models/Ad.js';
import { dbState, MemAd } from './memoryStore.js';
function getAdModel() { return dbState.usingMemoryStore ? MemAd : Ad; }

// ─── Arabic text normalizer ───────────────────────────────────────────────────
// Strips diacritics and unifies visually identical characters so that
// "سيارة" and "سياره" (with ta-marbuta) score as near-duplicates.
function normalizeArabic(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '')  // strip harakat / shadda / superscript alef
    .replace(/[أإآٱ]/g, '\u0627')             // unify alef variants → bare alef
    .replace(/\u0629/g, '\u0647')             // ta marbuta → ha
    .replace(/\u0649/g, '\u064A')             // alef maqsura → ya
    .replace(/\u0624/g, '\u0648')             // waw with hamza → waw
    .replace(/\u0626/g, '\u064A')             // ya with hamza → ya
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Levenshtein distance (iterative, O(m·n)) ────────────────────────────────
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  // Use two rows to save memory
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  let curr = new Array(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

// ─── Normalized similarity score [0 … 1] ─────────────────────────────────────
function similarity(rawA, rawB) {
  const a = normalizeArabic(rawA);
  const b = normalizeArabic(rawB);
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  if (a === b)  return 1;
  const maxLen = Math.max(a.length, b.length);
  // Early exit: if lengths differ too much, skip expensive computation
  if (Math.abs(a.length - b.length) / maxLen > 0.5) return 0;
  return 1 - levenshtein(a, b) / maxLen;
}

// ─── Configuration ────────────────────────────────────────────────────────────
const SIMILARITY_THRESHOLD = 0.80;  // 80 % → treat as duplicate
const LOOKBACK_DAYS        = 30;    // only compare against last 30 days of ads

// ─── Main export ──────────────────────────────────────────────────────────────
/**
 * Returns true if a sufficiently similar active ad already exists for this user.
 *
 * Strategy:
 *   1. Fast path  – exact title match in MongoDB (index-friendly).
 *   2. Fuzzy path – compare normalised Levenshtein similarity against recent ads
 *                   in the same category+city bucket (at most ~200 docs).
 *
 * @param {string} title
 * @param {string} category
 * @param {string} city
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export async function checkDuplicate(title, category, city, userId) {
  // 1. Exact match (O(log n) via compound index)
  const exact = await getAdModel().findOne(
    { userId, title, category, city, isExpired: { $ne: true }, isDeleted: { $ne: true } },
    { _id: 1 }
  ).lean();
  if (exact) return true;

  // 2. Fuzzy match among recent ads from the same user / category / city
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const bucket = await getAdModel().find(
    { userId, category, city, isExpired: { $ne: true }, isDeleted: { $ne: true }, createdAt: { $gte: since } },
    { title: 1, _id: 0 }
  ).limit(200).lean();

  return bucket.some(ad => similarity(ad.title, title) >= SIMILARITY_THRESHOLD);
}
