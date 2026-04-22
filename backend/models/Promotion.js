import mongoose from 'mongoose';

const promotionSchema = new mongoose.Schema({
  // Core references
  adId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Ad', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Plan details
  plan:         { type: String, enum: ['featured', 'premium'], required: true },
  durationDays: { type: Number, default: 14 }, // 14 for featured, 30 for premium
  amount:       { type: Number, required: true }, // in cents (USD) or local currency
  currency:     { type: String, default: 'USD' },

  // Status lifecycle: pending → confirmed → expired / rejected / refunded
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'active', 'rejected', 'expired', 'refunded', 'cancelled'],
    default: 'pending'
  },

  // Payment method
  paymentMethod: { type: String, enum: ['stripe', 'manual', 'admin_grant'], default: 'stripe' },

  // Stripe fields
  stripeSessionId:       { type: String, index: true, sparse: true },
  stripePaymentIntentId: { type: String, index: true, sparse: true },
  stripeCustomerId:      { type: String },

  // Manual payment receipt (bank transfer, Instapay, Vodafone Cash, etc.)
  receiptUrl:       { type: String }, // Cloudinary secure_url
  receiptPublicId:  { type: String }, // Cloudinary public_id
  receiptNotes:     { type: String }, // seller's description of payment

  // Admin actions
  confirmedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  confirmedAt:      { type: Date },
  rejectedBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectedAt:       { type: Date },
  rejectionReason:  { type: String },
  adminNote:        { type: String },

  // Promotion period
  startDate: { type: Date },
  endDate:   { type: Date },

  // Snapshots at time of request (for audit trail)
  adSnapshot: {
    title:    String,
    price:    Number,
    category: String,
    city:     String,
    image:    String
  },
  sellerSnapshot: {
    name:  String,
    phone: String,
    email: String
  }
}, { timestamps: true });

// Auto-expire: mark as expired when endDate passes
promotionSchema.index({ endDate: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { status: 'active' } });

export default mongoose.models?.Promotion || mongoose.model('Promotion', promotionSchema);
