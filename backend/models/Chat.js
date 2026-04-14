import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:   { type: String, required: true, maxlength: 5000 },
  type:   { type: String, enum: ['text','image','offer','system','voice'], default: 'text' },
  duration: { type: Number, default: 0 },
  read:   { type: Boolean, default: false },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  // ── Read Receipt fields (WhatsApp-style) ─────────────────────
  deliveredTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const ChatSchema = new mongoose.Schema({
  // Participants
  buyer:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  ad:     { type: mongoose.Schema.Types.ObjectId, ref: 'Ad', index: true },

  // Messages — capped at 500 most recent (Subset Pattern)
  // When pushing: use $push + $slice: -500 to prevent 16MB document limit
  // Example: Chat.updateOne({ _id }, { $push: { messages: { $each: [msg], $slice: -500 } }, $inc: { messageCount: 1 } })
  messages: {
    type: [MessageSchema],
    default: [],
  },

  // Total message count (includes archived messages beyond the 500 cap)
  messageCount: { type: Number, default: 0 },

  // Unread counters per role
  unreadBuyer:  { type: Number, default: 0, min: 0 },
  unreadSeller: { type: Number, default: 0, min: 0 },

  // Status
  status: { type: String, enum: ['active', 'archived', 'blocked'], default: 'active' },
  closeAt: { type: Date, default: null, index: true }, // set when ad is sold/deleted; cron job deletes chat after this date

  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now, index: true },

  adTitle:    { type: String, default: '' },
  mutedBy:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  ignoredBy:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  deletedBy:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reportedBy: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String, default: '' },
    at:     { type: Date, default: Date.now }
  }],
});

// Compound index for fast buyer+seller lookup (dedup check)
ChatSchema.index({ buyer: 1, seller: 1, ad: 1 }, { unique: true, sparse: true });

// 30-day TTL index — auto-deletes chat documents 30 days after creation
ChatSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Auto-update updatedAt on save
ChatSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.Chat || mongoose.model('Chat', ChatSchema);
