import express from 'express';
import Ad from '../models/Ad.js';
import { auth } from '../middleware/auth.js';
const router = express.Router();
router.get('/', async (req, res) => {
  try {
    const country = req.query.country || req.headers['x-user-country'];
    const jobs = await Ad.find({ country, category: 'Jobs', isExpired: { $ne: true }, isDeleted: { $ne: true } }).sort({ createdAt: -1 }).limit(50);
    res.json(jobs);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, city, skills, cvRequired, salary } = req.body;
    const ad = await Ad.create({ userId: req.user.id, seller: req.user.id, title, description, city, country: req.user.country, category: 'Jobs', subcategory: req.body.subcategory || 'General', price: salary, currency: req.body.currency, media: req.body.media });
    res.status(201).json(ad);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
export default router;
