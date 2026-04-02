import express from 'express';
import Ad from '../models/Ad.js';

const router = express.Router();
const BASE_URL = process.env.FRONTEND_URL || 'https://fox-kohl-eight.vercel.app';

router.get('/sitemap.xml', async (req, res) => {
  try {
    const ads = await Ad.find({ isExpired: false, isDeleted: false }).select('_id updatedAt createdAt').limit(1000);
    const staticPages = ['', '/about', '/privacy', '/terms', '/search', '/nearby'];
    const adUrls = ads.map(ad => `
  <url>
    <loc>${BASE_URL}/ads/${ad._id}</loc>
    <lastmod>${new Date(ad.updatedAt || ad.createdAt).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('');
    const staticUrls = staticPages.map(p => `
  <url>
    <loc>${BASE_URL}${p}</loc>
    <changefreq>daily</changefreq>
    <priority>${p === '' ? '1.0' : '0.6'}</priority>
  </url>`).join('');
    res.set('Content-Type', 'application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls}${adUrls}
</urlset>`);
  } catch (e) { res.status(500).send('Error generating sitemap'); }
});

router.get('/robots.txt', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: ${BASE_URL}/seo/sitemap.xml`);
});

export default router;
