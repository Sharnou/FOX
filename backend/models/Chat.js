import mongoose from 'mongoose';
const MsgSchema = new mongoose.Schema({ sender: String, text: String, media: String, voice: String, delivered: Boolean, read: Boolean, createdAt: { type: Date, default: Date.now } });
const ChatSchema = new mongoose.Schema({ users: [String], adId: String, messages: [MsgSchema], lastMessage: Date, expiresAt: { type: Date, default: () => new Date(Date.now() + 90*24*60*60*1000) } });
export default mongoose.model('Chat', ChatSchema);
