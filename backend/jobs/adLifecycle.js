// backend/jobs/adLifecycle.js
// Ad lifecycle cron job — Bug #112
// Business rules:
//   - Ad active lifetime: 30 days
//   - On expiry: status = 'expired', reshareWindowEndsAt = now + 7 days
//   - User can reshare once within 7-day window → active for another 30 days
//   - Hard-delete at hardDeleteAt (67 days from createdAt) or when reshare window closes
//   - Total max lifetime: 30 (active) + 7 (expired window) + 30 (reshared active) = 67 days

const AD_LIFETIME_DAYS = 30;
const RESHARE_WINDOW_DAYS = 7;
const HARD_DELETE_DAYS = 67;

async function getAdModel() {
  const { default: Ad } = await import('../models/Ad.js');
  return Ad;
}

export async function runAdLifecycle() {
  try {
    const Ad = await getAdModel();
    const now = new Date();

    // 1. Expire active ads past their expiresAt
    const expiredResult = await Ad.updateMany(
      { status: 'active', expiresAt: { $lte: now } },
      {
        $set: {
          status: 'expired',
          isExpired: true,
          expiredAt: now,
          reshareWindowEndsAt: new Date(now.getTime() + RESHARE_WINDOW_DAYS * 24 * 60 * 60 * 1000),
        },
      }
    );

    // 2. Hard-delete ads past their hardDeleteAt OR whose reshare window has closed without reshare
    const toDelete = await Ad.deleteMany({
      $or: [
        // Passed hard-delete deadline (67 days from creation)
        { hardDeleteAt: { $lte: now } },
        // Expired window closed AND ad was never reshared (reshareCount = 0 or absent)
        {
          status: 'expired',
          reshareWindowEndsAt: { $lte: now },
          reshareCount: { $lt: 1 },
        },
        // Also clean up very old expired ads with no reshare window set (legacy)
        {
          status: 'expired',
          reshareWindowEndsAt: null,
          expiredAt: { $lte: new Date(now.getTime() - RESHARE_WINDOW_DAYS * 24 * 60 * 60 * 1000) },
        },
      ],
    });

    console.log(
      `[adLifecycle] Expired: ${expiredResult.modifiedCount}, Deleted: ${toDelete.deletedCount}`
    );

    return {
      expired: expiredResult.modifiedCount,
      deleted: toDelete.deletedCount,
    };
  } catch (err) {
    console.error('[adLifecycle] Error:', err.message);
    return { expired: 0, deleted: 0, error: err.message };
  }
}
