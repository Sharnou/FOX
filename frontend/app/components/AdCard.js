'use client';

import { useState, useEffect } from 'react';
import AIQualityBadge from './AIQualityBadge';

// Auto-optimize Cloudinary images — free (f_auto=best format, q_auto=best quality, w_400=resize)
function optimizeImage(url, width = 400) {
  if (!url || !url.includes('cloudinary.com')) return url;
  return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width},c_limit/`);
}


// Convert Western numerals to Arabic-Indic numerals for RTL UI
function toArabicNumerals(n) {
  return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
}

// ── Run 107: Ad Expiry Countdown — helper ─────────────────────────────────
// Ads expire 30 days after createdAt; returns days remaining (negative = expired)
function getDaysLeft(createdAt) {
  if (!createdAt) return null;
  const created = new Date(createdAt);
  const expiry = new Date(created.getTime() + 30 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const diff = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  return diff;
}
// ──────────────────────────────────────────────────────────────────────────


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
  const [saved, setSaved] = useState(false);
  const [savingBookmark, setSavingBookmark] = useState(false);
  // ── Run 94: view counter state — live-updated after PATCH /api/ads/:id/view ──
  const [viewCount, setViewCount] = useState(ad?.views || 0);

  // Load saved state from localStorage wishlist on mount
  useEffect(() => {
    if (!ad?._id) return;
    try {
      const wishlist = JSON.parse(localStorage.getItem('xtox_wishlist') || '[]');
      setSaved(wishlist.includes(String(ad._id)));
    } catch {
      // ignore parse errors
    }
  }, [ad?._id]);

  // ── Run 94: Increment view count when card mounts (non-blocking, silent fail) ──
  useEffect(() => {
    if (!ad?._id) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    fetch(`${apiUrl}/api/ads/${ad._id}/view`, { method: 'PATCH' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.views != null) setViewCount(data.views); })
      .catch(() => {}); // silent — view count is non-critical
  }, [ad?._id]);
  // ─────────────────────────────────────────────────────────────────────────────

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

  const handleBookmark = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const token =
      localStorage.getItem('token') || localStorage.getItem('authToken');

    const adId = String(ad._id);

    if (!token) {
      // Guest mode: toggle localStorage only, no API call
      try {
        const wishlist = JSON.parse(localStorage.getItem('xtox_wishlist') || '[]');
        let updated;
        if (saved) {
          updated = wishlist.filter((id) => id !== adId);
        } else {
          updated = [...wishlist, adId];
        }
        localStorage.setItem('xtox_wishlist', JSON.stringify(updated));
        setSaved(!saved);
      } catch {
        // ignore
      }
      return;
    }

    // Authenticated: optimistic update then API call
    setSavingBookmark(true);
    const prevSaved = saved;
    setSaved(!saved);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/wishlist/${adId}`,
        {
          method: saved ? 'DELETE' : 'POST',
          headers: { Authorization: 'Bearer ' + token },
        }
      );
      if (!res.ok) throw new Error('API error');

      // Sync localStorage
      const wishlist = JSON.parse(localStorage.getItem('xtox_wishlist') || '[]');
      let updated;
      if (prevSaved) {
        updated = wishlist.filter((id) => id !== adId);
      } else {
        updated = [...wishlist, adId];
      }
      localStorage.setItem('xtox_wishlist', JSON.stringify(updated));
    } catch {
      // Revert on error
      setSaved(prevSaved);
    } finally {
      setSavingBookmark(false);
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
      {/* ── Run 94: Trending badge — shown when views exceed 100 ────────────── */}
      {viewCount > 100 && (
        <div style={{
          position:'absolute', top:8, left: ad.isFeatured ? 72 : 8, zIndex:5,
          background:'linear-gradient(135deg,#ff4500,#ff6b35)',
          color:'#fff', fontSize:11, fontWeight:700,
          padding:'3px 10px', borderRadius:10,
          boxShadow:'0 2px 8px rgba(255,69,0,0.4)',
          display:'flex', alignItems:'center', gap:4,
        }}>
          🔥 رائج
        </div>
      )}
      {/* ──────────────────────────────────────────────────────────────────────── */}
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
      {/* Bookmark / Wishlist button */}
      <button
        onClick={handleBookmark}
        aria-label={saved ? 'إزالة من المحفوظات' : 'حفظ في المحفوظات'}
        disabled={savingBookmark}
        className="absolute top-12 right-2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 disabled:opacity-60 transition-colors duration-200"
        style={{ fontSize: 16 }}
      >
        {saved ? '❤️' : '🤍'}
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
        {/* ── Run 107: Ad Expiry Countdown Badge ── */}
        {(() => {
          const daysLeft = getDaysLeft(ad.createdAt);
          if (daysLeft === null) return null;
          const color = daysLeft <= 3 ? '#ef4444' : daysLeft <= 7 ? '#f97316' : '#22c55e';
          const label = typeof window !== 'undefined' && document.documentElement.dir === 'rtl'
            ? (daysLeft <= 0 ? 'منتهي' : `${daysLeft} يوم متبق`)
            : (daysLeft <= 0 ? 'Expired' : `${daysLeft}d left`);
          return (
            <span style={{
              position: 'absolute',
              bottom: '8px',
              left: '8px',
              background: color,
              color: '#fff',
              fontSize: '10px',
              fontWeight: '700',
              padding: '2px 7px',
              borderRadius: '999px',
              zIndex: 10,
              letterSpacing: '0.02em',
              boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
              pointerEvents: 'none',
            }}>
              {label}
            </span>
          );
        })()}
        </div>
      ) : (
        <div className="relative w-full h-44 bg-gray-200 rounded-t-xl flex items-center justify-center text-4xl">
          📦
        {/* ── Run 107: Ad Expiry Countdown Badge ── */}
        {(() => {
          const daysLeft = getDaysLeft(ad.createdAt);
          if (daysLeft === null) return null;
          const color = daysLeft <= 3 ? '#ef4444' : daysLeft <= 7 ? '#f97316' : '#22c55e';
          const label = typeof window !== 'undefined' && document.documentElement.dir === 'rtl'
            ? (daysLeft <= 0 ? 'منتهي' : `${daysLeft} يوم متبق`)
            : (daysLeft <= 0 ? 'Expired' : `${daysLeft}d left`);
          return (
            <span style={{
              position: 'absolute',
              bottom: '8px',
              left: '8px',
              background: color,
              color: '#fff',
              fontSize: '10px',
              fontWeight: '700',
              padding: '2px 7px',
              borderRadius: '999px',
              zIndex: 10,
              letterSpacing: '0.02em',
              boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
              pointerEvents: 'none',
            }}>
              {label}
            </span>
          );
        })()}
        </div>
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

              {ad.phone && (
                <a
                  href={`https://wa.me/${ad.phone.replace(/\D/g, '')}?text=${encodeURIComponent('مرحبا، رأيت إعلانك على XTOX')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  dir="auto"
                  className="mt-2 inline-flex items-center gap-1 rounded-full bg-green-500 hover:bg-green-600 active:bg-green-700 px-3 py-1 text-xs font-semibold text-white shadow transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.116 1.528 5.845L.057 23.448a.75.75 0 0 0 .916.948l5.84-1.53A11.946 11.946 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.7 9.7 0 0 1-4.99-1.378l-.357-.214-3.705.971.989-3.614-.233-.371A9.718 9.718 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
                  </svg>
                  <span>واتساب</span>
                </a>
              )}
          )}
        </div>
        <p className="text-brand font-bold mt-1">{ad.price} {ad.currency}</p>
        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
          <StarRating rating={rating} count={ratingCount} />
          {ad.aiQualityScore != null && <AIQualityBadge score={ad.aiQualityScore} />}
        </div>
        {/* Run 94: viewCount from live state (updated by PATCH /api/ads/:id/view) */}
        <p className="text-xs text-gray-500 mt-1">👁 {viewCount} | {ad.city}</p>
      </div>
    </a>
  );
}
