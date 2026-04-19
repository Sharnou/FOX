import mongoose from 'mongoose';

const HonorRollSchema = new mongoose.Schema({
  month: { type: String, required: true }, // 'YYYY-MM'
  year: { type: Number },
  monthName: { type: String }, // e.g. 'أبريل 2026'
  winners: [{
    rank: { type: Number },           // 1, 2, 3
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    username: String,
    avatar: String,
    reputationPoints: Number,
    totalPoints: Number,
    reward: String,         // 'بائع الشهر 🥇'
    rewardDescription: String,
  }],
  announcedAt: { type: Date, default: Date.now },
  announcementSent: { type: Boolean, default: false },
}, { timestamps: true });

HonorRollSchema.index({ month: -1 });

export default mongoose.model('HonorRoll', HonorRollSchema);
