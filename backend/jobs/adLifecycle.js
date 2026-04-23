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
    // This index only covers documents WHERE userId exists and is not null.
    // Runs once-per-lifecycle (createIndex is idempotent).
    // Drop old conflicting index first (it may exist with sparse+partialFilterExpression from an older version)
    // MongoDB cannot mix these options — so we always drop and recreate to fix the existing DB state.
    try {
      await Ad.collection.dropIndex('idx_userId_nonanonymous');
      console.log('[adLifecycle] Dropped old idx_userId_nonanonymous index for recreation');
    } catch (_dropErr) {
      // Index doesn't exist yet, that's fine — proceed to create
    }
    try {
      await Ad.collection.createIndex(
        { userId: 1 },
        {
          partialFilterExpression: { userId: { $type: 'objectId' } },
          name: 'idx_userId_nonanonymous'
        }
      );
      console.log('[adLifecycle] Created idx_userId_nonanonymous partial index');
    } catch (_idxErr) {
      // Non-fatal — log but continue
      console.warn('[adLifecycle] Partial index creation skipped:', _idxErr.message);
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
// Some older ads have userId but no seller (or vice versa). This ensures both
// fields are always in sync so queries using either field find all user ads.
export async function backfillSellerField() {
  try {
    const Ad = await getAdModel();
    // Backfill seller from userId where seller is missing
    const r1 = await Ad.collection.updateMany(
      { userId: { $exists: true, $ne: null }, $or: [{ seller: null }, { seller: { $exists: false } }] },
      [{ $set: { seller: '$userId' } }]
    );
    // Backfill userId from seller where userId is missing
    const r2 = await Ad.collection.updateMany(
      { seller: { $exists: true, $ne: null }, $or: [{ userId: null }, { userId: { $exists: false } }] },
      [{ $set: { userId: '$seller' } }]
    );
    if (r1.modifiedCount > 0 || r2.modifiedCount > 0) {
      console.log(`[Cleanup] Backfilled seller: ${r1.modifiedCount}, userId: ${r2.modifiedCount}`);
    }
    return { seller: r1.modifiedCount, userId: r2.modifiedCount };
  } catch (e) {
    console.error('[Cleanup] backfillSellerField failed:', e.message);
    return { seller: 0, userId: 0 };
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
