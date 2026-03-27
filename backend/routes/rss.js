import express from 'express';
import { generateRSS } from '../server/rss.js';
const router = express.Router();
router.get('/:country', async (req, res) => {
  try {
    const xml = await generateRSS(req.params.country.toUpperCase(), process.env.FRONTEND_URL || 'https://xtox.app');
    res.set('Content-Type', 'application/rss+xml');
    res.send(xml);
  } catch (e) { res.status(500).send('RSS error'); }
});
export default router;
