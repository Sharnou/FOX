import mongoose from 'mongoose';

const contactRevealSchema = new mongoose.Schema({
  viewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['whatsapp', 'phone'], required: true },
  revealedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Unique per viewer+seller+type — only track first reveal of each type
contactRevealSchema.index({ viewerId: 1, sellerId: 1, type: 1 }, { unique: true });

export default mongoose.model('ContactReveal', contactRevealSchema);
