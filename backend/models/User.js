import mongoose from 'mongoose';
const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true, sparse: true },
  phone: { type: String, unique: true, sparse: true },
  password: String, name: String, avatar: String,
  country: { type: String, required: true },
  city: String, registrationIp: String, fcmToken: String,
  role: { type: String, enum: ['user', 'sub_admin', 'admin'], default: 'user' },
  reputation: { type: Number, default: 50 }, reports: { type: Number, default: 0 },
  goodActions: { type: Number, default: 0 }, isBanned: Boolean, banExpiresAt: Date,
  isMuted: Boolean, isHidden: Boolean, canChangeCountry: Boolean,
  adsToday: { type: Number, default: 0 }, lastAdDate: Date,
  isSimulation: Boolean,
  favorites: [String], blockedUsers: [String],
  lastActive: Date, createdAt: { type: Date, default: Date.now }
});
export default mongoose.model('User', UserSchema);
