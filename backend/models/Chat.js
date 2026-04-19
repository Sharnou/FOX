import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  // sender is optional for type='system' messages (null sender = system-generated)
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
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

  // Status — 'closed' = ad sold/deleted, chat is read-only
  status: { type: String, enum: ['active', 'archived', 'blocked', 'closed'], default: 'active' },

  // Legacy closeAt: kept for compatibility (soft-deprecated — use closedAt below)
  closeAt: { type: Date, default: null, index: true },

  // closedAt: set when ad is sold/deleted — TTL index deletes chat 7 days (604800s) after this
  closedAt: { type: Date, default: null },

  // adStatus: mirrors the associated ad's status (5 states)
  // available = active ad | inactive = paused | sold = sold | deleted = removed | expired = TTL-expired
  adStatus: { type: String, enum: ['available', 'inactive', 'sold', 'deleted', 'expired'], default: 'available' },

  createdAt: { type: Date, default: Date.now },
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

// 7-day TTL index on closedAt — auto-deletes chat 7 days after ad is sold/deleted
// partialFilterExpression ensures only docs with a real Date are indexed (null is ignored)
ChatSchema.index(
  { closedAt: 1 },
  { expireAfterSeconds: 604800, partialFilterExpression: { closedAt: { $type: 'date' } } }
);

// Auto-update updatedAt on save
ChatSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.Chat || mongoose.model('Chat', ChatSchema);
