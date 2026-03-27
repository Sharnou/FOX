import Ad from '../models/Ad.js';
export async function archiveExpiredAds() {
  await Ad.updateMany({ expiresAt: { $lt: new Date() }, isExpired: false }, { isExpired: true, archivedAt: new Date() });
}
export async function deleteOldArchives() {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  await Ad.deleteMany({ isExpired: true, archivedAt: { $lt: cutoff } });
}
