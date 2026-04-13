/**
 * chatCleanup.js — Hourly cron job: permanently delete archived chats past their closeAt date.
 * Like dubizzle: when an ad is sold or deleted, linked chats are scheduled for deletion after 7 days.
 * This job performs the actual hard-delete + Cloudinary media cleanup.
 *
 * Also includes deleteAnonymousChats() — called ONCE on server startup to remove any
 * chats where buyer or seller is null/missing (anonymous chats that should never exist).
 */

import Chat from '../models/Chat.js';

async function runChatCleanup() {
  try {
    const now = new Date();
    const expiredChats = await Chat.find({
      closeAt: { $lte: now },
      status: 'archived',
    }).lean();

    if (expiredChats.length === 0) return;

    let { deleteMedia, CLOUDINARY_ENABLED } = { deleteMedia: null, CLOUDINARY_ENABLED: false };
    try {
      const cld = await import('../server/cloudinary.js');
      deleteMedia = cld.deleteMedia;
      CLOUDINARY_ENABLED = cld.CLOUDINARY_ENABLED;
    } catch (e) {
      console.warn('[ChatCleanup] Could not load Cloudinary module:', e.message);
    }

    let deleted = 0;
    for (const chat of expiredChats) {
      // Delete all Cloudinary media from chat messages (images, voice notes)
      if (CLOUDINARY_ENABLED && deleteMedia) {
        for (const msg of (chat.messages || [])) {
          if (msg.type === 'image' || msg.type === 'voice') {
            const url = msg.text || '';
            const match = url.match(/\/(?:image|video|raw)\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
            if (match && match[1]) {
              const publicId = match[1];
              const resourceType = msg.type === 'voice' ? 'video' : 'image';
              try {
                await deleteMedia(publicId, resourceType);
              } catch (e) {
                console.error('[ChatCleanup] Failed to delete media:', publicId, e.message);
              }
            }
          }
        }
      }
      await Chat.deleteOne({ _id: chat._id });
      deleted++;
    }

    if (deleted > 0) {
      console.log(`[ChatCleanup] Deleted ${deleted} expired chats (closeAt <= ${now.toISOString()})`);
    }

    // Also delete anonymous chats in the hourly run
    await deleteAnonymousChats();
  } catch (err) {
    console.error('[ChatCleanup] Error:', err.message);
  }
}

/**
 * deleteAnonymousChats — removes chats where buyer or seller is null/missing.
 * Called once on server startup AND included in the hourly cleanup cron.
 *
 * Anonymous chats definition: any Chat document where buyer or seller is null,
 * undefined, or the field is entirely absent — meaning the chat was created without
 * a valid authenticated user on either side.
 */
async function deleteAnonymousChats() {
  try {
    const result = await Chat.deleteMany({
      $or: [
        { buyer: null },
        { seller: null },
        { buyer: { $exists: false } },
        { seller: { $exists: false } },
      ],
    });
    if (result.deletedCount > 0) {
      console.log(`[ChatCleanup] Deleted ${result.deletedCount} anonymous chats`);
    }
  } catch (err) {
    console.error('[ChatCleanup] deleteAnonymousChats error:', err.message);
  }
}

export { runChatCleanup, deleteAnonymousChats };
export default runChatCleanup;
