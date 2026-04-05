// seed_fake_ad.js — run once to insert a fake ad into MongoDB
import mongoose from 'mongoose';

const uri = 'mongodb+srv://ahmedsharnou_db_user:MiqAQuCFW080G6u9@cluster0.77mmp6c.mongodb.net/xtox';

const AdSchema = new mongoose.Schema({
  title: String, description: String, price: Number, category: String,
  media: [String], images: [String], userId: mongoose.Schema.Types.Mixed,
  username: String,
  isFeatured: Boolean, featuredStyle: String,
  isDeleted: { type: Boolean, default: false },
  isExpired: { type: Boolean, default: false },
  views: { type: Number, default: 0 },
  chatEnabled: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  country: String, city: String, currency: String,
  visibilityScore: { type: Number, default: 10 },
  status: String,
}, { strict: false });

const Ad = mongoose.model('Ad', AdSchema);

(async () => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  console.log('[seed] MongoDB connected');
  
  const fakeUserId = new mongoose.Types.ObjectId();
  
  const ad = await Ad.create({
    title: 'iPhone 15 Pro — بحالة ممتازة',
    description: 'آيفون 15 برو، لون تيتانيوم طبيعي، سعة 256 جيجابايت. استخدام خفيف جداً، يأتي مع الكرتونة الأصلية وجميع الملحقات. بدون خدوش. السعر قابل للتفاوض بشكل محدود.',
    price: 3500,
    currency: 'EGP',
    category: 'electronics',
    media: ['https://images.unsplash.com/photo-1696446701796-da61225697cc?w=600'],
    images: ['https://images.unsplash.com/photo-1696446701796-da61225697cc?w=600'],
    userId: fakeUserId,
    username: 'xtox',
    isFeatured: true,
    featuredStyle: 'gold',
    isDeleted: { $ne: true },
    isExpired: { $ne: true },
    views: 42,
    chatEnabled: true,
    country: 'EG',
    city: 'Cairo',
    visibilityScore: 10,
    status: 'active',
    expiresAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
  });
  
  console.log('Seeded ad ID:', ad._id.toString());
  await mongoose.disconnect();
})();
