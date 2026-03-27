import Ad from '../models/Ad.js';
import { createBackup } from './backup.js';

export async function archiveExpiredAds() {
  const result = await Ad.updateMany(
    { expiresAt: { $lt: new Date() }, isExpired: false, isDeleted: false },
    { isExpired: true, archivedAt: new Date() }
  );
  console.log(`[ARCHIVE] Expired ${result.modifiedCount} ads`);
}

export async function deleteOldArchives() {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const result = await Ad.deleteMany({ isExpired: true, archivedAt: { $lt: cutoff } });
  console.log(`[CLEANUP] Deleted ${result.deletedCount} old archived ads`);
}

// Auto backup every 24 hours (called from cron)
export async function autoBackup() {
  try {
    const path = await createBackup();
    console.log(`[BACKUP] Auto-backup saved: ${path}`);
    return path;
  } catch (e) {
    console.error('[BACKUP] Auto-backup failed:', e.message);
  }
}
