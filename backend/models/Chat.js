import mongoose from 'mongoose';

const MsgSchema = new mongoose.Schema({
  sender: String,
  text: String,
  type: { type: String, default: 'text' },
  media: String,
  voice: String,
  delivered: Boolean,
  read: Boolean,
  readBy: [String],
  createdAt: { type: Date, default: Date.now },
});

const ChatSchema = new mongoose.Schema({
  users: [String],
  adId: String,
  messages: [MsgSchema],
  lastMessage: Date,
  updatedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) },
});

export default mongoose.models?.Chat || mongoose.model('Chat', ChatSchema);
