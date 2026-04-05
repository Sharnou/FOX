import express from 'express';
import Ad from '../models/Ad.js';

const router = express.Router();

// GET ads near a GPS coordinate (within radius km)
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 20, country } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });

    const ads = await Ad.find({
      country,
      isExpired: { $ne: true },
      isDeleted: { $ne: true },
      visibilityScore: { $gt: 0 },
      'location.coordinates': { $exists: true }
    }).limit(50);

    const R = 6371;
    const nearby = ads
      .map(ad => {
        if (!ad.location?.coordinates) return null;
        const [adLng, adLat] = ad.location.coordinates;
        const dLat = (adLat - parseFloat(lat)) * Math.PI / 180;
        const dLng = (adLng - parseFloat(lng)) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 + Math.cos(parseFloat(lat)*Math.PI/180) * Math.cos(adLat*Math.PI/180) * Math.sin(dLng/2)**2;
        const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return { ...ad.toObject(), distance: Math.round(distance * 10) / 10 };
      })
      .filter(a => a && a.distance <= parseFloat(radius))
      .sort((a, b) => a.distance - b.distance);

    res.json(nearby);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST tag location on an ad
router.post('/tag-location', async (req, res) => {
  try {
    const { adId, lat, lng, placeName } = req.body;
    await Ad.findByIdAndUpdate(adId, {
      location: {
        type: 'Point',
        coordinates: [parseFloat(lng), parseFloat(lat)],
        placeName: placeName || ''
      }
    });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET app share info for QR/link generation
router.get('/app-share', (req, res) => {
  const { lat, lng, zone } = req.query;
  const appUrl = process.env.FRONTEND_URL || 'https://fox-kohl-eight.vercel.app';
  const shareUrl = `${appUrl}?ref=geo&lat=${lat}&lng=${lng}&zone=${zone || ''}`;
  res.json({
    appUrl,
    shareUrl,
    qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareUrl)}`,
    shareText: `🛒 اكتشف XTOX — السوق المحلي الذكي في منطقتك!\n${shareUrl}`,
    whatsappUrl: `https://wa.me/?text=${encodeURIComponent(`🛒 XTOX - السوق المحلي الذكي\nإعلانات قريبة منك في ${zone || 'منطقتك'}\n${shareUrl}`)}`
  });
});

export default router;
