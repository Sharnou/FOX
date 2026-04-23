import mongoose from 'mongoose';
const { Schema } = mongoose;

const AdViewSchema = new Schema({
  adId: { type: Schema.Types.ObjectId, ref: 'Ad', required: true },
  fingerprint: { type: String, required: true }, // SHA-256 of IP+UA
  userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  viewedAt: { type: Date, default: Date.now }
});

// Unique index: one view per fingerprint per ad per 24h
// We'll handle the 24h window in the route logic (check if exists within 24h)
AdViewSchema.index({ adId: 1, fingerprint: 1 });

export default mongoose.model('AdView', AdViewSchema);
