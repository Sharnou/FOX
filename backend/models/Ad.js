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
  // ── Run 84: Item condition & negotiable price ──────────────────────────────
  // Lets buyers instantly filter "new" vs "used" — essential for Arab OLX-style
  condition: {
    type: String,
    enum: ['new', 'used', 'excellent', 'rent'],
    default: null
  },
  // Sellers can flag price as negotiable (القابل للتفاوض) — very common in Arab markets
  negotiable: { type: Boolean, default: false },
  // ──────────────────────────────────────────────────────────────────────────
  createdAt: { type: Date, default: Date.now }
});

// Compound indexes for fast queries — free performance boost
AdSchema.index({ country: 1, isFeatured: -1, createdAt: -1 }); // homepage feed
AdSchema.index({ country: 1, category: 1, createdAt: -1 });     // category filter
AdSchema.index({ 'location': '2dsphere' });                      // GPS nearby
AdSchema.index({ userId: 1, createdAt: -1 });                    // my-ads page
AdSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });     // TTL auto-expire
AdSchema.index({ title: 'text', description: 'text' });          // text search
AdSchema.index({ country: 1, condition: 1, createdAt: -1 });     // condition filter [run 84]
export default mongoose.model('Ad', AdSchema);
