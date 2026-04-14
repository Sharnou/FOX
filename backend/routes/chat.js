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
      .populate('buyer', 'name avatar xtoxId whatsappPhone emailVerified whatsappVerified')
      .populate('seller', 'name avatar xtoxId whatsappPhone emailVerified whatsappVerified')
      .populate('ad', 'title images status price')
      .lean();
    res.json({ success: true, chats });
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
          { upsert: true, new: true }
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
    // FIX: use buyer/seller query instead of users[]
    const chats = await getChat().find(userInChatQuery(req.user.id)).lean();
    let total = 0;
    for (const chat of chats) {
      if (Array.isArray(chat.messages)) {
        total += chat.messages.filter(
          (m) =>
            m.sender?.toString() !== req.user.id.toString() &&
            !m.readBy?.map((id) => id.toString()).includes(req.user.id.toString())
        ).length;
      }
    }
    res.json({
      unreadCount: total,
      count: total,
      // مجموع الرسائل غير المقروءة
    });
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

    const userId = req.user.id.toString();
    let markedCount = 0;

    chat.messages = chat.messages.map((msg) => {
      const alreadyRead = msg.readBy?.map((id) => id.toString()).includes(userId);
      if (!alreadyRead && msg.sender?.toString() !== userId) {
        msg.readBy = [...(msg.readBy || []), req.user.id];
        markedCount++;
      }
      return msg;
    });

    // Also reset unread counter for this user
    if (String(chat.buyer) === userId) {
      chat.unreadBuyer = 0;
    } else if (String(chat.seller) === userId) {
      chat.unreadSeller = 0;
    }

    await chat.save();

    res.json({
      success: true,
      markedAsRead: markedCount,
      message: `تم تحديد ${markedCount} رسالة كمقروءة | Marked ${markedCount} messages as read`,
    });
  } catch (e) {
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
    await chat.save();

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
    const message = {
      sender: req.user.id,
      text,
      type,
      duration: type === 'voice' ? (Number(duration) || 0) : 0,
      read: false,
      createdAt: new Date(),
    };
    // Atomic update: $push + $slice prevents the 16MB document limit
    const updateResult = await getChat().findOneAndUpdate(
      { _id: chat._id },
      {
        $push: { messages: { $each: [message], $slice: -500 } },
        $set:  { updatedAt: new Date() },
        $inc:  { messageCount: 1 },
      },
      { new: true, select: { messages: { $slice: -1 } } }
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
    const chat = await getChat().findOne({ _id: chatId, ...userInChatQuery(req.user.id) });
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    const userId = req.user.id.toString();
    let markedCount = 0;

    chat.messages = chat.messages.map((msg) => {
      const alreadyRead = msg.readBy?.map((id) => id.toString()).includes(userId);
      if (!alreadyRead && msg.sender?.toString() !== userId) {
        msg.readBy = [...(msg.readBy || []), req.user.id];
        msg.status = 'read';
        markedCount++;
      }
      return msg;
    });

    if (String(chat.buyer) === userId) {
      chat.unreadBuyer = 0;
    } else if (String(chat.seller) === userId) {
      chat.unreadSeller = 0;
    }

    await chat.save();
    res.json({ ok: true, success: true, markedAsRead: markedCount });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
export default router;
