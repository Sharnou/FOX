import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema({
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  adId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ad' },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, maxlength: 500 },
  createdAt: { type: Date, default: Date.now }
});

// One review per buyer per seller
ReviewSchema.index({ sellerId: true, buyerId: true }, { unique: true });

export default mongoose.model('Review', ReviewSchema);
