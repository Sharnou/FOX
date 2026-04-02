import mongoose from 'mongoose';
const CountrySchema = new mongoose.Schema({
  code: { type: String, unique: true }, name: String, nameAr: String,
  currency: String, language: String, flag: String, autoCreated: Boolean,
  createdAt: { type: Date, default: Date.now }
});
export default mongoose.model('Country', CountrySchema);
