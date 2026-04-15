import mongoose from 'mongoose';

const { Schema } = mongoose;

const ReviewSchema = new Schema({
  ad:       { type: Schema.Types.ObjectId, ref: 'Ad',   required: true },  // which ad the transaction was for
  seller:   { type: Schema.Types.ObjectId, ref: 'User', required: true },  // seller being rated
  reviewer: { type: Schema.Types.ObjectId, ref: 'User', required: true },  // who is rating
  rating:   { type: Number, min: 1, max: 5, required: true },
  comment:  { type: String, required: true, minlength: 5, maxlength: 500, trim: true },
  adSnapshot: {                                          // frozen snapshot for display
    title:    String,
    price:    Number,
    image:    String,                                    // first image URL
    category: String,
  },
  deletedByAdmin: { type: Boolean, default: false },    // soft-delete by admin only
  createdAt: { type: Date, default: Date.now },
}, { timestamps: false });

// Enforce 1 review per reviewer per ad
ReviewSchema.index({ ad: 1, reviewer: 1 }, { unique: true });

export default mongoose.model('Review', ReviewSchema);
