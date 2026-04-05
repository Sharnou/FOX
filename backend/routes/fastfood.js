import express from 'express';
import Ad from '../models/Ad.js';
import { auth } from '../middleware/auth.js';
const router = express.Router();
router.get('/', async (req, res) => {
  const country = req.query.country || req.headers['x-user-country'];
  res.json(await Ad.find({ country, category: 'Fast Food', isExpired: { $ne: true }, isDeleted: { $ne: true } }).sort({ createdAt: -1 }).limit(100));
});
router.post('/', auth, async (req, res) => {
  try {
    const { restaurantName, menuItem, price, deliveryTime, city, media } = req.body;
    const ad = await Ad.create({ userId: req.user.id, title: `${menuItem} — ${restaurantName}`, description: `Delivery: ${deliveryTime} min`, city, country: req.user.country, category: 'Fast Food', subcategory: 'Restaurant', price, media });
    res.status(201).json(ad);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
export default router;
