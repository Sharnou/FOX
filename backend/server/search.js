import { Client } from '@elastic/elasticsearch';
let client;
export function getSearchClient() {
  if (!client && process.env.ELASTIC_URL) { client = new Client({ node: process.env.ELASTIC_URL }); }
  return client;
}
export async function indexAd(ad) {
  const c = getSearchClient(); if (!c) return;
  await c.index({ index: 'xtox_ads', id: ad._id.toString(), document: { title: ad.title, description: ad.description, category: ad.category, city: ad.city, country: ad.country, price: ad.price, translations: ad.translations } });
}
export async function searchAds(query, country) {
  const c = getSearchClient(); if (!c) return [];
  const res = await c.search({ index: 'xtox_ads', query: { bool: { must: [{ match: { country } }], should: [{ match: { title: { query, boost: 3 } } }, { match: { description: query } }, { match: { 'translations.en': query } }, { match: { 'translations.ar': query } }] } } });
  return res.hits.hits.map(h => h._source);
}
