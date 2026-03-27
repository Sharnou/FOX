import mongoose from 'mongoose';

const LocalWordSchema = new mongoose.Schema({
  word: { type: String, required: true },
  meaning: String,
  meaning_ar: String,
  standard: String,
  english: String,
  dialect: { type: String, default: 'Egyptian' },
  country: { type: String, default: 'EG' },
  category: String,
  subcategory: String,
  frequency: { type: Number, default: 1 },
  count: { type: Number, default: 1 },
  aiConfidence: { type: Number, default: 0.8 },
  confidence: { type: Number, default: 0.8 },
  confirmedByAdmin: { type: Boolean, default: false },
  approved: { type: Boolean, default: true },
  aiLearned: { type: Boolean, default: false },
  examples: [String],
  context: [String],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

LocalWordSchema.index({ word: 1, country: 1 }, { unique: true });

export default mongoose.model('LocalWord', LocalWordSchema);
