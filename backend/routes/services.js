import express from 'express';
import Ad from '../models/Ad.js';
import { auth } from '../middleware/auth.js';
const router = express.Router();
const workerTypes = ['Plumber', 'Electrician', 'Carpenter', 'Cleaner', 'Painter', 'Delivery', 'Gardener', 'Driver'];
router.get('/types', (req, res) => res.json(workerTypes));
router.get('/', async (req, res) => {
  const country = req.query.country || req.headers['x-user-country'];
  const services = await Ad.find({ country, category: 'Services', isExpired: { $ne: true }, isDeleted: false }).sort({ createdAt: -1 }).limit(50);
  res.json(services);
});
router.post('/', auth, async (req, res) => {
  try {
    const { title, workerType, city, price, availability } = req.body;
    const ad = await Ad.create({ userId: req.user.id, title, description: req.body.description, city, country: req.user.country, category: 'Services', subcategory: workerType, price });
    res.status(201).json(ad);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
export default router;
