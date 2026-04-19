const fs = require('fs');
const path = require('path');

const BASE = 'https://fox-kohl-eight.vercel.app';
const today = new Date().toISOString().slice(0, 10);

const staticUrls = [
  { loc: `${BASE}/`,            freq: 'weekly',  pri: '1.0' },
  { loc: `${BASE}/ads`,         freq: 'daily',   pri: '0.9' },
  { loc: `${BASE}/leaderboard`, freq: 'weekly',  pri: '0.8' },
  { loc: `${BASE}/honor-roll`,  freq: 'weekly',  pri: '0.8' },
  { loc: `${BASE}/login`,       freq: 'monthly', pri: '0.5' },
  { loc: `${BASE}/register`,    freq: 'monthly', pri: '0.5' },
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.freq}</changefreq>
    <priority>${u.pri}</priority>
  </url>`).join('\n')}
</urlset>`;

const outPath = path.join(__dirname, '..', 'public', 'sitemap.xml');
fs.writeFileSync(outPath, xml, 'utf8');
console.log('[sitemap] Static sitemap written to public/sitemap.xml');
