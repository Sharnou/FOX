import cron from 'node-cron';
import mongoose from 'mongoose';
import webpush from 'web-push';

// Lazy imports to avoid circular dependencies at startup
// Module-level io reference — set by initMonthlyWinner(io)
let _io = null;

async function getModels() {
  const [{ default: User }, { default: Ad }, { default: PushSubscription }] = await Promise.all([
    import('../models/User.js'),
    import('../models/Ad.js'),
    import('../models/PushSubscription.js'),
  ]);
  return { User, Ad, PushSubscription };
}

function getWinnerModel() {
  try {
    return mongoose.model('WinnerAnnouncement');
  } catch {
    return mongoose.model('WinnerAnnouncement', new mongoose.Schema({
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      adId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ad' },
      points: Number,
      month: String, // "2026-04"
      announcedAt: { type: Date, default: Date.now },
      active: { type: Boolean, default: true },
    }), 'winner_announcements');
  }
}

async function getWinnerHistoryModel() {
  try {
    return mongoose.model('WinnerHistory');
  } catch {
    const { default: WinnerHistory } = await import('../models/WinnerHistory.js');
    return WinnerHistory;
  }
}

/** Send push notification to a single user's subscriptions */
async function sendPersonalPush(PushSubscription, userId, payload) {
  try {
    const subs = await PushSubscription.find({ userId: userId.toString() }).lean();
    for (const sub of subs) {
      try {
        await webpush.sendNotification(sub.subscription, payload);
      } catch (e) {
        if (e.statusCode === 410) {
          await PushSubscription.deleteOne({ _id: sub._id });
        }
      }
    }
  } catch (e) {
    console.warn('[MonthlyWinner] sendPersonalPush failed (non-fatal):', e.message);
  }
}

export async function runMonthlyWinner() {
  const now = new Date();
  // Check if today is the last day of the month
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (tomorrow.getMonth() === now.getMonth()) {
    return; // Not the last day of the month
  }

  console.log('[MonthlyWinner] Running monthly winner selection...');

  try {
    const { User, Ad, PushSubscription } = await getModels();

    // ── ELIGIBILITY: monthlyPoints >= 5 ────────────────────────────────────
    const MIN_POINTS = 5;
    const eligibleUsers = await User.find({
      monthlyPoints: { $gte: MIN_POINTS },
      role: { $nin: ['admin', 'superadmin'] },
    })
      .sort({ monthlyPoints: -1, reputationPoints: -1, createdAt: 1 }) // tiebreak
      .limit(10)
      .select('_id name avatar xtoxId reputationPoints monthlyPoints createdAt');

    if (!eligibleUsers.length) {
      console.log('[MonthlyWinner] No user has >= 5 monthly points — no winner this month.');
      // Still reset monthly points
      await User.updateMany({}, [
        { $set: { lastMonthPoints: '$monthlyPoints', monthlyPoints: 0 } }
      ]);
      return;
    }

    const winner   = eligibleUsers[0];
    const second   = eligibleUsers[1] || null;
    const third    = eligibleUsers[2] || null;

    // Find winner's most-viewed active ad
    const topAd = await Ad.findOne({
      $or: [{ userId: winner._id }, { seller: winner._id }],
      isDeleted: { $ne: true },
    }).sort({ views: -1 });

    if (topAd) {
      const featuredUntil = new Date();
      featuredUntil.setDate(featuredUntil.getDate() + 7);
      await Ad.findByIdAndUpdate(topAd._id, {
        isFeatured: true,
        featuredStyle: 'gold',
        featuredPlan: 'winner',
        featuredAt: new Date(),
        featuredUntil,
        visibilityScore: 100,
      });
    }

    // ── 2ND PLACE: 3-day free featured ad ──────────────────────────────────
    if (second) {
      const secondTopAd = await Ad.findOne({
        $or: [{ userId: second._id }, { seller: second._id }],
        isDeleted: { $ne: true },
      }).sort({ views: -1 });
      if (secondTopAd) {
        const until3 = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        await Ad.findByIdAndUpdate(secondTopAd._id, {
          isFeatured: true,
          featuredPlan: 'basic',
          featuredAt: new Date(),
          featuredUntil: until3,
        });
      }
    }

    // ── 3RD PLACE: 1-day free featured ad ──────────────────────────────────
    if (third) {
      const thirdTopAd = await Ad.findOne({
        $or: [{ userId: third._id }, { seller: third._id }],
        isDeleted: { $ne: true },
      }).sort({ views: -1 });
      if (thirdTopAd) {
        const until1 = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
        await Ad.findByIdAndUpdate(thirdTopAd._id, {
          isFeatured: true,
          featuredPlan: 'basic',
          featuredAt: new Date(),
          featuredUntil: until1,
        });
      }
    }

    // Award 50 bonus reputation points to winner
    await User.findByIdAndUpdate(winner._id, {
      $inc: { reputationPoints: 50 },
      $push: {
        reputationHistory: { $each: [{ type: 'winner_bonus', points: 50 }], $slice: -500 },
        pointsHistory: {
          $each: [{ reason: 'فوز بجائزة بائع الشهر +50 نقطة', points: 50, date: new Date() }],
          $slice: -20
        },
      },
    });

    // Save winner announcement (current system)
    const WinnerAnnouncement = getWinnerModel();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    await WinnerAnnouncement.findOneAndUpdate(
      { month: monthKey },
      {
        userId: winner._id,
        adId: topAd?._id || null,
        points: winner.monthlyPoints,
        announcedAt: new Date(),
        active: true,
      },
      { upsert: true }
    );

    // ── SAVE TO WINNER HISTORY ──────────────────────────────────────────────
    try {
      const WinnerHistory = await getWinnerHistoryModel();
      const runnerUps = [];
      if (second) runnerUps.push({ userId: second._id, name: second.name, points: second.monthlyPoints, place: 2 });
      if (third)  runnerUps.push({ userId: third._id,  name: third.name,  points: third.monthlyPoints,  place: 3 });
      await WinnerHistory.create({
        userId:           winner._id,
        name:             winner.name,
        avatar:           winner.avatar,
        xtoxId:           winner.xtoxId,
        monthlyPoints:    winner.monthlyPoints,
        reputationPoints: winner.reputationPoints,
        month:            now.getMonth() + 1,
        year:             now.getFullYear(),
        prize:            'إعلان مميز ذهبي مجاني لمدة 7 أيام + 50 نقطة سمعة',
        topAdId:          topAd?._id || null,
        runnerUps,
      });
    } catch (_histErr) {
      console.warn('[MonthlyWinner] WinnerHistory save failed (non-fatal):', _histErr.message);
    }

    // ── SAVE TO HONOR ROLL ──────────────────────────────────────────────────
    try {
      let HonorRoll;
      try { HonorRoll = mongoose.model('HonorRoll'); }
      catch { const { default: HR } = await import('../models/HonorRoll.js'); HonorRoll = HR; }

      const ARABIC_MONTHS = {
        '01':'يناير','02':'فبراير','03':'مارس','04':'أبريل',
        '05':'مايو','06':'يونيو','07':'يوليو','08':'أغسطس',
        '09':'سبتمبر','10':'أكتوبر','11':'نوفمبر','12':'ديسمبر',
      };
      const moStr = String(now.getMonth() + 1).padStart(2, '0');
      const monthName = `${ARABIC_MONTHS[moStr] || moStr} ${now.getFullYear()}`;

      const hrWinners = [
        { rank: 1, userId: winner._id, name: winner.name, avatar: winner.avatar, reputationPoints: winner.monthlyPoints, totalPoints: winner.reputationPoints + 50, reward: 'بائع الشهر 🥇', rewardDescription: 'إعلان مميز ذهبي 7 أيام + 50 نقطة سمعة' },
      ];
      if (second) hrWinners.push({ rank: 2, userId: second._id, name: second.name, avatar: second.avatar, reputationPoints: second.monthlyPoints, totalPoints: second.reputationPoints, reward: 'المركز الثاني 🥈', rewardDescription: 'إعلان مميز 3 أيام مجاناً' });
      if (third)  hrWinners.push({ rank: 3, userId: third._id,  name: third.name,  avatar: third.avatar,  reputationPoints: third.monthlyPoints,  totalPoints: third.reputationPoints,  reward: 'المركز الثالث 🥉', rewardDescription: 'إعلان مميز يوم مجاناً' });

      await HonorRoll.findOneAndUpdate(
        { month: monthKey },
        { month: monthKey, monthName, year: now.getFullYear(), winners: hrWinners, announcedAt: new Date(), announcementSent: true },
        { upsert: true }
      );

      // ── Broadcast socket event to all connected clients ─────────────────
      if (_io) {
        _io.emit('winner:announced', {
          month: monthKey,
          monthName,
          announcedAt: new Date().toISOString(),
          winners: hrWinners,
        });
        console.log('[MonthlyWinner] socket winner:announced emitted to all clients.');
      }
    } catch (_hrErr) {
      console.warn('[MonthlyWinner] HonorRoll save/broadcast failed (non-fatal):', _hrErr.message);
    }

    // Reset all users' monthlyPoints for new month
    await User.updateMany({}, [
      { $set: { lastMonthPoints: '$monthlyPoints', monthlyPoints: 0 } }
    ]);

    // ── BROADCAST push notification to all users ────────────────────────────
    const pushSubs = await PushSubscription.find({}).lean();
    const winnerName = winner.name || 'مستخدم XTOX';
    const broadcastPayload = JSON.stringify({
      type: 'monthly_winner',
      title: `🏆 مبروك ${winnerName}!`,
      body: `فاز بجائزة أفضل بائع هذا الشهر بـ ${winner.monthlyPoints} نقطة! اضغط لإرسال التهنئة`,
      winnerId: winner._id.toString(),
      winnerName,
      winnerAvatar: winner.avatar || '',
      url: `/winner`,
    });

    let sent = 0;
    for (const sub of pushSubs) {
      try {
        await webpush.sendNotification(sub.subscription, broadcastPayload);
        sent++;
      } catch (e) {
        if (e.statusCode === 410) {
          const PushSub = (await getModels()).PushSubscription;
          await PushSub.deleteOne({ _id: sub._id });
        }
      }
    }

    // ── PERSONAL PUSH to winner ─────────────────────────────────────────────
    await sendPersonalPush(PushSubscription, winner._id, JSON.stringify({
      type: 'winner_personal',
      title: '🏆 أنت الفائز هذا الشهر!',
      body: '🎉 أنت الفائز لهذا الشهر! حصلت على إعلان مميز مجاني لمدة 7 أيام + 50 نقطة سمعة',
      url: '/winner',
    }));

    // ── PERSONAL PUSH to 2nd place ──────────────────────────────────────────
    if (second) {
      await sendPersonalPush(PushSubscription, second._id, JSON.stringify({
        type: 'runner_up',
        title: '🥈 المركز الثاني هذا الشهر!',
        body: 'تهانينا! حصلت على إعلان مميز مجاني لمدة 3 أيام',
        url: '/winner',
      }));
    }

    // ── PERSONAL PUSH to 3rd place ──────────────────────────────────────────
    if (third) {
      await sendPersonalPush(PushSubscription, third._id, JSON.stringify({
        type: 'runner_up',
        title: '🥉 المركز الثالث هذا الشهر!',
        body: 'تهانينا! حصلت على إعلان مميز مجاني لمدة يوم كامل',
        url: '/winner',
      }));
    }

    console.log(`[MonthlyWinner] Winner: ${winnerName} (${winner.monthlyPoints} pts). Sent to ${sent} users.`);
    if (second) console.log(`[MonthlyWinner] 2nd: ${second.name} (${second.monthlyPoints} pts)`);
    if (third)  console.log(`[MonthlyWinner] 3rd: ${third.name}  (${third.monthlyPoints} pts)`);
  } catch (err) {
    console.error('[MonthlyWinner] Error:', err.message);
  }
}

export async function broadcastWinnerRules() {
  console.log('[WinnerRules] Broadcasting bi-weekly rules update...');

  const rules = [
    '⭐ كل مشاهدة لإعلانك = +1 نقطة سمعة',
    '🌟 تقييم 5 نجوم = +10 نقاط',
    '💛 تقييم 4 نجوم = +7 نقاط',
    '✅ تقييم 3 نجوم = +3 نقاط',
    '🏆 الفائز بنهاية الشهر يحصل على إعلان مميز مجاني 7 أيام!',
    '🥈 المركز الثاني: إعلان مميز 3 أيام مجاناً',
    '🥉 المركز الثالث: إعلان مميز يوم مجاناً',
    '🎉 سيتم إعلام جميع المستخدمين بالفائز وإشعارهم تلقائياً',
    '💬 يمكن لأي مستخدم إرسال تهنئة مباشرة للفائز',
    '🔄 تُعاد النقاط الشهرية كل أول الشهر — ابدأ من جديد!',
    '📋 الحد الأدنى للمشاركة: 5 نقاط شهرية',
  ];

  const payload = JSON.stringify({
    type: 'winner_rules_update',
    title: '🏆 قواعد بائع الشهر — تذكير',
    body: 'كل مشاهدة لإعلانك = نقطة! الفائز يحصل على إعلان مميز مجاني 7 أيام 🎁',
    rules,
    url: '/',
    timestamp: new Date().toISOString(),
  });

  const { PushSubscription } = await getModels();
  const pushSubs = await PushSubscription.find({});
  let sent = 0;
  for (const sub of pushSubs) {
    try {
      await webpush.sendNotification(sub.subscription, payload);
      sent++;
    } catch (e) {
      if (e.statusCode === 410) await PushSubscription.deleteOne({ _id: sub._id });
    }
  }
  console.log(`[WinnerRules] Sent to ${sent} users.`);
}

export function initMonthlyWinner(io) {
  if (io) _io = io;
  // Run at 23:30 on days 28-31 (self-checks if last day of month)
  cron.schedule('30 23 28-31 * *', runMonthlyWinner, { timezone: 'Africa/Cairo' });
  // Bi-weekly rules reminder: 1st and 15th of every month at 10:00 Cairo
  cron.schedule('0 10 1,15 * *', broadcastWinnerRules, { timezone: 'Africa/Cairo' });
  console.log('[MonthlyWinner] Cron scheduled (23:30 on last day of month, Cairo time).');
  console.log('[WinnerRules] Bi-weekly cron scheduled (1st & 15th at 10:00 Cairo).');
}
