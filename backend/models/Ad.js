import mongoose from 'mongoose';
const AdSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: String, title_original: String, language: String,
  translations: { en: String, ar: String, de: String, fr: String },
  description: String, category: String, subcategory: String, subcategory2: String, subcategory3: String,
  price: Number, currency: String, city: String, country: { type: String, required: true },
  media: [String], video: String, mediaType: { type: String, enum: ['image', 'video', 'mixed'] },
  imageVector: [Number],
  views: { type: Number, default: 0 }, chatCount: { type: Number, default: 0 },
  isFeatured: { type: Boolean, default: false },
  featuredUntil: { type: Date, default: null },
  featuredPlan: { type: String, default: null },
  bumpedAt: { type: Date, default: null },
  featuredStyle: { type: String, enum: ['normal', 'cartoon'], default: 'normal' },
  featuredAt: { type: Date },
  visibilityScore: { type: Number, default: 100 },
  isDuplicate: Boolean, fixedByAI: Boolean, isDeleted: Boolean, deletedAt: Date,
  isExpired: Boolean, archivedAt: Date,
  expiresAt: { type: Date, default: () => new Date(Date.now() + 45 * 24 * 60 * 60 * 1000) },
  expiredAt: Date,
  republishedCount: { type: Number, default: 0 },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: [Number],
    placeName: String
  },
  createdAt: { type: Date, default: Date.now }
});
export default mongoose.model('Ad', AdSchema);
