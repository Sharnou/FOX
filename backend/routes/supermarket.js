import express from 'express';
import Ad from '../models/Ad.js';
import { auth } from '../middleware/auth.js';
const router = express.Router();
router.get('/', async (req, res) => {
  const country = req.query.country || req.headers['x-user-country'];
  res.json(await Ad.find({ country, category: 'Supermarket', isExpired: false, isDeleted: false }).sort({ createdAt: -1 }).limit(100));
});
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, price, quantity, unit, city, media } = req.body;
    const ad = await Ad.create({ userId: req.user.id, title, description: `${description} | Qty: ${quantity} ${unit || ''}`, city, country: req.user.country, category: 'Supermarket', subcategory: req.body.subcategory || 'Groceries', price, media });
    res.status(201).json(ad);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
export default router;
