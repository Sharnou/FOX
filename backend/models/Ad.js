import mongoose from 'mongoose';
const AdSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // alias for userId
  title: String, title_original: String, language: { type: String, default: 'arabic', enum: ['arabic', 'english', 'none', 'ar', 'en'] },
  translations: { en: String, ar: String, de: String, fr: String },
  description: String, category: String, subcategory: { type: String, default: 'Other' }, subsub: { type: String, default: 'Other' }, level4: { type: String, default: null }, subcategory2: String, subcategory3: String,
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
  bubble: { type: Boolean, default: false },
  bubbleUntil: { type: Date, default: null },
  // FIX BUG2: Expanded status enum to include 'sold', 'pending', 'paused', 'suspended', 'removed'
  // This allows PATCH /:id/sold to set status='sold' without ValidationError
  status: {
    type: String,
    enum: ['active', 'expired', 'deleted', 'sold', 'pending', 'paused', 'suspended', 'removed', 'pending_review'],
    default: 'active'
  },
  resharedAt: { type: Date, default: null },
  reshareCount: { type: Number, default: 0 },
  reshareWindowEndsAt: { type: Date, default: null },
  hardDeleteAt: { type: Date, default: null },
  visibilityScore: { type: Number, default: 10 },
  isDuplicate: Boolean, fixedByAI: Boolean, isDeleted: { type: Boolean, default: false }, deletedAt: Date,
  isExpired: { type: Boolean, default: false }, archivedAt: Date,
  expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
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
  // FIX: Removed enum restriction — frontend sends values like 'for_sale', 'for_rent',
  // 'refurbished', 'available', 'open', 'cracked', 'installment', etc.
  condition: {
    type: String,
    default: null
  },
  negotiable: { type: Boolean, default: false },
  // AI quality scoring
  aiQualityScore: { type: Number, default: null },
  aiQualityTips: [String],
  aiGeneratedImage: { type: Boolean, default: false }, // true if main image was AI-generated
  // AI auto-categorization tracking
  categoryAutoClassified: { type: Boolean, default: false },
  classificationProvider: { type: String, default: null },
  // Contact phone number (optional, provided by seller)
  phone: { type: String, default: null },
  whatsapp: { type: String, default: null }, // separate WhatsApp contact
  tags: [String], // searchable tags array
  createdAt: { type: Date, default: Date.now },
  wpPostId: { type: String, default: null },
  wpPostUrl: { type: String, default: null },
  // #123 — Featured/Premium ad promotion tiers
  promotion: {
    type: { type: String, enum: ['none', 'featured', 'premium'], default: 'none' },
    expiresAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    amountUSD: { type: Number, default: 0 },
  },
});

// Compound indexes for fast queries — free performance boost
AdSchema.index({ country: 1, isFeatured: -1, createdAt: -1 }); // homepage feed
AdSchema.index({ country: 1, category: 1, createdAt: -1 });     // category filter
// FIX A: sparse:true ensures docs without valid location are skipped by 2dsphere index
AdSchema.index({ location: '2dsphere' }, { sparse: true });
AdSchema.index({ userId: 1, createdAt: -1 });                    // my-ads page
AdSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });     // TTL auto-expire
// #127 — Enhanced text search index: compound index with weights
// language_override='_textLang' prevents 'language' field from being used as text-index language override
// default_language='none' = no language-specific stemming, works for Arabic
AdSchema.index(
  { title: 'text', description: 'text', category: 'text', subcategory: 'text', city: 'text', title_original: 'text' },
  {
    weights: { title: 10, subcategory: 5, category: 3, city: 2, description: 1, title_original: 8 },
    default_language: 'none',
    language_override: '_textLang',
    name: 'ads_text_search',
  }
); // text search
AdSchema.index({ country: 1, condition: 1, createdAt: -1 });     // condition filter [run 84]
AdSchema.index({ country: 1, subcategory: 1, createdAt: -1 }); // subcategory filter
AdSchema.index({ country: 1, subsub: 1, createdAt: -1 });      // subsub filter


// ── SELLER VALIDATION: Ensure every ad has a valid seller before saving ───────
// Prevents anonymous ads from being created. If one field is set, mirror it to the other.
// Throws if BOTH fields are empty — ad must have an owner.
//
// FIX BUG1: Using pure async style (no `next` parameter) — Mongoose v7+/v9 does NOT
// pass `next` to async hooks. Using `async function(next)` would cause "next is not a
// function" when next() is called. Use `throw` instead of next(err).
AdSchema.pre('save', async function() {
  // Mirror userId ↔ seller if only one is set
  if (!this.userId && this.seller) this.userId = this.seller;
  if (!this.seller && this.userId) this.seller = this.userId;
  // Block save if both are empty
  if (!this.userId && !this.seller) {
    throw new Error('Ad must have a seller — userId and seller cannot both be empty');
  }
});

// FIX C: Pre-validate hook — strip incomplete location before validation runs
// Prevents { type: 'Point' } without coordinates from ever reaching the 2dsphere index.
// NOTE: async function() pattern — Mongoose v7+ does NOT pass `next` to async hooks.
//       Using async + no-next is the only safe pattern in Mongoose v7+/v9.
AdSchema.pre('validate', async function() {
  if (this.location && (!this.location.coordinates || this.location.coordinates.length < 2)) {
    this.location = undefined;
  }
});


  // ── Enrichment tracking (added by AI Ad Enrichment System) ──────────────
  defaultImageAutoSet:   { type: Boolean, default: false },
  conditionAutoDetected: { type: Boolean, default: false },
  enrichedAt:            { type: Date },
  enrichmentVersion:     { type: Number, default: 0 },
// FIX B: Pre-save hook — final safety net to clear invalid location objects
// Catches any path (create, update, republish) that writes without valid coords.
// NOTE: _id is immutable — MongoDB prevents _id modification automatically
AdSchema.pre('save', async function() {
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
});

// #123 — Virtual: promotion priority for sorting (Premium=2 > Featured=1 > none=0)
AdSchema.virtual('promotionPriority').get(function() {
  const now = new Date();
  if (this.promotion?.type === 'premium' && this.promotion?.expiresAt > now) return 2;
  if (this.promotion?.type === 'featured' && this.promotion?.expiresAt > now) return 1;
  return 0;
});

// Index for promotion queries
AdSchema.index({ 'promotion.type': 1, 'promotion.expiresAt': 1 });


// Enrichment system indexes
AdSchema.index({ createdAt: -1, defaultImageAutoSet: 1 });
AdSchema.index({ category: 1, defaultImageAutoSet: 1 });

export default mongoose.model('Ad', AdSchema);
