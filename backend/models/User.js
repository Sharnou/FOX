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
    role: { type: String, enum: ['user', 'sub_admin', 'admin', 'superadmin'], default: 'user' },
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
    chatEnabled: { type: Boolean, default: true },
    muteSounds: { type: Boolean, default: false },
    favorites: [String],
    blockedUsers: [String],
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Ad' }],
    notifications: [{
      _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
      type: { type: String, enum: ['chat', 'ad', 'system', 'review', 'featured', 'broadcast'], default: 'system' },
      title: String,
      body: String,
      link: String,
      read: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now },
    }],
    username: { type: String, sparse: true },
    bio: { type: String, maxlength: 500 },
    gender: { type: String, enum: ['male', 'female', 'prefer_not_to_say'], default: null },
    lastSeen: { type: Date, default: null },
    isOnline: { type: Boolean, default: false },
    lastActive: Date,

    // -- Auth provider -------------------------------------------------------
    authProvider: { type: String, enum: ['email', 'google', 'apple', 'whatsapp'], default: 'email' },
    googleId: { type: String, sparse: true, unique: true },
    appleId: { type: String, sparse: true, unique: true },
    whatsappPhone: { type: String, sparse: true, unique: true },

    // -- XTOX identity -------------------------------------------------------
    xtoxId: { type: String, unique: true, sparse: true },
    xtoxEmail: { type: String, unique: true, sparse: true },

    // -- Blocking ------------------------------------------------------------
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

    // -- Free plan tracking ------------------------------------------------
    lastFreePlanUsed: { type: Date, default: null },

    // -- Seller trust fields (#128) -----------------------------------------
    sellerScore: { type: Number, default: 0 },           // 0-100 trust score
    isVerifiedSeller: { type: Boolean, default: false }, // manually verified by admin
    phoneVerified: { type: Boolean, default: false },    // phone number verified
    totalSales: { type: Number, default: 0 },            // completed sales count
    reportCount: { type: Number, default: 0 },           // number of reports received
    isSuspended: { type: Boolean, default: false },      // account suspended
    suspendReason: { type: String, default: '' },        // reason for suspension

    // -- Reputation points (gamification) -----------------------------------
    reputationPoints: { type: Number, default: 0 },
    monthlyPoints: { type: Number, default: 0 },
    lastMonthPoints: { type: Number, default: 0 },
    reputationHistory: [{
      type: { type: String, enum: ['ad_view', 'rating_received', 'winner_bonus'] },
      points: Number,
      adId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ad' },
      fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      createdAt: { type: Date, default: Date.now },
    }],

    // -- Points history (last 20 events) ------------------------------------
    pointsHistory: [{
      reason: String,
      points: Number,
      date: { type: Date, default: Date.now },
    }],

    // -- Profile completion bonus (one-time) --------------------------------
    profileBonusAwarded: { type: Boolean, default: false },

    // -- Verification status -------------------------------------------------
    emailVerified: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    whatsappVerified: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// ── Virtuals ────────────────────────────────────────────────────────────────

/** True when the user was active in the last 5 minutes (computed from lastSeen) */
UserSchema.virtual('isOnlineComputed').get(function () {
  if (this.isOnline) return true;  // Use real DB field first
  if (!this.lastSeen) return false;
  return Date.now() - this.lastSeen.getTime() < 5 * 60 * 1000;
});

/**
 * 'online'   — isOnline=true or active within the last 5 minutes
 * 'recently' — active within the last 24 hours
 * 'offline'  — more than 24 hours ago (or never seen)
 */
UserSchema.virtual('onlineStatus').get(function () {
  if (this.isOnline) return 'online';  // Real-time socket status
  if (!this.lastSeen) return 'offline';
  const diffMs = Date.now() - this.lastSeen.getTime();
  if (diffMs < 5 * 60 * 1000) return 'online';
  if (diffMs < 24 * 60 * 60 * 1000) return 'recently';
  return 'offline';
});

UserSchema.virtual('onlineStatusLabel').get(function () {
  const labels = {
    online:   { ar: 'متصل الآن',          en: 'Online now' },
    recently: { ar: 'متصل مؤخراً',        en: 'Recently active' },
    offline:  { ar: 'غير متصل',           en: 'Offline' },
  };
  return labels[this.onlineStatus] || labels.offline;
});

/**
 * Reputation tier based on reputationPoints:
 *   0–49    → Bronze  🥉
 *   50–199  → Silver  🥈
 *   200–499 → Gold    🥇
 *   500+    → Platinum 💎
 */
UserSchema.virtual('tier').get(function () {
  const pts = this.reputationPoints || 0;
  if (pts >= 500) return 'Platinum';
  if (pts >= 200) return 'Gold';
  if (pts >= 50)  return 'Silver';
  return 'Bronze';
});

/** Emoji + label pair for the tier */
UserSchema.virtual('tierBadge').get(function () {
  const map = {
    Bronze:   '🥉 Bronze',
    Silver:   '🥈 Silver',
    Gold:     '🥇 Gold',
    Platinum: '💎 Platinum',
  };
  return map[this.tier] || '🥉 Bronze';
});

// ── Indexes ─────────────────────────────────────────────────────────────────

UserSchema.index({ country: 1 });
UserSchema.index({ lastSeen: -1 });
UserSchema.index({ monthlyPoints: -1 });   // supports leaderboard queries

export default mongoose.model('User', UserSchema);
