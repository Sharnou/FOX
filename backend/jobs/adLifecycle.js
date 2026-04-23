import mongoose from 'mongoose';
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

    // Cleanup anonymous ads (no seller/userId) — runs every lifecycle cycle
    await deleteAnonymousAds().catch(e => console.warn('[adLifecycle] deleteAnonymousAds failed:', e.message));
    // FIX BUG2B: Backfill missing seller/userId for existing ads
    await backfillSellerField().catch(e => console.warn('[adLifecycle] backfillSellerField failed:', e.message));

    // TASK 3: Ensure partial index on userId — prevents DB-level anonymous ads
    // DEFINITIVE-v3: Use db.command (runCommand) to drop by KEY SPEC — bypasses name lookup issues.
    // Then create with $type filter. Name changed to idx_userId_hasvalue to avoid conflict.
    try {
      const db = mongoose.connection.db;
      if (db) {
        await db.command({ dropIndexes: 'ads', index: { userId: 1 } });
        console.log('[adLifecycle] Dropped userId index via runCommand');
      }
    } catch (dropErr) {
      // Index may not exist or already dropped — fine
      console.log('[adLifecycle] dropIndex note:', dropErr.message);
    }
    try {
      const db = mongoose.connection.db;
      if (db) {
        await db.collection('ads').createIndex(
          { userId: 1 },
          { partialFilterExpression: { userId: { $type: 'objectId' } }, name: 'idx_userId_hasvalue' }
        );
        console.log('[adLifecycle] Created idx_userId_hasvalue');
      }
    } catch (idxErr) {
      console.warn('[adLifecycle] Index creation note:', idxErr.message);
    }

    // #127 — Drop old conflicting text index (one-time migration)
    // New index 'ads_text_search' includes category, subcategory, city with weights
    try {
      await Ad.collection.dropIndex('title_text_description_text_title_original_text').catch(() => {});
    } catch (_dropErr) { /* index may not exist — safe to ignore */ }

    // 1. Expire active ads past their expiresAt
    const expiredResult = await Ad.updateMany(
      { status: 'active', expiresAt: { $lte: now } },
      {
        $set: {
          status: 'expired',
          isExpired: true,
          expiredAt: now,
          reshareWindowEndsAt: new Date(now.getTime() + RESHARE_WINDOW_DAYS * 24 * 60 * 60 * 1000),
          // Set hardDeleteAt = 37 days from now (7-day reshare window + 30-day reshare active period)
          // Total lifetime: 30 (active) + 7 (expired window) + 30 (reshared) = 67 days
          hardDeleteAt: new Date(now.getTime() + (HARD_DELETE_DAYS - AD_LIFETIME_DAYS) * 24 * 60 * 60 * 1000),
        },
      }
    );

    // 2. Hard-delete ads past their hardDeleteAt OR whose reshare window has closed without reshare
    const toDelete = await Ad.deleteMany({
      $or: [
        // Passed hard-delete deadline (67 days from creation)
        { hardDeleteAt: { $lte: now } },
        // Expired window closed — delete regardless of reshareCount
        // Covers both: never-reshared ads (reshareCount=0) AND reshared-then-expired ads (reshareCount>=1)
        {
          status: 'expired',
          reshareWindowEndsAt: { $lte: now },
        },
        // Also clean up very old expired ads with no reshare window set (legacy)
        {
          status: 'expired',
          reshareWindowEndsAt: null,
          expiredAt: { $lte: new Date(now.getTime() - RESHARE_WINDOW_DAYS * 24 * 60 * 60 * 1000) },
        },
      ],
    });


    // #131 — Unified promotion expiry: Premium OR Featured → 'none' when expired (NO cascade)
    // Premium had 30d; Featured had 14d — both simply expire cleanly with no downgrade
    await Ad.updateMany(
      {
        'promotion.type': { $in: ['premium', 'featured'] },
        'promotion.expiresAt': { $lte: now },
      },
      {
        $set: {
          'promotion.type': 'none',
          'promotion.expiresAt': null,
          'promotion.downgradedToFeatured': false,
        },
      }
    );

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


// ── Delete anonymous ads on startup and as part of lifecycle cleanup ──────────
// Called once from runAdLifecycle() to remove any ads without a valid seller.
async function deleteAnonymousAds() {
  try {
    const Ad = await getAdModel();
    // Use $or with only null/missing checks — no empty string (causes ObjectId cast error)
    const result = await Ad.deleteMany({
      $or: [
        { userId: null, seller: null },
        { userId: { $exists: false }, seller: { $exists: false } },
        { userId: null, seller: { $exists: false } },
        { userId: { $exists: false }, seller: null },
      ]
    });
    if (result.deletedCount > 0) {
      console.log(`[Cleanup] Deleted ${result.deletedCount} anonymous ads`);
    }
    return result.deletedCount;
  } catch (e) {
    console.error('[Cleanup] Failed to delete anonymous ads:', e.message);
    return 0;
  }
}

// Export so server/index.js can call it on startup
export { deleteAnonymousAds };


// ── FIX BUG2B: Backfill missing seller/userId fields ─────────────────────────
// DEFINITIVE-v3: Uses mongoose.connection.db (absolute bottom-most driver level).
// Completely bypasses all Mongoose Collection wrappers to avoid pipeline array errors.
export async function backfillSellerField() {
  console.log('[Cleanup] DEFINITIVE-v3: backfillSellerField start');
  try {
    const db = mongoose.connection.db;
    if (!db) { console.warn('[Cleanup] db not ready, skip backfill'); return; }
    const ads = db.collection('ads');

    const r1 = await ads.updateMany(
      { userId: { $exists: true, $ne: null }, $or: [{ seller: null }, { seller: { $exists: false } }] },
      [{ $set: { seller: '$userId' } }]
    );
    console.log('[Cleanup] backfill userId→seller:', r1.modifiedCount);

    const r2 = await ads.updateMany(
      { seller: { $exists: true, $ne: null }, $or: [{ userId: null }, { userId: { $exists: false } }] },
      [{ $set: { userId: '$seller' } }]
    );
    console.log('[Cleanup] backfill seller→userId:', r2.modifiedCount);
  } catch (err) {
    console.error('[Cleanup] backfillSellerField failed:', err.message);
  }
}

// ── #163 sellerScore Migration: one-time batch compute for users with score=0 ──
// Called from runAdLifecycle() automatically. Processes up to 100 users per run
// so it doesn't block the event loop.
export async function migrateSellerScores() {
  try {
    const { computeSellerScore } = await import('../utils/sellerScore.js');
    const { default: User } = await import('../models/User.js');

    const usersToScore = await User.find({
      $or: [{ sellerScore: 0 }, { sellerScore: null }, { sellerScore: { $exists: false } }],
      isDeleted: { $ne: true },
    }).limit(100).select('_id').lean();

    if (usersToScore.length === 0) return;

    for (const u of usersToScore) {
      await computeSellerScore(u._id).catch(() => {});
    }
    console.log(`[adLifecycle] migrateSellerScores: processed ${usersToScore.length} users`);
  } catch (err) {
    console.warn('[adLifecycle] migrateSellerScores error:', err.message);
  }
}
