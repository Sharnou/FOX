import mongoose from 'mongoose';
const BroadcastSchema = new mongoose.Schema({
  adminId: String, message: String, sentAt: Date, recipientCount: Number
});
export default mongoose.model('Broadcast', BroadcastSchema);
