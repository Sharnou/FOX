'use client';
export const dynamic = 'force-dynamic';
import { useState } from 'react';

// Mock seller reviews data (ready for API integration)
const MOCK_REVIEWS = [
  {
    id: 1,
    reviewer: 'أحمد الرشيد',
    rating: 5,
    comment: 'بائع ممتاز، التواصل سريع والمنتج كما وُصف تماماً. أنصح بالتعامل معه.',
    date: '2024-11-15',
  },
  {
    id: 2,
    reviewer: 'سارة المنصور',
    rating: 4,
    comment: 'تجربة جيدة جداً، السلعة وصلت في الوقت المحدد وبحالة ممتازة.',
    date: '2024-10-28',
  },
  {
    id: 3,
    reviewer: 'محمد العلي',
    rating: 5,
    comment: 'من أفضل البائعين في المنصة، صادق وأمين في التعاملات.',
    date: '2024-10-10',
  },
];

function StarRating({ rating }) {
  return (
    <span className="flex gap-0.5" aria-label={`${rating} من 5 نجوم`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={s <= rating ? 'text-yellow-400' : 'text-gray-300'}>
          ★
        </span>
      ))}
    </span>
  );
}

export default function ProfilePage() {
  const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
  const [name, setName] = useState(user.name || '');
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [reviewsOpen, setReviewsOpen] = useState(false);

  // Seller stats derived from localStorage
  const myAdsCount = typeof window !== 'undefined' ? (() => {
    try { return Number(localStorage.getItem('myAdsCount') || '0'); } catch { return 0; }
  })() : 0;
  const savedCount = typeof window !== 'undefined' ? (() => {
    try { return JSON.parse(localStorage.getItem('xtox_saved_ads') || '[]').length; } catch { return 0; }
  })() : 0;
  const memberSince = user.createdAt
    ? new Date(user.createdAt).getFullYear()
    : new Date().getFullYear();
  const isVerified = Boolean(user.phone || user.email);

  const avgRating = (MOCK_REVIEWS.reduce((s, r) => s + r.rating, 0) / MOCK_REVIEWS.length).toFixed(1);

  function saveProfile() {
    const updated = { ...user, name, avatar };
    localStorage.setItem('user', JSON.stringify(updated));
    alert('تم الحفظ!');
  }
  function uploadAvatar(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setAvatar(ev.target.result);
    reader.readAsDataURL(file);
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <button onClick={() => history.back()} className="mb-4 text-brand font-bold">← رجوع</button>
      <h1 className="text-2xl font-bold text-brand mb-6">👤 الملف الشخصي</h1>

      {/* Seller Stats Summary Card */}
      <div className="bg-white rounded-2xl shadow p-4 mb-6">
        <h2 className="text-sm font-bold text-gray-500 mb-3">📊 إحصائيات البائع</h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-2xl font-bold text-brand">{myAdsCount}</div>
            <div className="text-xs text-gray-500 mt-1">إعلاناتي</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-2xl font-bold text-brand">{memberSince}</div>
            <div className="text-xs text-gray-500 mt-1">عضو منذ</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className={`text-2xl font-bold ${isVerified ? 'text-green-600' : 'text-gray-400'}`}>
              {isVerified ? '✓' : '–'}
            </div>
            <div className="text-xs text-gray-500 mt-1">موثّق</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <a href="/my-ads" className="block text-center text-brand font-bold text-sm border border-brand rounded-xl py-2">
            📋 إعلاناتي
          </a>
          <a href="/saved" className="flex items-center justify-center gap-1 text-brand font-bold text-sm border border-brand rounded-xl py-2">
            🔖 المحفوظات
            {savedCount > 0 && (
              <span className="inline-block bg-brand text-white text-xs rounded-full px-1.5 leading-tight">{savedCount}</span>
            )}
          </a>
        </div>
      </div>

      {/* Seller Reviews Section — RTL, collapsible */}
      <div className="bg-white rounded-2xl shadow mb-6 overflow-hidden" dir="rtl">
        <button
          onClick={() => setReviewsOpen(!reviewsOpen)}
          className="w-full flex items-center justify-between p-4 text-right focus:outline-none"
          aria-expanded={reviewsOpen}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-700">⭐ تقييمات البائع</span>
            <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {avgRating} / 5
            </span>
            <span className="text-xs text-gray-400">({MOCK_REVIEWS.length} تقييم)</span>
          </div>
          <span className={`text-gray-400 transition-transform duration-200 ${reviewsOpen ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        {reviewsOpen && (
          <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
            {MOCK_REVIEWS.map((review) => (
              <div key={review.id} className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-gray-800">{review.reviewer}</span>
                  <span className="text-xs text-gray-400">{review.date}</span>
                </div>
                <StarRating rating={review.rating} />
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">{review.comment}</p>
              </div>
            ))}
            <p className="text-center text-xs text-gray-400 pt-1">
              * التقييمات ستُحمَّل من الخادم عند الاتصال
            </p>
          </div>
        )}
      </div>

      <div className="text-center mb-6">
        <label className="cursor-pointer">
          <img src={avatar || '/favicon.svg'} className="w-24 h-24 rounded-full mx-auto border-4 border-brand object-cover" alt="avatar" />
          <p className="text-sm text-brand mt-2">انقر لتغيير الصورة</p>
          <input type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
        </label>
      </div>
      <input value={name} onChange={e => setName(e.target.value)} className="w-full border rounded-xl p-3 mb-4" placeholder="اسمك" />
      <p className="text-gray-500 text-sm mb-4">البلد: {user.country} (مسجّل)</p>
      <button onClick={saveProfile} className="w-full bg-brand text-white py-3 rounded-xl font-bold">حفظ</button>
    </div>
  );
}
