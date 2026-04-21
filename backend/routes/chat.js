import express from 'express';
import mongoose from 'mongoose';
import Chat from '../models/Chat.js';
import { auth } from '../middleware/auth.js';
import { MemChat, dbState } from '../server/memoryStore.js';
import { getActiveDB } from '../server/dbManager.js';
import { CouchbaseChat } from '../server/couchbaseModels.js';

// Smart model selector: MongoDB → Couchbase → in-memory
function getChat() {
  const db = getActiveDB();
  if (db === 'mongodb')   return Chat;
  if (db === 'couchbase') return CouchbaseChat;
  return MemChat;
}

const router = express.Router();

/**
 * Helper: build a query that matches chats where the given userId
 * is either the buyer or the seller (Chat schema uses buyer/seller, NOT users[]).
 */
function userInChatQuery(userId) {
  return { $or: [{ buyer: userId }, { seller: userId }] };
}
// ── Ad status mapping (5 states: available / inactive / sold / deleted / expired) ──
function mapAdStatus(chatAdStatus, adAdStatus) {
  const s = chatAdStatus || adAdStatus || 'available';
  if (s === 'active')    return 'available';
  if (s === 'inactive')  return 'inactive';
  if (s === 'sold')      return 'sold';
  if (s === 'deleted')   return 'deleted';
  if (s === 'expired')   return 'expired';
  if (s === 'available') return 'available';
  return 'available';
}

// ── System message helper — pushes a system msg and broadcasts via socket ────
async function sendSystemMsg(chatId, text, io) {
  try {
    const chat = await Chat.findByIdAndUpdate(
      chatId,
      { $push: { messages: { sender: null, text, type: 'system', status: 'delivered' } } },
      { returnDocument: 'after', select: 'buyer seller messages' }
    ).lean();
    if (!chat) return;
    const msg = chat.messages[chat.messages.length - 1];
    if (io) {
      // BUG1 FIX: emit system_message with flat payload (receive_message read data.text not data.message.text)
      io.to('user_' + chat.buyer?.toString()).emit('system_message', { chatId: chat._id, text });
      io.to('user_' + chat.seller?.toString()).emit('system_message', { chatId: chat._id, text });
    }
  } catch (e) {
    console.warn('[CHAT] sendSystemMsg error:', e.message);
  }
}



// ─────────────────────────────────────────────────────────────
// GET /api/chat  — list all chats for the authenticated user
// ─────────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    // Filter out chats where user is in deletedBy
    const chats = await getChat().find({
      ...userInChatQuery(req.user.id),
      deletedBy: { $ne: req.user.id }
    })
      .sort({ updatedAt: -1 })
      // BUG18 FIX: project only last message — avoid loading full messages[] for all chats
      .select({ buyer: 1, seller: 1, ad: 1, adTitle: 1, adStatus: 1, closedAt: 1, status: 1,
                messageCount: 1, unreadBuyer: 1, unreadSeller: 1, updatedAt: 1, createdAt: 1,
                mutedBy: 1, ignoredBy: 1, deletedBy: 1, reportedBy: 1, messages: { $slice: -1 } })
      .populate('buyer',  'name username xtoxId avatar emailVerified whatsappVerified')
      .populate('seller', 'name username xtoxId avatar emailVerified whatsappVerified')
      .populate('ad', 'title images status price')
      .lean();
    // Attach adStatus (5 states) + closedAt per chat for frontend badge
    // ONLY last message preview — NOT the full messages array (avoids sending 500msgs × N chats)
    const enriched = chats.map(c => {
      const msgs = c.messages || [];
      const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
      return {
        _id: c._id,
        buyer:    c.buyer,
        seller:   c.seller,
        ad:       c.ad,
        adTitle:  c.adTitle || (c.ad && c.ad.title) || '',
        adStatus: mapAdStatus(c.adStatus, c.ad?.status),
        closedAt: c.closedAt || null,
        status:   c.status,
        messageCount: c.messageCount || msgs.length,
        unreadBuyer:  c.unreadBuyer  || 0,
        unreadSeller: c.unreadSeller || 0,
        updatedAt: c.updatedAt,
        createdAt: c.createdAt,
        // ONLY last message preview — never the full messages[]
        lastMessage: lastMsg ? {
          _id:       lastMsg._id,
          text:      lastMsg.text || '',
          type:      lastMsg.type || 'text',
          sender:    lastMsg.sender,
          createdAt: lastMsg.createdAt,
          status:    lastMsg.status,
        } : null,
        mutedBy:    c.mutedBy    || [],
        ignoredBy:  c.ignoredBy  || [],
        deletedBy:  c.deletedBy  || [],
        reportedBy: c.reportedBy || [],
      };
    });
    // Backfill adTitle for old chats that are missing it (fire-and-forget)
    const needsBackfill = chats.filter(c => (!c.adTitle || c.adTitle === '') && c.ad?.title);
    if (needsBackfill.length > 0) {
      Promise.all(needsBackfill.map(c =>
        Chat.updateOne({ _id: c._id }, { $set: { adTitle: c.ad.title.slice(0, 60) } })
      )).catch(e => console.warn('[CHAT] adTitle backfill error:', e.message));
    }
    // Return as plain array — frontend handles both shapes: data.chats || Array.isArray(data)
    res.json(enriched);
  } catch (e) {
    res.status(500).json({
      success: false,
      error: e.message,
      message: 'حدث خطأ أثناء جلب المحادثات | Error fetching chats',
    });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/chat/start  — create or resume a chat
// ─────────────────────────────────────────────────────────────
router.post('/start', auth, async (req, res) => {
  try {
    const { sellerId, targetId, adId } = req.body;
    const otherId = sellerId || targetId;

    if (!otherId) {
      return res.status(400).json({ success: false, error: 'sellerId is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(otherId)) {
      return res.status(400).json({ success: false, error: 'Invalid sellerId format' });
    }
    if (!req.user?.id || !mongoose.Types.ObjectId.isValid(req.user.id)) {
      return res.status(401).json({ success: false, error: 'Invalid user token' });
    }
    if (String(req.user.id) === String(otherId)) {
      return res.status(400).json({ success: false, error: 'Cannot chat with yourself' });
    }

    const validAdId = adId && mongoose.Types.ObjectId.isValid(adId) ? adId : null;

    // Verify seller exists in the User collection — prevents anonymous chats
    try {
      const User = (await import('../models/User.js')).default;
      const sellerExists = await User.exists({ _id: otherId });
      if (!sellerExists) {
        return res.status(404).json({ success: false, error: 'البائع غير موجود' });
      }
    } catch (verifyErr) {
      // Non-fatal: if User model fails to load (e.g. memory mode), continue
      console.warn('[Chat/start] Could not verify seller existence:', verifyErr.message);
    }

    // Try to find existing chat first (both buyer/seller orderings)
    let chat = await getChat().findOne({
      $or: [
        { buyer: req.user.id, seller: otherId },
        { buyer: otherId, seller: req.user.id },
      ],
      ...(validAdId ? { ad: validAdId } : {}),
    });

    if (!chat) {
      // Use findOneAndUpdate with upsert for atomic create — avoids E11000 race conditions
      try {
        chat = await getChat().findOneAndUpdate(
          {
            buyer: req.user.id,
            seller: otherId,
            ...(validAdId ? { ad: validAdId } : {}),
          },
          {
            $setOnInsert: {
              buyer: req.user.id,
              seller: otherId,
              messages: [],
              unreadBuyer: 0,
              unreadSeller: 0,
              status: 'active',
              ...(validAdId ? { ad: validAdId } : {}),
            },
          },
          { upsert: true, returnDocument: 'after' }
        );
      } catch (createErr) {
        // Last resort: find any existing chat between these two users
        chat = await getChat().findOne({
          $or: [
            { buyer: req.user.id, seller: otherId },
            { buyer: otherId, seller: req.user.id },
          ],
        });
        if (!chat) throw createErr;
      }
    }

    // Store adTitle if missing
    if (validAdId && (!chat.adTitle || chat.adTitle === '')) {
      try {
        const Ad = (await import('../models/Ad.js')).default;
        const ad = await Ad.findById(validAdId).select('title').lean();
        if (ad?.title) {
          await getChat().findByIdAndUpdate(chat._id, { adTitle: ad.title.slice(0, 60) });
          chat = chat.toObject ? chat.toObject() : { ...chat };
          chat.adTitle = ad.title.slice(0, 60);
        }
      } catch {}
    }

    // C5: For new chats — send system message to seller notifying them
    try {
      const isNewChat = !chat.messages || chat.messages.length === 0;
      if (isNewChat) {
        const buyerName = req.user?.name || req.user?.username || req.user?.xtoxId || 'مستخدم';
        const ioApp = req.app.get('io');
        // Non-blocking — don't await so it doesn't delay response
        sendSystemMsg(chat._id, `💬 ${buyerName} بدأ محادثة معك`, ioApp).catch(() => {});
      }
    } catch (_sysErr) {
      // Non-fatal
    }

    res.json({ success: true, chatId: chat._id, _id: chat._id, chat });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || 'Error creating chat' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/chat/unread-count  — total unread messages across all chats
// Must be defined BEFORE /:chatId routes to avoid route conflicts
// ─────────────────────────────────────────────────────────────
router.get('/unread-count', auth, async (req, res) => {
  try {
    // BUG19 FIX: Use pre-computed unreadBuyer/unreadSeller fields instead of scanning all messages
    const chats = await getChat()
      .find(userInChatQuery(req.user.id))
      .select('buyer unreadBuyer unreadSeller')
      .lean();
    const total = chats.reduce((sum, c) => {
      const isBuyer = String(c.buyer) === String(req.user.id);
      return sum + (isBuyer ? (c.unreadBuyer || 0) : (c.unreadSeller || 0));
    }, 0);
    res.json({ unreadCount: total, count: total });
  } catch (e) {
    res.status(500).json({
      error: e.message,
      message: 'حدث خطأ أثناء حساب الرسائل غير المقروءة | Error counting unread messages',
    });
  }
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/chat/sound-settings — save sound mute preference
// Must be BEFORE /:chatId routes
// ─────────────────────────────────────────────────────────────
router.patch('/sound-settings', auth, async (req, res) => {
  try {
    const { muteSounds } = req.body;
    const User = (await import('../models/User.js')).default;
    await User.findByIdAndUpdate(req.user.id, { muteSounds: !!muteSounds });
    res.json({ success: true, muteSounds: !!muteSounds });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ─────────────────────────────────────────────────────────────
// POST /api/chat/close-by-ad  — called by ad routes when ad status changes
// sold/deleted → closes chat + sets closedAt (7-day TTL)
// expired/inactive → updates adStatus only, chat remains open
// Must be BEFORE /:chatId routes to avoid route conflict
// ─────────────────────────────────────────────────────────────
router.post('/close-by-ad', auth, async (req, res) => {
  try {
    const { adId, adStatus } = req.body;
    if (!adId || !mongoose.Types.ObjectId.isValid(adId)) {
      return res.status(400).json({ error: 'adId required and must be valid' });
    }
    const io = req.app.get('io');
    const mappedStatus = mapAdStatus(adStatus, adStatus);
    // sold + deleted → hard-close chats; expired + inactive → soft update only
    const shouldClose = ['sold', 'deleted'].includes(mappedStatus);

    const chats = await getChat().find({ ad: adId, status: { $ne: 'closed' } })
      .select('_id buyer seller')
      .lean();

    if (chats.length > 0) {
      const updateDoc = shouldClose
        ? { $set: { adStatus: mappedStatus, status: 'closed', closedAt: new Date(), updatedAt: new Date() } }
        : { $set: { adStatus: mappedStatus, updatedAt: new Date() } };
      await getChat().updateMany({ ad: adId, status: { $ne: 'closed' } }, updateDoc);

      if (io) {
        for (const chat of chats) {
          const payload = {
            chatId: chat._id, adId, adStatus: mappedStatus, isClosed: shouldClose,
            closedAt: shouldClose ? new Date() : null,
          };
          io.to('user_' + chat.buyer?.toString()).emit('chat:ad_status', payload);
          io.to('user_' + chat.seller?.toString()).emit('chat:ad_status', payload);
          // Also emit legacy chat:closed for backward compat
          if (shouldClose) {
            io.to('user_' + chat.buyer?.toString()).emit('chat:closed', payload);
            io.to('user_' + chat.seller?.toString()).emit('chat:closed', payload);
          }
        }
      }
    }

    res.json({ success: true, updated: chats.length, closed: shouldClose ? chats.length : 0 });
  } catch (e) {
    console.error('[CHAT] close-by-ad error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/chat/whatsapp-notify — buyer tapped WhatsApp button, notify seller
// Must be BEFORE /:chatId routes to avoid conflict
// ─────────────────────────────────────────────────────────────
router.post('/whatsapp-notify', auth, async (req, res) => {
  try {
    const { chatId, adId } = req.body;
    const io = req.app.get('io');
    const buyerName = req.user?.name || req.user?.username || req.user?.xtoxId || 'مستخدم';

    let targetChatId = chatId;
    // If no chatId, look up by adId + buyer
    if (!targetChatId && adId && mongoose.Types.ObjectId.isValid(adId)) {
      const found = await getChat().findOne({
        ad: adId,
        buyer: req.user.id,
        status: 'active',
      }).select('_id').lean();
      if (found) targetChatId = found._id;
    }

    if (!targetChatId || !mongoose.Types.ObjectId.isValid(String(targetChatId))) {
      return res.status(400).json({ error: 'chatId or adId required' });
    }

    await sendSystemMsg(targetChatId, `📱 ${buyerName} طلب التواصل عبر واتساب`, io);
    res.json({ ok: true });
  } catch (e) {
    console.error('[CHAT] whatsapp-notify error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// POST /api/chat/direct  — start DM with any user (requires rep >= 100)
// Viewer must have reputationPoints >= 100 to message anyone directly
// Must be BEFORE /:chatId routes to avoid route conflict
// ─────────────────────────────────────────────────────────────
router.post('/direct', auth, async (req, res) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ success: false, error: 'targetUserId is required and must be valid' });
    }
    if (String(req.user.id) === String(targetUserId)) {
      return res.status(400).json({ success: false, error: 'Cannot message yourself' });
    }

    // Check viewer reputation
    const User = (await import('../models/User.js')).default;
    const viewer = await User.findById(req.user.id).select('reputationPoints reputation').lean();
    const viewerRep = (viewer?.reputationPoints || viewer?.reputation || 0);
    if (viewerRep < 100) {
      return res.status(403).json({
        success: false,
        error: 'insufficient_reputation',
        message: 'تحتاج 100 نقطة للتواصل المباشر',
        currentRep: viewerRep,
        required: 100,
      });
    }

    // Verify target user exists
    const targetExists = await User.exists({ _id: targetUserId });
    if (!targetExists) {
      return res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
    }

    // Find existing chat between the two (any direction, any ad)
    let chat = await getChat().findOne({
      $or: [
        { buyer: req.user.id, seller: targetUserId },
        { buyer: targetUserId, seller: req.user.id },
      ],
    }).lean();

    if (!chat) {
      // Create new direct message chat
      try {
        const created = await getChat().findOneAndUpdate(
          { buyer: req.user.id, seller: targetUserId, directMessage: true },
          {
            $setOnInsert: {
              buyer: req.user.id,
              seller: targetUserId,
              messages: [],
              unreadBuyer: 0,
              unreadSeller: 0,
              status: 'active',
              directMessage: true,
            },
          },
          { upsert: true, returnDocument: 'after' }
        );
        chat = created?.toObject ? created.toObject() : created;
      } catch (createErr) {
        // Race condition — find existing
        chat = await getChat().findOne({
          $or: [
            { buyer: req.user.id, seller: targetUserId },
            { buyer: targetUserId, seller: req.user.id },
          ],
        }).lean();
        if (!chat) throw createErr;
      }
    }

    res.json({ success: true, chatId: chat._id, _id: chat._id });
  } catch (e) {
    console.error('[CHAT/direct] error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});


// ─────────────────────────────────────────────────────────────
// POST /api/chat/send — quick message from AdCard mini-chat
// Creates or resumes a chat and appends the message in one step
// Must be BEFORE /:chatId routes to avoid route conflict
// ─────────────────────────────────────────────────────────────
router.post('/send', auth, async (req, res) => {
  try {
    const { receiverId: _rid, toUserId, adId, message } = req.body;
    const receiverId = _rid || toUserId;
    if (!receiverId || !message?.trim()) {
      return res.status(400).json({ error: 'receiverId و message مطلوبان' });
    }
    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ error: 'receiverId غير صالح' });
    }
    const senderId = req.user._id || req.user.id;
    if (String(senderId) === String(receiverId)) {
      return res.status(400).json({ error: 'لا يمكنك مراسلة نفسك' });
    }

    // Validate adId if provided
    const validAdId = adId && mongoose.Types.ObjectId.isValid(adId) ? adId : null;

    // Find or create conversation between sender (buyer) and receiver (seller)
    let chat = await getChat().findOne({
      $or: [
        { buyer: senderId, seller: receiverId },
        { buyer: receiverId, seller: senderId }
      ],
      ...(validAdId ? { ad: validAdId } : {})
    });

    if (!chat) {
      // Atomic upsert to avoid race conditions
      try {
        chat = await getChat().findOneAndUpdate(
          {
            buyer: senderId,
            seller: receiverId,
            ...(validAdId ? { ad: validAdId } : {}),
          },
          {
            $setOnInsert: {
              buyer: senderId,
              seller: receiverId,
              messages: [],
              unreadBuyer: 0,
              unreadSeller: 0,
              status: 'active',
              ...(validAdId ? { ad: validAdId } : {}),
            },
          },
          { upsert: true, returnDocument: 'after' }
        );
      } catch (createErr) {
        // Race condition fallback
        chat = await getChat().findOne({
          $or: [
            { buyer: senderId, seller: receiverId },
            { buyer: receiverId, seller: senderId }
          ],
        });
        if (!chat) throw createErr;
      }
    }

    if (chat.status === 'closed') {
      return res.status(403).json({ error: 'المحادثة مغلقة — الإعلان تم بيعه' });
    }

    const newMsg = {
      sender: senderId,
      text: message.trim(),
      type: 'text',
      read: false,
      createdAt: new Date(),
    };

    const isBuyer = String(chat.buyer) === String(senderId);
    const unreadKey = isBuyer ? 'unreadSeller' : 'unreadBuyer';

    await getChat().findOneAndUpdate(
      { _id: chat._id },
      {
        $push: { messages: { $each: [newMsg], $slice: -500 } },
        $set:  { updatedAt: new Date() },
        $inc:  { messageCount: 1, [unreadKey]: 1 },
      }
    );

    // Emit socket notification to receiver if online
    try {
      const io = req.app.get('io');
      if (io) {
        io.to('user_' + String(receiverId)).emit('receive_message', {
          chatId: chat._id,
          message: { ...newMsg, sender: senderId },
        });
      }
    } catch (_) {}

    res.json({ success: true, chatId: chat._id });
  } catch (e) {
    console.error('[Chat/send]', e);
    res.status(500).json({ error: 'فشل إرسال الرسالة' });
  }
});


// ─────────────────────────────────────────────────────────────
// GET /api/chat/history?with=userId&adId=adId
// Returns message history between current user and another user
// Must be BEFORE /:chatId routes
// ─────────────────────────────────────────────────────────────
router.get('/history', auth, async (req, res) => {
  try {
    const { with: withUserId, adId } = req.query;
    if (!withUserId || !mongoose.Types.ObjectId.isValid(withUserId)) {
      return res.status(400).json({ error: 'with param is required and must be valid' });
    }
    const myId = req.user._id || req.user.id;
    const validAdId = adId && mongoose.Types.ObjectId.isValid(adId) ? adId : null;

    // Find the chat between the two users (in either direction), optionally filtered by adId
    const query = {
      $or: [
        { buyer: myId, seller: withUserId },
        { buyer: withUserId, seller: myId },
      ],
      ...(validAdId ? { ad: validAdId } : {}),
    };

    const chat = await getChat()
      .findOne(query)
      .select({ messages: { $slice: -50 } })
      .lean();

    if (!chat) {
      return res.json({ messages: [] });
    }

    // Return messages sorted oldest first (slice -50 already returns newest 50, reverse for chronological)
    const messages = (chat.messages || []).slice().reverse();
    res.json({ messages, chatId: chat._id });
  } catch (e) {
    console.error('[GET /chat/history]', e.message);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// DELETE /api/chat/:chatId — soft delete for current user
// ─────────────────────────────────────────────────────────────
router.delete('/:chatId', auth, async (req, res) => {
  try {
    const { chatId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(chatId)) return res.status(400).json({ success: false, error: 'Invalid chatId' });
    await getChat().findOneAndUpdate(
      { _id: chatId, ...userInChatQuery(req.user.id) },
      { $addToSet: { deletedBy: req.user.id } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ─────────────────────────────────────────────────────────────
// POST /api/chat/:chatId/mute — toggle mute
// ─────────────────────────────────────────────────────────────
router.post('/:chatId/mute', auth, async (req, res) => {
  try {
    const { chatId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(chatId)) return res.status(400).json({ success: false, error: 'Invalid chatId' });
    const chat = await getChat().findOne({ _id: chatId, ...userInChatQuery(req.user.id) });
    if (!chat) return res.status(404).json({ success: false, error: 'Chat not found' });
    const isMuted = chat.mutedBy?.map(id => id.toString()).includes(req.user.id.toString());
    await getChat().findByIdAndUpdate(chatId, isMuted
      ? { $pull: { mutedBy: req.user.id } }
      : { $addToSet: { mutedBy: req.user.id } }
    );
    res.json({ success: true, muted: !isMuted });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ─────────────────────────────────────────────────────────────
// POST /api/chat/:chatId/ignore — toggle ignore
// ─────────────────────────────────────────────────────────────
router.post('/:chatId/ignore', auth, async (req, res) => {
  try {
    const { chatId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(chatId)) return res.status(400).json({ success: false, error: 'Invalid chatId' });
    const chat = await getChat().findOne({ _id: chatId, ...userInChatQuery(req.user.id) });
    if (!chat) return res.status(404).json({ success: false, error: 'Chat not found' });
    const isIgnored = chat.ignoredBy?.map(id => id.toString()).includes(req.user.id.toString());
    await getChat().findByIdAndUpdate(chatId, isIgnored
      ? { $pull: { ignoredBy: req.user.id } }
      : { $addToSet: { ignoredBy: req.user.id } }
    );
    res.json({ success: true, ignored: !isIgnored });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ─────────────────────────────────────────────────────────────
// POST /api/chat/:chatId/report — report chat
// ─────────────────────────────────────────────────────────────
router.post('/:chatId/report', auth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { reason = '' } = req.body;
    if (!mongoose.Types.ObjectId.isValid(chatId)) return res.status(400).json({ success: false, error: 'Invalid chatId' });
    const alreadyReported = await getChat().findOne({ _id: chatId, 'reportedBy.userId': req.user.id });
    if (alreadyReported) return res.json({ success: true, message: 'Already reported' });
    await getChat().findOneAndUpdate(
      { _id: chatId, ...userInChatQuery(req.user.id) },
      { $push: { reportedBy: { userId: req.user.id, reason: reason.slice(0, 200), at: new Date() } } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ─────────────────────────────────────────────────────────────
// GET /api/chat/:chatId/messages  — paginated messages for a chat
// Query params: page (default 1), limit (default 20)
// ─────────────────────────────────────────────────────────────
router.get('/:chatId/messages', auth, async (req, res) => {
  try {
    const { chatId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({
        error: 'Invalid chatId',
        message: 'معرّف المحادثة غير صالح | Invalid chat ID',
      });
    }

    // FIX: query by buyer/seller, not users[]
    const chat = await getChat().findOne({
      _id: chatId,
      ...userInChatQuery(req.user.id),
    }).lean();

    if (!chat) {
      return res.status(404).json({
        error: 'Chat not found',
        message: 'المحادثة غير موجودة أو غير مصرح لك بالوصول إليها | Chat not found or access denied',
      });
    }

    const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const allMessages = chat.messages || [];
    const total = allMessages.length;

    // Return newest-first sliced for the requested page
    const sorted   = [...allMessages].reverse();
    const startIdx = (page - 1) * limit;
    const paged    = sorted.slice(startIdx, startIdx + limit);

    res.json({
      messages: paged,
      adTitle:  chat.adTitle  || '',
      adStatus: chat.adStatus || 'available',
      status:   chat.status   || 'active',
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: startIdx + limit < total,
        hasPrevPage: page > 1,
      },
    });
  } catch (e) {
    res.status(500).json({
      error: e.message,
      message: 'حدث خطأ أثناء جلب الرسائل | Error fetching messages',
    });
  }
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/chat/:chatId/read  — mark all messages as read
// ─────────────────────────────────────────────────────────────
router.patch('/:chatId/read', auth, async (req, res) => {
  try {
    const { chatId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({
        error: 'Invalid chatId',
        message: 'معرّف المحادثة غير صالح | Invalid chat ID',
      });
    }

    const userId = req.user.id.toString();

    // Verify user is a participant
    const chat = await getChat().findOne({
      _id: chatId,
      ...userInChatQuery(userId),
    });
    if (!chat) {
      return res.status(404).json({
        error: 'Chat not found',
        message: 'المحادثة غير موجودة | Chat not found',
      });
    }

    // Count unread messages before update
    const messages = Array.isArray(chat.messages) ? chat.messages : [];
    let markedCount = messages.filter(m =>
      m.sender?.toString() !== userId &&
      !(m.readBy || []).some(id => id?.toString() === userId)
    ).length;

    const db = getActiveDB();
    if (db === 'mongodb' && mongoose.Types.ObjectId.isValid(userId)) {
      // Atomic update: bypasses Mongoose validators (avoids ValidationError on old/voice messages)
      const userOid = new mongoose.Types.ObjectId(userId);
      const unreadKey = String(chat.buyer) === userId ? 'unreadBuyer' : 'unreadSeller';
      await Chat.updateOne(
        { _id: chatId },
        {
          $set: { [unreadKey]: 0, 'messages.$[elem].status': 'read' },
          $addToSet: { 'messages.$[elem].readBy': userOid },
        },
        {
          arrayFilters: [{
            'elem.sender': { $ne: userOid },
            'elem.readBy': { $ne: userOid },
          }]
        }
      );
    } else {
      // In-memory fallback: modify in place then save (skip validation to avoid text:required errors)
      messages.forEach((msg) => {
        const readByList = msg.readBy || [];
        const alreadyRead = readByList.some(id => id?.toString() === userId);
        if (!alreadyRead && msg.sender?.toString() !== userId) {
          msg.readBy = [...readByList, req.user.id];
          msg.status = 'read';
        }
      });
      if (String(chat.buyer) === userId) chat.unreadBuyer = 0;
      else if (String(chat.seller) === userId) chat.unreadSeller = 0;
      if (chat.markModified) chat.markModified('messages');
      await chat.save({ validateBeforeSave: false });
    }

    res.json({
      success: true,
      markedAsRead: markedCount,
      message: `تم تحديد ${markedCount} رسالة كمقروءة | Marked ${markedCount} messages as read`,
    });
  } catch (e) {
    console.error('[PATCH /:chatId/read] error:', e.message);
    res.status(500).json({
      error: e.message,
      message: 'حدث خطأ أثناء تحديث حالة القراءة | Error marking messages as read',
    });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/chat/:chatId/messages/:messageId  — delete a message
// Only the sender can delete their own message
// ─────────────────────────────────────────────────────────────
router.delete('/:chatId/messages/:messageId', auth, async (req, res) => {
  try {
    const { chatId, messageId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(chatId) || !mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({
        error: 'Invalid ID',
        message: 'المعرّف غير صالح | Invalid ID format',
      });
    }

    // FIX: query by buyer/seller, not users[]
    const chat = await getChat().findOne({
      _id: chatId,
      ...userInChatQuery(req.user.id),
    });
    if (!chat) {
      return res.status(404).json({
        error: 'Chat not found',
        message: 'المحادثة غير موجودة | Chat not found',
      });
    }

    const msgIndex = chat.messages.findIndex(
      (m) => m._id?.toString() === messageId
    );

    if (msgIndex === -1) {
      return res.status(404).json({
        error: 'Message not found',
        message: 'الرسالة غير موجودة | Message not found',
      });
    }

    const msg = chat.messages[msgIndex];
    if (msg.sender?.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'لا يمكنك حذف رسالة شخص آخر | You cannot delete another user\'s message',
      });
    }

    chat.messages.splice(msgIndex, 1);
    await chat.save({ validateBeforeSave: false });

    res.json({
      success: true,
      deletedMessageId: messageId,
      message: 'تم حذف الرسالة بنجاح | Message deleted successfully',
    });
  } catch (e) {
    res.status(500).json({
      error: e.message,
      message: 'حدث خطأ أثناء حذف الرسالة | Error deleting message',
    });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/chat/:chatId/messages  — send a message via REST
// ─────────────────────────────────────────────────────────────
router.post('/:chatId/messages', auth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { text, type = 'text', duration = 0 } = req.body;
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ success: false, error: 'Invalid chatId', message: 'معرّف المحادثة غير صالح | Invalid chat ID' });
    }
    if (!text) {
      return res.status(400).json({ success: false, error: 'text is required', message: 'نص الرسالة مطلوب | text is required' });
    }

    // FIX: query by buyer/seller, not users[]
    const chat = await getChat().findOne({
      _id: chatId,
      ...userInChatQuery(req.user.id),
    });
    if (!chat) {
      return res.status(404).json({ success: false, error: 'Chat not found or access denied', message: 'المحادثة غير موجودة | Chat not found' });
    }
    // Block messages in closed chats (ad sold/deleted)
    if (chat.status === 'closed') {
      return res.status(403).json({ success: false, error: 'chat_closed', message: 'هذا الإعلان تم بيعه — المحادثة مغلقة' });
    }
    const message = {
      sender: req.user.id,
      text,
      type,
      duration: type === 'voice' ? (Number(duration) || 0) : 0,
      read: false,
      createdAt: new Date(),
    };
    // BUG3 FIX: Determine recipient's unread counter key
    const isBuyer = String(chat.buyer) === String(req.user.id) || String(chat.buyer?._id) === String(req.user.id);
    const unreadKey = isBuyer ? 'unreadSeller' : 'unreadBuyer';
    // Atomic update: $push + $slice prevents the 16MB document limit
    const updateResult = await getChat().findOneAndUpdate(
      { _id: chat._id },
      {
        $push: { messages: { $each: [message], $slice: -500 } },
        $set:  { updatedAt: new Date() },
        $inc:  { messageCount: 1, [unreadKey]: 1 },
      },
      { returnDocument: 'after', select: { messages: { $slice: -1 } } }
    );
    const savedMessage = updateResult?.messages?.[0] || message;
    res.json({ success: true, message: savedMessage });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message, message: 'حدث خطأ أثناء إرسال الرسالة | Error sending message' });
  }
});


// POST /api/chat/:id/voice — upload voice message to Cloudinary
router.post('/:id/voice', auth, async (req, res) => {
  try {
    const { default: cloudinaryClient } = await import('../server/cloudinary.js');
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', async () => {
      const buf = Buffer.concat(chunks);
      cloudinaryClient.uploader.upload_stream(
        { resource_type: 'video', folder: 'xtox_voice', format: 'webm' },
        (err, result) => {
          if (err) return res.status(500).json({ success: false, error: 'Upload failed' });
          return res.json({ success: true, url: result.secure_url, duration: 0 });
        }
      ).end(buf);
    });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/chat/:chatId/read  — mark all messages as read (REST fallback)
// Mirrors PATCH /:chatId/read but accessible via POST for socket fallback
// ─────────────────────────────────────────────────────────────
router.post('/:chatId/read', auth, async (req, res) => {
  try {
    const { chatId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ error: 'Invalid chatId' });
    }

    const userId = req.user.id.toString();

    // Verify user is a participant
    const chat = await getChat().findOne({ _id: chatId, ...userInChatQuery(userId) });
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    // Count unread messages before update
    const messages = Array.isArray(chat.messages) ? chat.messages : [];
    let markedCount = messages.filter(m =>
      m.sender?.toString() !== userId &&
      !(m.readBy || []).some(id => id?.toString() === userId)
    ).length;

    const db = getActiveDB();
    if (db === 'mongodb' && mongoose.Types.ObjectId.isValid(userId)) {
      // Atomic update: bypasses Mongoose validators (avoids ValidationError on old/voice messages)
      // Root cause of 500: chat.save() ran validators on ALL messages including voice msgs with empty text
      const userOid = new mongoose.Types.ObjectId(userId);
      const unreadKey = String(chat.buyer) === userId ? 'unreadBuyer' : 'unreadSeller';
      await Chat.updateOne(
        { _id: chatId },
        {
          $set: { [unreadKey]: 0, 'messages.$[elem].status': 'read' },
          $addToSet: { 'messages.$[elem].readBy': userOid },
        },
        {
          arrayFilters: [{
            'elem.sender': { $ne: userOid },
            'elem.readBy': { $ne: userOid },
          }]
        }
      );
    } else {
      // In-memory fallback: modify in place then save (skip validation to avoid text:required errors)
      messages.forEach((msg) => {
        const readByList = msg.readBy || [];
        const alreadyRead = readByList.some(id => id?.toString() === userId);
        if (!alreadyRead && msg.sender?.toString() !== userId) {
          msg.readBy = [...readByList, req.user.id];
          msg.status = 'read';
        }
      });
      if (String(chat.buyer) === userId) chat.unreadBuyer = 0;
      else if (String(chat.seller) === userId) chat.unreadSeller = 0;
      if (chat.markModified) chat.markModified('messages');
      await chat.save({ validateBeforeSave: false });
    }

    res.json({ ok: true, success: true, markedAsRead: markedCount });
  } catch (e) {
    console.error('[POST /:chatId/read] error:', e.message);
    res.status(500).json({ error: e.message });
  }
});
export default router;
