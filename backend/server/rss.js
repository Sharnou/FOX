import Ad from '../models/Ad.js';

export async function generateRSS(country, baseUrl) {
  const ads = await Ad.find({ country, isExpired: false, isDeleted: false }).sort({ createdAt: -1 }).limit(50);

  const items = ads.map(ad => `
    <item>
      <title><![CDATA[${ad.title}]]></title>
      <link>${baseUrl}/ads/${ad._id}</link>
      <description><![CDATA[${ad.description || ''}]]></description>
      <pubDate>${new Date(ad.createdAt).toUTCString()}</pubDate>
      <guid>${baseUrl}/ads/${ad._id}</guid>
    </item>
  `).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>XTOX Marketplace — ${country}</title>
    <link>${baseUrl}</link>
    <description>Latest ads from XTOX marketplace</description>
    <language>${country === 'EG' ? 'ar' : 'en'}</language>
    ${items}
  </channel>
</rss>`;
}
