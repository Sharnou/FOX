import express from 'express';
import Offer from '../models/Offer.js';
import Ad from '../models/Ad.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// POST /api/offers — buyer submits offer on an ad
router.post('/', auth, async (req, res) => {
  try {
    const { adId, amount, message } = req.body;
    if (!adId || !amount || isNaN(amount) || Number(amount) <= 0)
      return res.status(400).json({ error: 'adId and a positive amount are required' });

    const ad = await Ad.findById(adId).populate('userId', '_id name');
    if (!ad) return res.status(404).json({ error: 'Ad not found | الإعلان غير موجود' });

    const sellerId = ad.userId?._id || ad.userId;
    if (String(sellerId) === String(req.user.id))
      return res.status(400).json({ error: 'Cannot offer on your own ad | لا يمكنك تقديم عرض على إعلانك' });

    const offer = await Offer.create({
      ad: adId,
      buyer: req.user.id,
      seller: sellerId,
      amount: Number(amount),
      message: message ? String(message).slice(0, 200) : '',
      status: 'pending'
    });

    // Notify seller via socket if io is available
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${sellerId}`).emit('new_offer', {
        offerId: offer._id,
        adTitle: ad.title,
        amount: offer.amount,
        buyerName: req.user.name || req.user.id
      });
    }

    res.status(201).json(offer);
  } catch (err) {
    console.error('POST /api/offers error:', err);
    res.status(500).json({ error: 'Server error | خطأ في الخادم' });
  }
});

// PATCH /api/offers/:id — seller accepts/rejects/counters
router.patch('/:id', auth, async (req, res) => {
  try {
    const { status, counterAmount } = req.body;
    const validStatuses = ['accepted', 'rejected', 'countered'];
    if (!validStatuses.includes(status))
      return res.status(400).json({ error: 'Invalid status | حالة غير صالحة' });

    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ error: 'Offer not found | العرض غير موجود' });
    if (String(offer.seller) !== String(req.user.id))
      return res.status(403).json({ error: 'Unauthorized | غير مصرح' });

    offer.status = status;
    if (status === 'countered') {
      if (!counterAmount || isNaN(counterAmount) || Number(counterAmount) <= 0)
        return res.status(400).json({ error: 'counterAmount required when countering | السعر المقابل مطلوب' });
      offer.counterAmount = Number(counterAmount);
    }
    await offer.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${offer.buyer}`).emit('offer_update', {
        offerId: offer._id,
        status,
        counterAmount: offer.counterAmount
      });
    }

    res.json(offer);
  } catch (err) {
    console.error('PATCH /api/offers error:', err);
    res.status(500).json({ error: 'Server error | خطأ في الخادم' });
  }
});

// GET /api/offers/my — get offers for current user (as buyer or seller)
router.get('/my', auth, async (req, res) => {
  try {
    const offers = await Offer.find({
      $or: [{ buyer: req.user.id }, { seller: req.user.id }]
    })
      .populate('ad', 'title price currency media')
      .populate('buyer', 'name')
      .populate('seller', 'name')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json(offers);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
