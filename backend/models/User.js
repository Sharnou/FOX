import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, sparse: true },
    phone: { type: String, unique: true, sparse: true },
    whatsapp: String,
    password: String,
    name: String,
    avatar: String,
    country: { type: String, required: true },
    city: String,
    registrationIp: String,
    fcmToken: String,
    role: { type: String, enum: ['user', 'sub_admin', 'admin'], default: 'user' },
    reputation: { type: Number, default: 50 },
    reports: { type: Number, default: 0 },
    goodActions: { type: Number, default: 0 },
    isBanned: Boolean,
    banExpiresAt: Date,
    isMuted: Boolean,
    isHidden: Boolean,
    canChangeCountry: Boolean,
    adsToday: { type: Number, default: 0 },
    lastAdDate: Date,
    isSimulation: Boolean,
    showPhone: { type: Boolean, default: false },
    showWhatsapp: { type: Boolean, default: false },
    favorites: [String],
    blockedUsers: [String],
    lastSeen: { type: Date, default: null },   // updated on each authenticated request
    lastActive: Date,                           // kept for backward compat
    createdAt: { type: Date, default: Date.now },
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// ── Virtuals ────────────────────────────────────────────────────────────────

/** True when the user was active in the last 5 minutes */
UserSchema.virtual('isOnline').get(function () {
  if (!this.lastSeen) return false;
  return Date.now() - this.lastSeen.getTime() < 5 * 60 * 1000;
});

/**
 * 'online'   — active within the last 5 minutes
 * 'recently' — active within the last 24 hours
 * 'offline'  — more than 24 hours ago (or never seen)
 */
UserSchema.virtual('onlineStatus').get(function () {
  if (!this.lastSeen) return 'offline';
  const diffMs = Date.now() - this.lastSeen.getTime();
  if (diffMs < 5 * 60 * 1000) return 'online';          // < 5 min
  if (diffMs < 24 * 60 * 60 * 1000) return 'recently';  // < 24 h
  return 'offline';
});

/**
 * Human-readable Arabic/English label for onlineStatus.
 * Example: { ar: 'متصل الآن', en: 'Online now' }
 */
UserSchema.virtual('onlineStatusLabel').get(function () {
  const labels = {
    online:   { ar: 'متصل الآن',          en: 'Online now' },
    recently: { ar: 'متصل مؤخراً',        en: 'Recently active' },
    offline:  { ar: 'غير متصل',           en: 'Offline' },
  };
  return labels[this.onlineStatus] || labels.offline;
});

// ── Indexes ─────────────────────────────────────────────────────────────────

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ country: 1 });
UserSchema.index({ lastSeen: -1 });  // supports "online users" queries

export default mongoose.model('User', UserSchema);
