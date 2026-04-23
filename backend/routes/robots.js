import express from 'express';
import Setting from '../models/Setting.js';

const router = express.Router();

// GET /api/robots — public: returns stored robots.txt
router.get('/', async (req, res) => {
  try {
    const s = await Setting.findOne({ key: 'robots_txt' });
    if (!s || !s.value) return res.status(404).send('Not found');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(s.value);
  } catch (e) {
    console.error('[robots] Error:', e.message);
    res.status(500).send('Error');
  }
});

export default router;
