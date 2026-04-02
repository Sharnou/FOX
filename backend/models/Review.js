import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  buyerId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  adId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Ad' },
  rating:   { type: Number, min: 1, max: 5, required: true },
  comment:  { type: String, maxlength: 500 },
}, { timestamps: true });

reviewSchema.index({ sellerId: 1, buyerId: 1 }, { unique: true });

export default mongoose.model('Review', reviewSchema);
