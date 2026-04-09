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
    // FIX: Chat schema has buyer/seller fields, NOT a users[] array.
    // Sort by updatedAt (schema field), not lastMessage (doesn't exist).
    const chats = await getChat().find(userInChatQuery(req.user.id))
      .sort({ updatedAt: -1 })
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
    // Log raw body + user at the very top for Railway debugging
    console.log('[CHAT START] body=', JSON.stringify(req.body));
    console.log('[CHAT START] user=', req.user?.id);

    // Accept sellerId OR targetId for compatibility
    const { sellerId, targetId, adId } = req.body;
    const otherId = sellerId || targetId;

    console.log('[CHAT START] userId=', req.user.id, 'otherId=', otherId, 'adId=', adId);

    if (!otherId) {
      return res.status(400).json({
        success: false,
        error: 'sellerId is required',
        message: 'معرّف البائع مطلوب | sellerId is required',
      });
    }

    if (String(req.user.id) === String(otherId)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot chat with yourself',
        message: 'لا يمكنك التواصل مع نفسك | Cannot chat with yourself',
      });
    }

    // Validate ObjectId format for otherId
    if (!mongoose.Types.ObjectId.isValid(otherId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sellerId format',
        message: 'معرّف البائع غير صالح | Invalid sellerId format',
      });
    }

    // Validate adId if provided
    const validAdId = adId && mongoose.Types.ObjectId.isValid(adId) ? adId : null;

    // FIX: Chat schema uses buyer/seller fields (not users[]) and ad (not adId).
    // Search for an existing chat between these two participants in either role.
    const participantQuery = {
      $or: [
        { buyer: req.user.id, seller: otherId },
        { buyer: otherId,    seller: req.user.id },
      ],
    };
    if (validAdId) {
      participantQuery.ad = validAdId;
    }

    console.log('[CHAT START] participants=', { userId: req.user.id, otherId, adId: validAdId });
    console.log('[CHAT START] looking for existing chat');

    let chat = await getChat().findOne(participantQuery);

    if (!chat) {
      console.log('[CHAT START] creating chat');
      // Create with correct schema fields: buyer, seller, ad (not users/adId/lastMessage)
      const createData = {
        buyer:    req.user.id,
        seller:   otherId,
        messages: [],
      };
      if (validAdId) createData.ad = validAdId;

      try {
        chat = await getChat().create(createData);
        console.log('[CHAT START] created chatId=', chat._id);
      } catch (createErr) {
        // E11000: duplicate key — race condition, another request already created the chat
        if (createErr.code === 11000 || (createErr.message && createErr.message.includes('duplicate key'))) {
          console.log('[CHAT START] duplicate key — fetching existing chat');
          chat = await getChat().findOne(participantQuery);
          if (!chat) {
            // Fallback: find without adId
            chat = await getChat().findOne({
              $or: [
                { buyer: req.user.id, seller: otherId },
                { buyer: otherId,    seller: req.user.id },
              ],
            });
          }
          if (!chat) throw createErr; // unexpected — re-throw original
        } else {
          throw createErr;
        }
      }
    } else {
      console.log('[CHAT START] found existing chatId=', chat._id);
    }

    res.json({ success: true, chatId: chat._id, _id: chat._id, chat });
  } catch (e) {
    console.error('[CHAT START] ERROR:', e.message, e.stack);
    res.status(500).json({
      success: false,
      error: e.message,
      message: 'حدث خطأ أثناء إنشاء المحادثة | Error creating chat',
    });
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
    const { text, type = 'text' } = req.body;
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
    console.error('[POST /api/chat/:chatId/messages]', e.message);
    res.status(500).json({ success: false, error: e.message, message: 'حدث خطأ أثناء إرسال الرسالة | Error sending message' });
  }
});

export default router;
