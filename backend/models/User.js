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
    chatEnabled: { type: Boolean, default: true },   // allow buyers to message seller directly
    favorites: [String],
    blockedUsers: [String],
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Ad' }],
    // Capped at 50 most recent — use $push + $slice: -50 on every insert
    // Example: User.updateOne({ _id }, { $push: { notifications: { $each: [n], $slice: -50 } }, $inc: { notificationCount: 1 } })
    notifications: [{
      _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
      type: { type: String, enum: ['chat', 'ad', 'system', 'review', 'featured', 'broadcast'], default: 'system' },
      title: String,
      body: String,
      link: String,
      read: { type: Boolean, default: false },
  
    // -- Auth provider -------------------------------------------------------
    authProvider: { type: String, enum: ['email', 'google', 'apple', 'whatsapp'], default: 'email' },
    googleId: { type: String, sparse: true, unique: true },
    appleId: { type: String, sparse: true, unique: true },
    whatsappPhone: { type: String, sparse: true, unique: true },

    // -- XTOX identity -------------------------------------------------------
    xtoxId: { type: String, unique: true, sparse: true },
    xtoxEmail: { type: String, unique: true, sparse: true },

    // -- Blocking (real identifiers so they can never re-register) -----------
    blocked: { type: Boolean, default: false },
    blockedAt: { type: Date },
    blockReason: { type: String },
    blockedGoogleId: { type: String, sparse: true },
    blockedAppleId: { type: String, sparse: true },
    blockedPhone: { type: String, sparse: true },

    // -- WhatsApp OTP --------------------------------------------------------
    whatsappOtp: { type: String },
    whatsappOtpExpiry: { type: Date },
    whatsappOtpAttempts: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    }],
    username: { type: String, sparse: true },
    bio: { type: String, maxlength: 500 },
    lastSeen: { type: Date, default: null },   // updated on each authenticated request
    lastActive: Date,                           // kept for backward compat

    // -- Auth provider -------------------------------------------------------
    authProvider: { type: String, enum: ['email', 'google', 'apple', 'whatsapp'], default: 'email' },
    googleId: { type: String, sparse: true, unique: true },
    appleId: { type: String, sparse: true, unique: true },
    whatsappPhone: { type: String, sparse: true, unique: true },

    // -- XTOX identity -------------------------------------------------------
    xtoxId: { type: String, unique: true, sparse: true },
    xtoxEmail: { type: String, unique: true, sparse: true },

    // -- Blocking (real identifiers so they can never re-register) -----------
    blocked: { type: Boolean, default: false },
    blockedAt: { type: Date },
    blockReason: { type: String },
    blockedGoogleId: { type: String, sparse: true },
    blockedAppleId: { type: String, sparse: true },
    blockedPhone: { type: String, sparse: true },

    // -- WhatsApp OTP --------------------------------------------------------
    whatsappOtp: { type: String },
    whatsappOtpExpiry: { type: Date },
    whatsappOtpAttempts: { type: Number, default: 0 },
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

UserSchema.index({ country: 1 });
UserSchema.index({ lastSeen: -1 });  // supports "online users" queries

export default mongoose.model('User', UserSchema);
