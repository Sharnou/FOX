'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
function getDaysLeft(createdAt) {
  if (!createdAt) return null;
  const created = new Date(createdAt);
  const expiry = new Date(created.getTime() + 30 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const diff = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  return diff;
}
// ──────────────────────────────────────────────────────────────────────────

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

export default function AdCard({ ad }) {
  const router = useRouter();
  const [shared, setShared] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savingBookmark, setSavingBookmark] = useState(false);
  const [viewCount, setViewCount] = useState(ad?.views || 0);
  // ── Media carousel state ──────────────────────────────────────────────────
  const [imgIndex, setImgIndex] = useState(0);
  const touchStartX = useRef(null);

  // Normalize ad id — MongoDB returns _id, some APIs return id
  const adId = ad?._id || ad?.id;

  // Load saved state from localStorage wishlist on mount
  useEffect(() => {
    if (!adId) return;
    try {
      const wishlist = JSON.parse(localStorage.getItem('xtox_wishlist') || '[]');
      setSaved(wishlist.includes(String(adId)));
    } catch {
      // ignore parse errors
    }
  }, [adId]);

  // ── Increment view count when card mounts (non-blocking, silent fail) ──
  useEffect(() => {
    if (!adId) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://xtox.up.railway.app';
    fetch(`${apiUrl}/api/ads/${adId}/view`, { method: 'PATCH' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.views != null) setViewCount(data.views); })
      .catch(() => {}); // silent — view count is non-critical
  }, [adId]);


  if (!ad) return null;

  const rating =
    ad.sellerRating ??
    ad.rating ??
    ad.userId?.reputation ??
    ad.reputation ??
    null;

  const ratingCount =
    ad.ratingCount ??
    ad.ratingsCount ??
    ad.userId?.ratingCount ??
    null;

  const handleShare = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const adUrl = `${window.location.origin}/ads/${adId}`;
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

    const adIdStr = String(adId);

    if (!token) {
      try {
        const wishlist = JSON.parse(localStorage.getItem('xtox_wishlist') || '[]');
        let updated;
        if (saved) {
          updated = wishlist.filter((id) => id !== adIdStr);
        } else {
          updated = [...wishlist, adIdStr];
        }
        localStorage.setItem('xtox_wishlist', JSON.stringify(updated));
        setSaved(!saved);
      } catch {
        // ignore
      }
      return;
    }

    setSavingBookmark(true);
    const prevSaved = saved;
    setSaved(!saved);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "https://xtox.up.railway.app"}/api/wishlist/${adIdStr}`,
        {
          method: saved ? 'DELETE' : 'POST',
          headers: { Authorization: 'Bearer ' + token },
        }
      );
      if (!res.ok) throw new Error('API error');

      const wishlist = JSON.parse(localStorage.getItem('xtox_wishlist') || '[]');
      let updated;
      if (prevSaved) {
        updated = wishlist.filter((id) => id !== adIdStr);
      } else {
        updated = [...wishlist, adIdStr];
      }
      localStorage.setItem('xtox_wishlist', JSON.stringify(updated));
    } catch {
      setSaved(prevSaved);
    } finally {
      setSavingBookmark(false);
    }
  };

  // ── FIX 3: Chat button handler ──────────────────────────────────────────
  const handleChat = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const token =
      localStorage.getItem('token') ||
      localStorage.getItem('authToken') ||
      localStorage.getItem('xtox_admin_token');
    if (!token) {
      router.push('/login');
      return;
    }
    const sellerId = ad.userId?._id || ad.userId?.id || ad.userId || ad.sellerId;
    router.push(`/chat?adId=${adId}&sellerId=${sellerId}`);
  };

  // ── FIX: Comprehensive image resolution — try ALL field names, handle base64 ─
  // Get all available images from any field name the API might return
  const allImages = [
    ...(Array.isArray(ad?.images) ? ad.images : []),
    ...(Array.isArray(ad?.media) ? ad.media : []),
    ...(Array.isArray(ad?.photos) ? ad.photos : []),
    ad?.image, ad?.imageUrl, ad?.thumbnail, ad?.photo
  ].filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i); // dedupe

  const firstImage = allImages[0] || null;
  const videoUrl = ad?.videoUrl || ad?.video || null;
  const hasVideo = !!videoUrl;
  const hasMultipleImages = allImages.length > 1;

  // ── Touch swipe support for mobile image carousel ──────────────────────────
  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) { setImgIndex(prev => (prev + 1) % allImages.length); }
      else { setImgIndex(prev => (prev - 1 + allImages.length) % allImages.length); }
    }
    touchStartX.current = null;
  };
  // ──────────────────────────────────────────────────────────────────────────
  // ──────────────────────────────────────────────────────────────────────────

  // ── FIX 2: Correct ad detail URL using normalized adId ──────────────────
  const adDetailUrl = `/ads/${adId}`;

  return (
    // FIX 2: Use Next.js Link for correct navigation; normalized adId
    <Link href={adDetailUrl} className="bg-white rounded-xl transition block slide-in relative"
      style={{
        border: ad.isFeatured ? '2px solid #FFD700' : '1px solid #eee',
        boxShadow: ad.isFeatured ? '0 4px 16px rgba(255,165,0,0.2)' : '0 1px 4px rgba(0,0,0,0.06)',
        textDecoration: 'none',
        color: 'inherit',
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

      {/* ── Media Carousel: video > multiple images > single image > placeholder ── */}
      <div style={{ position: 'relative', width: '100%', paddingBottom: '65%', background: '#f0f0f0', borderRadius: '12px 12px 0 0', overflow: 'hidden' }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}>
        {hasVideo ? (
          <video src={videoUrl} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            muted loop autoPlay playsInline />
        ) : firstImage ? (
          <img
            loading="lazy"
            decoding="async"
            src={optimizeImage(allImages[imgIndex] || firstImage)}
            alt={ad?.title || 'إعلان'}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              e.target.onerror = null;
              e.target.style.display = 'none';
              e.target.parentElement.innerHTML += '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:36px;color:#ccc">📷</div>';
            }}
          />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: 40 }}>📷</div>
        )}

        {/* Navigation dots for multiple images */}
        {hasMultipleImages && (
          <div style={{ position: 'absolute', bottom: 6, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 4 }}>
            {allImages.map((_, i) => (
              <div key={i} onClick={e => { e.stopPropagation(); setImgIndex(i); }}
                style={{ width: 8, height: 8, borderRadius: '50%', background: i === imgIndex ? 'white' : 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 4, boxSizing: 'content-box', WebkitTapHighlightColor: 'transparent' }} />
            ))}
          </div>
        )}

        {/* Prev/Next arrows for multiple images */}
        {hasMultipleImages && (
          <>
            <button onClick={e => { e.stopPropagation(); setImgIndex(prev => (prev - 1 + allImages.length) % allImages.length); }}
              style={{ position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', color: 'white', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}>‹</button>
            <button onClick={e => { e.stopPropagation(); setImgIndex(prev => (prev + 1) % allImages.length); }}
              style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', color: 'white', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}>›</button>
          </>
        )}

        {/* Video badge */}
        {hasVideo && (
          <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', color: 'white', borderRadius: 6, padding: '2px 6px', fontSize: 11 }}>🎥 فيديو</div>
        )}

        {/* Ad Expiry Countdown Badge */}
        {(() => {
          const daysLeft = getDaysLeft(ad.createdAt);
          if (daysLeft === null) return null;
          const color = daysLeft <= 3 ? '#ef4444' : daysLeft <= 7 ? '#f97316' : '#22c55e';
          const label = daysLeft <= 0 ? 'منتهي' : `${daysLeft} يوم متبق`;
          return (
            <span style={{
              position: 'absolute', bottom: '8px', left: '8px',
              background: color, color: '#fff', fontSize: '10px',
              fontWeight: '700', padding: '2px 7px', borderRadius: '999px',
              zIndex: 10, letterSpacing: '0.02em',
              boxShadow: '0 1px 4px rgba(0,0,0,0.18)', pointerEvents: 'none',
            }}>
              {label}
            </span>
          );
        })()}
      </div>

      <div className="p-3">
        <p className="font-bold text-sm line-clamp-2">{ad.title}</p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <ConditionBadge condition={ad.condition} />
          {ad.negotiable && (
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 2,
                padding: '2px 7px', borderRadius: 8,
                background: '#fff7ed', color: '#c2410c',
                fontSize: 11, fontWeight: 700,
              }}
              aria-label="السعر قابل للتفاوض"
            >
              💬 قابل للتفاوض
            </span>
          )}
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
        </div>
        {/* Price with drop badge */}
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          <p className="text-brand font-bold m-0">{ad.price} {ad.currency}</p>
          {ad.originalPrice && ad.originalPrice > ad.price && (() => {
            const discountPercent = Math.round((1 - ad.price / ad.originalPrice) * 100);
            return (
              <>
                <span style={{ textDecoration: 'line-through', color: '#9ca3af', fontSize: 12 }}>
                  {ad.originalPrice} {ad.currency}
                </span>
                <span style={{
                  display: 'inline-flex', alignItems: 'center',
                  padding: '2px 7px', borderRadius: 8,
                  background: '#fee2e2', color: '#dc2626',
                  fontSize: 11, fontWeight: 700, marginInlineStart: 2,
                }}>
                  خصم {toArabicNumerals(discountPercent)}٪
                </span>
              </>
            );
          })()}
        </div>
        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
          {(ad.seller?.verified || ad.userId?.verified) && (
            <span style={{color:'#23e5db',fontSize:'0.72rem',fontWeight:700,marginInlineEnd:'4px',display:'inline-flex',alignItems:'center'}}>
              موثق ✓
            </span>
          )}
          <StarRating rating={rating} count={ratingCount} />
          {ad.aiQualityScore != null && <AIQualityBadge score={ad.aiQualityScore} />}
        </div>
        {/* ── FIX 3: Chat button — bottom left of card info ────────────────── */}
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-gray-500 m-0">👁 {viewCount} | {ad.city}</p>
          {/* Chat button — always visible on every AdCard */}
          <button
            onClick={handleChat}
            title="تواصل مع البائع"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: 'none', borderRadius: '50%', width: 36, height: 36,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', boxShadow: '0 2px 8px rgba(99,102,241,0.4)',
              fontSize: 16, flexShrink: 0,
            }}
          >
            💬
          </button>
        </div>
      </div>
    </Link>
  );
}
