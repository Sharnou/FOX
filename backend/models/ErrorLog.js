import mongoose from 'mongoose';

const ErrorLogSchema = new mongoose.Schema({
  message: { type: String, required: true },
  stack: String,
  url: String,
  component: String,
  type: { type: String, enum: ['js_error', 'api_error', 'network_error', 'unhandled_rejection'], default: 'js_error' },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  count: { type: Number, default: 1 },
  firstSeen: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now },
  resolved: { type: Boolean, default: false },
  aiAnalysis: String,
  aiFixSuggestion: String,
  aiFixApplied: { type: Boolean, default: false },
  fixPattern: String, // stores the pattern key for auto-learn
  userAgent: String,
}, { timestamps: true });

// Deduplicate by message fingerprint
ErrorLogSchema.index({ message: 1 });

export default mongoose.model('ErrorLog', ErrorLogSchema);
