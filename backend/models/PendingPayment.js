import mongoose from 'mongoose';

const PendingPaymentSchema = new mongoose.Schema({
  user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true },
  ad:            { type: mongoose.Schema.Types.ObjectId, ref: 'Ad',     required: true },
  planType:      { type: String },
  days:          { type: Number },
  amount:        { type: Number },
  currency:      { type: String, default: 'USD' },
  status:        { type: String, enum: ['pending', 'confirmed', 'rejected', 'expired'], default: 'pending' },
  paymentMethod: { type: String, default: 'vodafone_cash' },
  paymentNumber: { type: String, default: '+201020326953' },
  adminNote:     { type: String },
  confirmedAt:   { type: Date },
  confirmedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  expiresAt:     { type: Date },
}, { timestamps: true });

PendingPaymentSchema.index({ status: 1, createdAt: -1 });
PendingPaymentSchema.index({ user: 1 });

export default mongoose.model('PendingPayment', PendingPaymentSchema);
