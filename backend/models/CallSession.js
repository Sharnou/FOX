import mongoose from 'mongoose';

const callSessionSchema = new mongoose.Schema({
  callerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startedAt: { type: Date, default: Date.now },
  answeredAt: { type: Date, default: null },      // null = never answered
  endedAt: { type: Date, default: null },
  durationSeconds: { type: Number, default: 0 },  // filled on call end
  pointsDeducted: { type: Number, default: 0 },    // total points deducted for this call
  isFirstCall: { type: Boolean, default: false },  // was this the first call between this pair?
}, { timestamps: true });

// Index for fast lookup of pair history
callSessionSchema.index({ callerId: 1, receiverId: 1 });
callSessionSchema.index({ callerId: 1, createdAt: -1 });
callSessionSchema.index({ receiverId: 1, createdAt: -1 });

export default mongoose.model('CallSession', callSessionSchema);
