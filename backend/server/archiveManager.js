import Ad from '../models/Ad.js';
import { createBackup } from './backup.js';

// Mark ads as expired after 45 days → start 7-day grace period
export async function archiveExpiredAds() {
  const now = new Date();
  const result = await Ad.updateMany(
    { expiresAt: { $lt: now }, isExpired: { $ne: true }, isDeleted: { $ne: true } },
    { $set: { isExpired: true, expiredAt: now } }
  );
  console.log(`[ARCHIVE] Expired ${result.modifiedCount} ads (7-day reshare grace started)`);
}

// Permanently delete ads that expired 7+ days ago and were NOT reshared
export async function deleteOldArchives() {
  const gracePeriod = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const result = await Ad.deleteMany({
    isExpired: true,
    isDeleted: { $ne: true },
    expiredAt: { $lt: gracePeriod }
  });
  console.log(`[CLEANUP] Permanently deleted ${result.deletedCount} ads (grace period over)`);
}

// Auto backup every 24 hours
export async function autoBackup() {
  try {
    const path = await createBackup();
    console.log(`[BACKUP] Auto-backup saved: ${path}`);
    return path;
  } catch (e) {
    console.error('[BACKUP] Failed:', e.message);
  }
}
