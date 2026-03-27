import express from 'express';
import Chat from '../models/Chat.js';
import { auth } from '../middleware/auth.js';
const router = express.Router();
router.get('/', auth, async (req, res) => {
  res.json(await Chat.find({ users: req.user.id }).sort({ lastMessage: -1 }));
});
router.post('/start', auth, async (req, res) => {
  try {
    const { targetId, adId } = req.body;
    let chat = await Chat.findOne({ users: { $all: [req.user.id, targetId] }, adId });
    if (!chat) chat = await Chat.create({ users: [req.user.id, targetId], adId, messages: [] });
    res.json(chat);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
export default router;
