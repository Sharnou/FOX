import mongoose from 'mongoose';

const ErrorLogSchema = new mongoose.Schema({
  page: String,
  message: String,
  stack: String,
  userId: String,
  country: String,
  userAgent: String,
  url: String,
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  resolved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('ErrorLog', ErrorLogSchema);
