import Broadcast from '../models/Broadcast.js';
import User from '../models/User.js';
import { sendPush } from './push.js';

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function sendWeeklyBroadcast(adminId, message) {
  const last = await Broadcast.findOne({ adminId }).sort({ sentAt: -1 });
  if (last && Date.now() - last.sentAt.getTime() < ONE_WEEK_MS) {
    throw new Error('Broadcast already sent this week. Wait until: ' + new Date(last.sentAt.getTime() + ONE_WEEK_MS).toISOString());
  }

  const users = await User.find({ isBanned: false }, '_id fcmToken');
  const broadcast = await Broadcast.create({ adminId, message, sentAt: new Date(), recipientCount: users.length });

  for (const u of users) {
    if (u.fcmToken) {
      sendPush(u.fcmToken, 'XTOX', message).catch(() => {});
    }
  }

  return broadcast;
}
