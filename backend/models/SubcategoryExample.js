import mongoose from 'mongoose';
const ExampleSchema = new mongoose.Schema({
  category: { type: String, required: true },
  subcategory: { type: String, required: true },
  subsub: { type: String, default: '' },
  examples: [{ type: String }],  // text phrases/keywords that belong to this subcategory
  imageSignatures: [{ type: String }], // visual descriptors e.g. "car door handle", "phone screen cracked"
  lastUpdated: { type: Date, default: Date.now },
  source: { type: String, default: 'seed' } // 'seed' | 'ai' | 'user'
});
ExampleSchema.index({ category: 1, subcategory: 1 });
export default mongoose.model('SubcategoryExample', ExampleSchema);
