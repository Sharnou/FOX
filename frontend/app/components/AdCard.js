'use client';

import { useState } from 'react';

// Auto-optimize Cloudinary images — free (f_auto=best format, q_auto=best quality, w_400=resize)
function optimizeImage(url, width = 400) {
  if (!url || !url.includes('cloudinary.com')) return url;
  return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width},c_limit/`);
}


// Convert Western numerals to Arabic-Indic numerals for RTL UI
function toArabicNumerals(n) {
  return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
}

// ★ Seller Rating Stars — run 36: switched from inline style to Tailwind className
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
    <span
      className="text-xs inline-flex items-center gap-0.5"
      title={`${rating}/5`}
      dir="rtl"
    >
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={i < filled ? 'text-yellow-400' : 'text-gray-300'}
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

// ── Run 84: Condition badge ────────────────────────────────────────────────
// Shows item condition as a colored badge on each AdCard
// Matches the CONDITIONS enum in sell/page.js and backend/models/Ad.js
const CONDITION_MAP = {
  new:       { ar: 'جديد',     bg: '#dcfce7', color: '#15803d', icon: '✨' },
  excellent: { ar: 'ممتاز',    bg: '#dbeafe', color: '#1d4ed8', icon: '⭐' },
  used:      { ar: 'مستعمل',   bg: '#fef9c3', color: '#92400e', icon: '🔄' },
  rent:      { ar: 'للإيجار',  bg: '#ede9fe', color: '#6d28d9', icon: '🔑' },
};

function ConditionBadge({ condition }) {
  if (!condition || !CONDITION_MAP[condition]) return null;
  const { ar, bg, color, icon } = CONDITION_MAP[condition];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        padding: '2px 7px',
        borderRadius: 8,
        background: bg,
        color,
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1.5,
      }}
      aria-label={`حالة المنتج: ${ar}`}
    >
      {icon} {ar}
    </span>
  );
}
// ──────────────────────────────────────────────────────────────────────────

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
    <a href={`/ads/${ad._id}`} className="bg-white rounded-xl transition block slide-in relative"
      style={{
        border: ad.isFeatured ? '2px solid #FFD700' : '1px solid #eee',
        boxShadow: ad.isFeatured ? '0 4px 16px rgba(255,165,0,0.2)' : '0 1px 4px rgba(0,0,0,0.06)',
      }}>
      {ad.isFeatured && (
        <div style={{
          position:'absolute', top:8, left:8, zIndex:5,
          background:'linear-gradient(135deg,#FFD700,#FFA500)',
          color:'#000', fontSize:11, fontWeight:700,
          padding:'3px 10px', borderRadius:10,
          boxShadow:'0 2px 8px rgba(255,165,0,0.4)',
          display:'flex', alignItems:'center', gap:4,
        }}>
          ⭐ مميز
        </div>
      )}
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
            src={optimizeImage(ad.media[0])}
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
        {/* Run 84: condition badge + negotiable tag */}
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <ConditionBadge condition={ad.condition} />
          {ad.negotiable && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 2,
                padding: '2px 7px',
                borderRadius: 8,
                background: '#fff7ed',
                color: '#c2410c',
                fontSize: 11,
                fontWeight: 700,
              }}
              aria-label="السعر قابل للتفاوض"
            >
              💬 قابل للتفاوض
            </span>
          )}
        </div>
        <p className="text-brand font-bold mt-1">{ad.price} {ad.currency}</p>
        <div className="mt-1">
          <StarRating rating={rating} count={ratingCount} />
        </div>
        <p className="text-xs text-gray-500 mt-1">👁 {ad.views} | {ad.city}</p>
      </div>
    </a>
  );
}
