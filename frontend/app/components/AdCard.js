'use client';

import { useState } from 'react';

// Convert Western numerals to Arabic-Indic numerals for RTL UI
function toArabicNumerals(n) {
  return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
}

function StarRating({ rating, count }) {
  if (rating === null || rating === undefined) {
    return (
      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
        بائع جديد
      </span>
    );
  }
  const filled = Math.round(rating);
  return (
    <span className="text-xs inline-flex items-center gap-0.5" title={`${rating}/5`} dir="rtl">
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          style={{ color: i < filled ? '#F59E0B' : '#D1D5DB' }}
        >
          {i < filled ? '★' : '☆'}
        </span>
      ))}
      {count != null && (
        <span className="text-gray-400 ms-1 text-xs">({toArabicNumerals(count)})</span>
      )}
    </span>
  );
}

export default function AdCard({ ad }) {
  const [shared, setShared] = useState(false);

  if (!ad) return null;

  // Support sellerRating / rating fields; fall back to reputation for backwards compat
  const rating =
    ad.sellerRating ??
    ad.rating ??
    ad.userId?.reputation ??
    ad.reputation ??
    null;

  // Support multiple possible count field names
  const ratingCount =
    ad.ratingCount ??
    ad.ratingsCount ??
    ad.userId?.ratingCount ??
    null;

  const handleShare = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const adUrl = `${window.location.origin}/ads/${ad._id || ad.id}`;
    const shareData = {
      title: ad.title,
      text: ad.description || ad.title,
      url: adUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(adUrl);
      }
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch (err) {
      // User cancelled or error — do nothing
    }
  };

  return (
    <a href={`/ads/${ad._id}`} className="bg-white rounded-xl shadow hover:shadow-lg transition block slide-in relative">
      {/* Share button */}
      <button
        onClick={handleShare}
        aria-label="مشاركة"
        className={`absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center rounded-full text-sm transition-colors duration-200 ${
          shared
            ? 'bg-green-500 text-white'
            : 'bg-black/40 hover:bg-black/60 text-white'
        }`}
      >
        {shared ? '✓' : '📤'}
      </button>

      {ad.media?.[0] ? (
        <div className="relative w-full h-44 overflow-hidden rounded-t-xl">
          <img
            loading="lazy"
            src={ad.media[0]}
            className="w-full h-full object-cover img-blur-load"
            alt={ad.title}
            onLoad={e => e.target.classList.add('loaded')}
          />
        </div>
      ) : (
        <div className="w-full h-44 bg-gray-200 rounded-t-xl flex items-center justify-center text-4xl">📦</div>
      )}
      <div className="p-3">
        <p className="font-bold text-sm line-clamp-2">{ad.title}</p>
        <p className="text-brand font-bold mt-1">{ad.price} {ad.currency}</p>
        <div className="mt-1">
          <StarRating rating={rating} count={ratingCount} />
        </div>
        <p className="text-xs text-gray-500 mt-1">👁 {ad.views} | {ad.city}</p>
      </div>
    </a>
  );
}
