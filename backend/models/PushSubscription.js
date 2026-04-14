import mongoose from 'mongoose';

const PushSubscriptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subscription: { type: Object, required: true }, // { endpoint, keys: { p256dh, auth } }
  userAgent: { type: String },
  createdAt: { type: Date, default: Date.now },
});

PushSubscriptionSchema.index({ user: 1 });
PushSubscriptionSchema.index({ 'subscription.endpoint': 1 }, { unique: false });

export default mongoose.model('PushSubscription', PushSubscriptionSchema);
