import mongoose from 'mongoose';
const SubSubSchema = new mongoose.Schema({ name: String, nameAr: String, artUrl: String, warning: String });
const SubSchema = new mongoose.Schema({ name: String, nameAr: String, artUrl: String, warning: String, children: [SubSubSchema] });
const CategorySchema = new mongoose.Schema({
  name: String, nameAr: String, icon: String, artUrl: String,
  order: { type: Number, default: 0 },
  subcategories: [SubSchema],
  createdAt: { type: Date, default: Date.now }
});
export default mongoose.model('Category', CategorySchema);
