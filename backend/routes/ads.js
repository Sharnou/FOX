import express from 'express';
import Ad from '../models/Ad.js';
import { auth } from '../middleware/auth.js';
import { moderateText } from '../server/moderation.js';
import { checkDuplicate } from '../server/duplicateDetector.js';
import { rankAd } from '../server/ranking.js';
import { indexAd } from '../server/search.js';
import { buildAdFromMedia } from '../server/ai.js';
import { detectCategoryOffline } from '../server/offlineDict.js';
import { generateQR } from '../server/qr.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { category, city, page = 0 } = req.query;
    const country = req.query.country || req.headers['x-user-country'];
    if (!country) return res.status(400).json({ error: 'Country required' });
    const filter = { country, isExpired: false, isDeleted: false, visibilityScore: { $gt: 0 } };
    if (category) filter.category = category;
    if (city) filter.city = city;
    const ads = await Ad.find(filter).sort({ isFeatured: -1, createdAt: -1 }).skip(page * 20).limit(20);
    res.json(ads);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const ad = await Ad.findById(req.params.id).populate('userId', 'name avatar lastActive');
    if (!ad) return res.status(404).json({ error: 'Not found' });
    ad.views++; await ad.save();
    await rankAd(ad);
    const qr = await generateQR(`${process.env.FRONTEND_URL}/ads/${ad._id}`);
    res.json({ ...ad.toObject(), qrCode: qr });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { title, description, category, price, city, currency, media, video, featuredStyle } = req.body;
    const country = req.user.country;
    const check = moderateText(`${title} ${description}`);
    if (!check.clean) return res.status(400).json({ error: `Policy violation: ${check.reason}` });
    if (await checkDuplicate(title, category, city, req.user.id)) return res.status(400).json({ error: 'Duplicate ad' });
    const detectedCat = detectCategoryOffline(`${title} ${description}`);
    const finalCat = category || detectedCat.main;
    const ad = await Ad.create({ userId: req.user.id, title, title_original: title, description, category: finalCat, price, city, currency, media, video, country, featuredStyle: featuredStyle || 'normal', language: /[\u0600-\u06FF]/.test(title) ? 'ar' : 'en' });
    await rankAd(ad);
    await indexAd(ad).catch(() => {});
    res.status(201).json(ad);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai-generate', auth, async (req, res) => {
  try {
    const result = await buildAdFromMedia(req.body);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const ad = await Ad.findOne({ _id: req.params.id, userId: req.user.id });
    if (!ad) return res.status(404).json({ error: 'Not found' });
    ad.isDeleted = true; ad.deletedAt = new Date(); await ad.save();
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
