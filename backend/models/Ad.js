import mongoose from 'mongoose';
const AdSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: String, title_original: String, language: String,
  translations: { en: String, ar: String, de: String, fr: String },
  description: String, category: String, subcategory: String, subcategory2: String, subcategory3: String,
  price: Number, currency: String, city: String, country: { type: String, required: true },
  media: [String], images: [String], video: String, videoUrl: { type: String, default: null }, mediaType: { type: String, enum: ['image', 'video', 'mixed'] },
  imageVector: [Number],
  views: { type: Number, default: 0 }, chatCount: { type: Number, default: 0 },
  isFeatured: { type: Boolean, default: false },
  featuredUntil: { type: Date, default: null },
  featuredPlan: { type: String, default: null },
  bumpedAt: { type: Date, default: null },
  featuredStyle: { type: String, enum: ['normal', 'cartoon', 'gold', 'banner'], default: 'normal' },
  featuredAt: { type: Date },
  status: { type: String, default: 'active' },
  visibilityScore: { type: Number, default: 10 },
  isDuplicate: Boolean, fixedByAI: Boolean, isDeleted: { type: Boolean, default: false }, deletedAt: Date,
  isExpired: { type: Boolean, default: false }, archivedAt: Date,
  expiresAt: { type: Date, default: () => new Date(Date.now() + 45 * 24 * 60 * 60 * 1000) },
  expiredAt: Date,
  republishedCount: { type: Number, default: 0 },
  // FIX A: Removed default: 'Point' from nested type field to prevent auto-creation
  // of invalid { type: 'Point' } GeoJSON when no location data is provided.
  location: {
    type: {
      type: String,
      enum: ['Point'],
    },
    coordinates: {
      type: [Number],
      default: undefined,
    },
    placeName: String
  },
  // ── Run 84: Item condition & negotiable price ──────────────────────────────
  condition: {
    type: String,
    enum: ['new', 'used', 'excellent', 'rent'],
    default: null
  },
  negotiable: { type: Boolean, default: false },
  // Contact phone number (optional, provided by seller)
  phone: { type: String, default: null },
  // ──────────────────────────────────────────────────────────────────────────
  createdAt: { type: Date, default: Date.now }
});

// Compound indexes for fast queries — free performance boost
AdSchema.index({ country: 1, isFeatured: -1, createdAt: -1 }); // homepage feed
AdSchema.index({ country: 1, category: 1, createdAt: -1 });     // category filter
// FIX A: sparse:true ensures docs without valid location are skipped by 2dsphere index
AdSchema.index({ location: '2dsphere' }, { sparse: true });
AdSchema.index({ userId: 1, createdAt: -1 });                    // my-ads page
AdSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });     // TTL auto-expire
AdSchema.index({ title: 'text', description: 'text', title_original: 'text' }, { default_language: 'none', weights: { title: 10, description: 5 } }); // text search
AdSchema.index({ country: 1, condition: 1, createdAt: -1 });     // condition filter [run 84]

// FIX C: Pre-validate hook — strip incomplete location before validation runs
// Prevents { type: 'Point' } without coordinates from ever reaching the 2dsphere index.
AdSchema.pre('validate', function(next) {
  if (this.location && (!this.location.coordinates || this.location.coordinates.length < 2)) {
    this.location = undefined;
  }
  next();
});

// FIX B: Pre-save hook — final safety net to clear invalid location objects
// Catches any path (create, update, republish) that writes without valid coords.
AdSchema.pre('save', function(next) {
  if (this.location) {
    const coords = this.location.coordinates;
    if (
      !coords ||
      !Array.isArray(coords) ||
      coords.length < 2 ||
      coords.some(c => c === null || c === undefined || isNaN(c))
    ) {
      this.location = undefined;
    }
  }
  next();
});

export default mongoose.model('Ad', AdSchema);
