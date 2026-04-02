import Ad from '../models/Ad.js';
function cosineSim(a, b) { const dot = a.reduce((s, v, i) => s + v * b[i], 0); return dot / (Math.sqrt(a.reduce((s, v) => s + v*v, 0)) * Math.sqrt(b.reduce((s, v) => s + v*v, 0))); }
export async function findSimilarAds(vector, country) {
  const ads = await Ad.find({ country, isExpired: false, imageVector: { $exists: true } }).limit(500);
  return ads.map(ad => ({ ad, s: cosineSim(vector, ad.imageVector) })).sort((a, b) => b.s - a.s).slice(0, 20).map(r => r.ad);
}
