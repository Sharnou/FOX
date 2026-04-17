import express from 'express';
import mongoose from 'mongoose';
import { auth } from '../middleware/auth.js';
import User from '../models/User.js';
import Ad from '../models/Ad.js';

const router = express.Router();

function getWinnerModel() {
  try {
    return mongoose.model('WinnerAnnouncement');
  } catch {
    return mongoose.model('WinnerAnnouncement', new mongoose.Schema({
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      adId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ad' },
      points: Number,
      month: String,
      announcedAt: Date,
      active: { type: Boolean, default: true },
    }), 'winner_announcements');
  }
}

// GET /api/winner/current — returns current or last month's winner
router.get('/current', async (req, res) => {
  try {
    const WinnerAnnouncement = getWinnerModel();
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

    // Try current month first, then last month
    let announcement = await WinnerAnnouncement.findOne({ month: monthKey, active: true })
      || await WinnerAnnouncement.findOne({ month: lastMonthKey, active: true });

    if (!announcement) return res.json({ winner: null });

    const winner = await User.findById(announcement.userId)
      .select('name avatar xtoxId reputationPoints lastMonthPoints _id');
    const ads = await Ad.find({ 
      $or: [{ userId: announcement.userId }, { seller: announcement.userId }],
      status: 'active',
      isDeleted: { $ne: true }
    })
      .sort({ views: -1 })
      .limit(3)
      .select('title price currency images media views _id');

    if (!winner) return res.json({ winner: null });

    res.json({
      winner: {
        ...winner.toObject(),
        ads,
        points: announcement.points,
        month: announcement.month,
      }
    });
  } catch (e) {
    console.error('[Winner] /current error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/winner/rules — public, returns the full rules list
router.get('/rules', (req, res) => {
  res.json({
    rules: [
      { icon: '⭐', ar: 'كل مشاهدة لإعلانك', points: '+1 نقطة' },
      { icon: '🌟', ar: 'تقييم 5 نجوم من مشتري', points: '+10 نقاط' },
      { icon: '💛', ar: 'تقييم 4 نجوم', points: '+7 نقاط' },
      { icon: '✅', ar: 'تقييم 3 نجوم', points: '+3 نقاط' },
      { icon: '🏆', ar: 'الفوز بجائزة بائع الشهر', points: 'إعلان مميز 7 أيام مجاناً' },
      { icon: '🎁', ar: 'مكافأة الفوز الإضافية', points: '+50 نقطة سمعة دائمة' },
      { icon: '🔄', ar: 'تُصفَّر النقاط الشهرية كل أول شهر', points: 'ابدأ من جديد!' },
    ],
    lastUpdated: new Date().toISOString(),
  });
});

// POST /api/winner/congratulate — send congratulations chat to winner
router.post('/congratulate', auth, async (req, res) => {
  try {
    const { winnerId } = req.body;
    const senderId = req.user.id;
    if (!winnerId) return res.status(400).json({ error: 'winnerId required' });
    if (senderId === winnerId) return res.status(400).json({ error: 'Cannot congratulate yourself' });

    // Lazy import Chat to avoid circular deps
    const { default: Chat } = await import('../models/Chat.js');

    // Find or create direct chat between sender (buyer) and winner (seller)
    let chat = await Chat.findOne({
      $or: [
        { buyer: senderId, seller: winnerId, ad: null },
        { buyer: winnerId, seller: senderId, ad: null },
      ]
    });

    const congratsMsg = '🏆 مبروك الفوز بجائزة أفضل بائع هذا الشهر! أنت تستحقها 🎉';

    if (!chat) {
      chat = await Chat.create({
        buyer: senderId,
        seller: winnerId,
        ad: null,
        messages: [{
          sender: senderId,
          text: congratsMsg,
          type: 'text',
          createdAt: new Date(),
        }],
        messageCount: 1,
        unreadSeller: 1,
      });
    } else {
      chat.messages.push({
        sender: senderId,
        text: congratsMsg,
        type: 'text',
        createdAt: new Date(),
      });
      chat.unreadSeller = (chat.unreadSeller || 0) + 1;
      chat.messageCount = (chat.messageCount || 0) + 1;
      await chat.save();
    }

    // Emit via socket if winner is online
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(`user_${winnerId}`).emit('receive_message', {
          chatId: chat._id,
          message: { sender: senderId, text: congratsMsg, type: 'text', createdAt: new Date() },
        });
      }
    } catch {}

    res.json({ ok: true, chatId: chat._id });
  } catch (e) {
    console.error('[Winner] /congratulate error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/winner/leaderboard — top 10 by monthlyPoints ──────────────────
router.get('/leaderboard', async (req, res) => {
  try {
    const { myId } = req.query;

    const top10 = await User.find({ monthlyPoints: { $gt: 0 } })
      .sort({ monthlyPoints: -1, reputationPoints: -1 })
      .limit(10)
      .select('name avatar xtoxId monthlyPoints reputationPoints _id')
      .lean();

    // Compute tier for each user (virtuals not applied on lean())
    function getTier(pts) {
      if (pts >= 500) return 'Platinum';
      if (pts >= 200) return 'Gold';
      if (pts >= 50)  return 'Silver';
      return 'Bronze';
    }
    function getTierBadge(pts) {
      const t = getTier(pts);
      const emojis = { Bronze: '🥉', Silver: '🥈', Gold: '🥇', Platinum: '💎' };
      return `${emojis[t]} ${t}`;
    }

    const leaderboard = top10.map((u, i) => ({
      rank: i + 1,
      userId: u._id,
      name: u.name || 'مستخدم',
      avatar: u.avatar || null,
      xtoxId: u.xtoxId || null,
      monthlyPoints: u.monthlyPoints || 0,
      reputationPoints: u.reputationPoints || 0,
      tier: getTier(u.reputationPoints || 0),
      tierBadge: getTierBadge(u.reputationPoints || 0),
    }));

    // If myId provided and not already in top 10, return their rank too
    let myRank = null;
    if (myId && mongoose.Types.ObjectId.isValid(myId)) {
      const isInTop10 = leaderboard.some(u => u.userId.toString() === myId);
      if (!isInTop10) {
        // Count users with more monthly points
        const rank = await User.countDocuments({ monthlyPoints: { $gt: 0 } });
        const me = await User.findById(myId).select('name avatar xtoxId monthlyPoints reputationPoints').lean();
        if (me) {
          const aboveMe = await User.countDocuments({ monthlyPoints: { $gt: me.monthlyPoints || 0 } });
          myRank = {
            rank: aboveMe + 1,
            userId: me._id,
            name: me.name || 'مستخدم',
            avatar: me.avatar || null,
            xtoxId: me.xtoxId || null,
            monthlyPoints: me.monthlyPoints || 0,
            reputationPoints: me.reputationPoints || 0,
            tier: getTier(me.reputationPoints || 0),
            tierBadge: getTierBadge(me.reputationPoints || 0),
          };
        }
      }
    }

    res.json({ leaderboard, myRank, total: top10.length });
  } catch (e) {
    console.error('[Winner] /leaderboard error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/winner/history — last 6 months of WinnerHistory ───────────────
router.get('/history', async (req, res) => {
  try {
    let WinnerHistory;
    try {
      WinnerHistory = mongoose.model('WinnerHistory');
    } catch {
      const { default: WH } = await import('../models/WinnerHistory.js');
      WinnerHistory = WH;
    }
    const history = await WinnerHistory.find({})
      .sort({ year: -1, month: -1 })
      .limit(6)
      .lean();
    res.json({ history });
  } catch (e) {
    console.error('[Winner] /history error:', e.message);
    res.status(500).json({ error: e.message, history: [] });
  }
});

export default router;
