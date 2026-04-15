import mongoose from 'mongoose';
const { Schema } = mongoose;

const WinnerHistorySchema = new Schema({
  userId:         { type: Schema.Types.ObjectId, ref: 'User' },
  name:           String,
  avatar:         String,
  xtoxId:         String,
  monthlyPoints:  Number,
  reputationPoints: Number,
  month:          Number,   // 1-12
  year:           Number,
  prize:          String,   // description of prize
  topAdId:        { type: Schema.Types.ObjectId, ref: 'Ad' },
  runnerUps: [{
    userId: Schema.Types.ObjectId,
    name:   String,
    points: Number,
    place:  Number,          // 2 or 3
  }],
  createdAt: { type: Date, default: Date.now },
});

WinnerHistorySchema.index({ year: -1, month: -1 });

export default mongoose.model('WinnerHistory', WinnerHistorySchema);
