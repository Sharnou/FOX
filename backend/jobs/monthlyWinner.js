import cron from 'node-cron';
import mongoose from 'mongoose';
import webpush from 'web-push';

// Lazy imports to avoid circular dependencies at startup
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

    // Find user with highest monthlyPoints (exclude admins)
    const winner = await User.findOne({ monthlyPoints: { $gt: 0 }, role: { $ne: 'admin' } })
      .sort({ monthlyPoints: -1 })
      .select('_id name avatar xtoxId reputationPoints monthlyPoints');

    if (!winner) {
      console.log('[MonthlyWinner] No eligible winner found.');
      // Still reset monthly points
      await User.updateMany({}, [
        { $set: { lastMonthPoints: '$monthlyPoints', monthlyPoints: 0 } }
      ]);
      return;
    }

    // Find winner's most-viewed active ad
    const topAd = await Ad.findOne({ $or: [{ userId: winner._id }, { seller: winner._id }], status: 'active', isDeleted: { $ne: true } })
      .sort({ views: -1 });

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

    // Award 50 bonus points to winner
    await User.findByIdAndUpdate(winner._id, {
      $inc: { reputationPoints: 50 },
      $push: { reputationHistory: { $each: [{ type: 'winner_bonus', points: 50 }], $slice: -500 } },
    });

    // Save winner announcement
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

    // Reset all users' monthlyPoints for new month
    await User.updateMany({}, [
      { $set: { lastMonthPoints: '$monthlyPoints', monthlyPoints: 0 } }
    ]);

    // Send push notification to all users
    const pushSubs = await PushSubscription.find({}).lean();
    const winnerName = winner.name || 'مستخدم XTOX';
    const payload = JSON.stringify({
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
        await webpush.sendNotification(sub.subscription, payload);
        sent++;
      } catch (e) {
        if (e.statusCode === 410) {
          const PushSub = (await getModels()).PushSubscription;
          await PushSub.deleteOne({ _id: sub._id });
        }
      }
    }

    console.log(`[MonthlyWinner] Winner: ${winnerName} (${winner.monthlyPoints} pts). Notification sent to ${sent} users.`);
  } catch (err) {
    console.error('[MonthlyWinner] Error:', err.message);
  }
}

export function initMonthlyWinner() {
  // Run at 23:30 on days 28-31 (self-checks if last day of month)
  cron.schedule('30 23 28-31 * *', runMonthlyWinner, { timezone: 'Africa/Cairo' });
  console.log('[MonthlyWinner] Cron scheduled (23:30 on last day of month, Cairo time).');
}
