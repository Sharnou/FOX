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
    if (!mongoose.Types.ObjectId.isValid(winnerId)) {
      return res.status(400).json({ error: 'Invalid winnerId format' });
    }
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


// ── GET /api/winner/latest — returns latest HonorRoll entry ───────────────
router.get('/latest', async (req, res) => {
  try {
    let HonorRoll;
    try { HonorRoll = mongoose.model('HonorRoll'); }
    catch { const { default: HR } = await import('../models/HonorRoll.js'); HonorRoll = HR; }

    const latest = await HonorRoll.findOne()
      .sort({ announcedAt: -1 })
      .populate('winners.userId', 'name username avatar xtoxId')
      .lean();

    if (!latest) return res.json(null);

    res.json({
      month: latest.month,
      monthName: latest.monthName,
      announcedAt: latest.announcedAt,
      winners: (latest.winners || []).map(w => ({
        rank: w.rank,
        userId: w.userId?._id || w.userId,
        name: w.userId?.name || w.name,
        username: w.userId?.username || w.username,
        avatar: w.userId?.avatar || w.avatar,
        reputationPoints: w.reputationPoints,
        totalPoints: w.totalPoints,
        reward: w.reward,
        rewardDescription: w.rewardDescription,
      })),
    });
  } catch (e) {
    console.error('[Winner] /latest error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/winner/announce — admin only, manual winner announcement ─────
router.post('/announce', auth, async (req, res) => {
  try {
    // Admin check
    const adminUser = await User.findById(req.user.id).select('role').lean();
    if (!adminUser || !['admin', 'superadmin', 'sub_admin'].includes(adminUser.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { month, monthName, winners } = req.body;
    if (!month || !winners || !Array.isArray(winners)) {
      return res.status(400).json({ error: 'month and winners[] required' });
    }

    let HonorRoll;
    try { HonorRoll = mongoose.model('HonorRoll'); }
    catch { const { default: HR } = await import('../models/HonorRoll.js'); HonorRoll = HR; }

    // Enrich winners with user data
    const enrichedWinners = await Promise.all(winners.map(async (w) => {
      let userData = null;
      if (w.userId && mongoose.Types.ObjectId.isValid(w.userId)) {
        userData = await User.findById(w.userId).select('name username avatar reputationPoints monthlyPoints').lean();
      }
      return {
        rank: w.rank,
        userId: w.userId || null,
        name: userData?.name || w.name || 'مستخدم',
        username: userData?.username || w.username || '',
        avatar: userData?.avatar || w.avatar || '',
        reputationPoints: userData?.monthlyPoints || w.reputationPoints || 0,
        totalPoints: userData?.reputationPoints || w.totalPoints || 0,
        reward: w.reward || (w.rank === 1 ? 'بائع الشهر 🥇' : w.rank === 2 ? 'المركز الثاني 🥈' : 'المركز الثالث 🥉'),
        rewardDescription: w.rewardDescription || (w.rank === 1 ? 'شارة ذهبية + تميّز في نتائج البحث لمدة شهر' : w.rank === 2 ? 'إعلان مميز 3 أيام مجاناً' : 'إعلان مميز يوم مجاناً'),
      };
    }));

    // Save to HonorRoll
    const honorRoll = await HonorRoll.findOneAndUpdate(
      { month },
      { month, monthName: monthName || month, year: parseInt(month.split('-')[0]), winners: enrichedWinners, announcedAt: new Date(), announcementSent: true },
      { upsert: true, returnDocument: 'after' }
    );

    // Broadcast via Socket.IO
    let socketBroadcast = false;
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('winner:announced', {
          month: honorRoll.month,
          monthName: honorRoll.monthName,
          announcedAt: honorRoll.announcedAt,
          winners: enrichedWinners,
        });
        socketBroadcast = true;
      }
    } catch (_e) { console.warn('[Winner] socket broadcast failed:', _e.message); }

    // Send push to all users
    let pushSent = 0;
    try {
      const webpush = (await import('web-push')).default;
      const { default: PushSubscription } = await import('../models/PushSubscription.js');
      const allSubs = await PushSubscription.find({}).lean();
      const top = enrichedWinners.find(w => w.rank === 1);
      const pushPayload = JSON.stringify({
        type: 'winner_announced',
        title: '🏆 إعلان فائزي الشهر!',
        body: top ? `مبروك ${top.name}! اكتشف فائزي هذا الشهر` : 'مبروك للفائزين! اكتشف من فاز بجوائز هذا الشهر',
        month: honorRoll.month,
        url: '/winner-history',
      });
      for (const sub of allSubs) {
        try {
          await webpush.sendNotification(sub.subscription, pushPayload);
          pushSent++;
        } catch (e) {
          if (e.statusCode === 410) await PushSubscription.deleteOne({ _id: sub._id });
        }
        await new Promise(r => setTimeout(r, 10));
      }
    } catch (_pe) { console.warn('[Winner] push broadcast failed:', _pe.message); }

    res.json({ success: true, announced: true, socketBroadcast, pushSent, month: honorRoll.month });
  } catch (e) {
    console.error('[Winner] /announce error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

export default router;
