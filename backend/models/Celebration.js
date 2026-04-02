import mongoose from 'mongoose';
const CelebrationSchema = new mongoose.Schema({
  country: String, name: String, nameAr: String, type: String,
  month: Number, day: Number, date_approx: String, aiGenerated: Boolean,
  year: Number
});
export default mongoose.model('Celebration', CelebrationSchema);
