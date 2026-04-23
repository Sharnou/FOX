import express from 'express';
import Setting from '../models/Setting.js';

const router = express.Router();

// GET /api/sitemap — public endpoint: returns stored sitemap XML
router.get('/', async (req, res) => {
  try {
    const xml = await Setting.get('sitemap_xml', null);
    if (!xml) return res.status(404).send('Sitemap not found');
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.send(xml);
  } catch (e) {
    console.error('[sitemap] Error:', e.message);
    res.status(500).send('Error fetching sitemap');
  }
});

export default router;
