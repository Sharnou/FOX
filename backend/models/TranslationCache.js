import mongoose from 'mongoose';

const translationCacheSchema = new mongoose.Schema({
  lang: { type: String, required: true, unique: true, index: true },
  translations: { type: mongoose.Schema.Types.Mixed, required: true },
  generatedAt: { type: Date, default: Date.now },
  version: { type: Number, default: 1 },
}, { timestamps: true });

export default mongoose.model('TranslationCache', translationCacheSchema);
