import mongoose from 'mongoose';

const subcategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  nameAr: { type: String },
  emoji: { type: String, default: '📦' },
  defaultImage: { type: String }, // Cloudinary URL
  accentColor: { type: String, default: '#6366f1' },
  order: { type: Number, default: 0 },
});

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  nameAr: { type: String },
  emoji: { type: String, default: '📂' },
  defaultImage: { type: String },
  accentColor: { type: String, default: '#6366f1' },
  subcategories: [subcategorySchema],
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models?.Category || mongoose.model('Category', categorySchema);
