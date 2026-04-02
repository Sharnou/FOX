import express from 'express';
import mongoose from 'mongoose';
import Chat from '../models/Chat.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// GET /api/chat  — list all chats for the authenticated user
// ─────────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const chats = await Chat.find({ users: req.user.id })
      .sort({ lastMessage: -1 })
      .lean();
    res.json(chats);
  } catch (e) {
    res.status(500).json({
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
    const { targetId, adId } = req.body;
    if (!targetId) {
      return res.status(400).json({
        error: 'targetId is required',
        message: 'معرّف المستخدم المستهدف مطلوب | targetId is required',
      });
    }
    let chat = await Chat.findOne({
      users: { $all: [req.user.id, targetId] },
      adId,
    });
    if (!chat) {
      chat = await Chat.create({
        users: [req.user.id, targetId],
        adId,
        messages: [],
      });
    }
    res.json(chat);
  } catch (e) {
    res.status(500).json({
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
    const chats = await Chat.find({ users: req.user.id }).lean();
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

    const chat = await Chat.findOne({
      _id: chatId,
      users: req.user.id,
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

    const chat = await Chat.findOne({ _id: chatId, users: req.user.id });
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

    const chat = await Chat.findOne({ _id: chatId, users: req.user.id });
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

export default router;
