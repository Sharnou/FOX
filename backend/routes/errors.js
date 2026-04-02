import express from 'express';
import ErrorLog from '../models/ErrorLog.js';

const router = express.Router();

// Any frontend page can report errors here
router.post('/report', async (req, res) => {
  try {
    const { page, message, stack, url, severity } = req.body;
    const userAgent = req.headers['user-agent'];
    const userId = req.body.userId || 'anonymous';
    const country = req.body.country || 'unknown';
    await ErrorLog.create({ page, message, stack, url, severity: severity || 'medium', userId, country, userAgent });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin: get all error logs
router.get('/', async (req, res) => {
  try {
    const errors = await ErrorLog.find().sort({ createdAt: -1 }).limit(100);
    res.json(errors);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin: mark error resolved
router.patch('/:id/resolve', async (req, res) => {
  await ErrorLog.findByIdAndUpdate(req.params.id, { resolved: true });
  res.json({ ok: true });
});

export default router;
