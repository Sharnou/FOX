'use client';

// ── Run 116: Related Ads Component ──────────────────────────────────────────
// Displays a horizontally scrollable row of "إعلانات مشابهة" (similar listings)
// fetched from the same category as the current ad.
// Fully RTL-compatible with Arabic labels and graceful error/empty handling.

import { useState, useEffect, useRef } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox.up.railway.app';

// Reuse the same Cloudinary optimiser pattern used across XTOX components
function optimizeImage(url, width = 300) {
  if (!url || !url.includes('cloudinary.com')) return url;
  return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width},c_limit/`);
}

// Arabic-Indic numeral conversion
function toArabicNumerals(n) {
  return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
}

// Format price with Arabic locale
function formatPrice(price, currency = 'EGP') {
  if (!price && price !== 0) return 'السعر عند الاتصال';
  try {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `${toArabicNumerals(price)} ${currency}`;
  }
}

// Time-since in Arabic (e.g. "منذ ٣ أيام")
function timeAgoAr(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `منذ ${toArabicNumerals(mins)} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${toArabicNumerals(hrs)} ساعة`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `منذ ${toArabicNumerals(days)} يوم`;
  const months = Math.floor(days / 30);
  return `منذ ${toArabicNumerals(months)} شهر`;
}

// ── Mini Ad Card (horizontal scroll item) ────────────────────────────────────
function MiniAdCard({ ad }) {
  const img = optimizeImage(ad.images?.[0], 300);
  const price = formatPrice(ad.price, ad.currency);

  return (
    <a
      href={`/ads/${ad._id}`}
      dir="rtl"
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: 160,
        minWidth: 160,
        borderRadius: 14,
        overflow: 'hidden',
        background: '#fff',
        border: '1px solid #e8e8e8',
        textDecoration: 'none',
        color: 'inherit',
        boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
        transition: 'box-shadow 0.2s, transform 0.2s',
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,47,52,0.14)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Image */}
      <div style={{ position: 'relative', width: '100%', paddingTop: '70%', background: '#f5f5f5', overflow: 'hidden' }}>
        {img ? (
          <img
            src={img}
            alt={ad.title}
            loading="lazy"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.3s',
            }}
          />
        ) : (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 36,
            color: '#ccc',
          }}>
            📷
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '8px 10px 10px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 700,
            color: '#111',
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {ad.title}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 800,
            color: '#002f34',
          }}
        >
          {price}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            color: '#888',
          }}
        >
          {timeAgoAr(ad.createdAt)}
        </p>
      </div>
    </a>
  );
}

// ── Skeleton loader for RelatedAds ───────────────────────────────────────────
function RelatedAdsSkeleton({ count = 4 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 160,
            minWidth: 160,
            borderRadius: 14,
            overflow: 'hidden',
            background: '#f0f0f0',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: '100%',
              paddingTop: '70%',
              background: 'linear-gradient(90deg, #e8e8e8 25%, #f5f5f5 50%, #e8e8e8 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.4s infinite',
            }}
          />
          <div style={{ padding: '8px 10px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[80, 50, 30].map((w, j) => (
              <div
                key={j}
                style={{
                  height: j === 0 ? 28 : 16,
                  width: `${w}%`,
                  borderRadius: 6,
                  background: 'linear-gradient(90deg, #e8e8e8 25%, #f5f5f5 50%, #e8e8e8 75%)',
                  backgroundSize: '200% 100%',
                  animation: `shimmer 1.4s infinite ${j * 0.1}s`,
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

// ── Main RelatedAds Component ─────────────────────────────────────────────────
export default function RelatedAds({ currentAdId, category, limit = 6 }) {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const scrollRef = useRef(null);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);

  useEffect(() => {
    if (!category) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);

    const controller = new AbortController();
    const params = new URLSearchParams({
      category,
      limit: String(limit + 1), // fetch one extra to exclude current
      sort: 'newest',
    });

    fetch(`${API}/api/ads?${params}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        const items = Array.isArray(data)
          ? data
          : Array.isArray(data.ads)
          ? data.ads
          : [];
        // Exclude the current ad
        setAds(items.filter(a => String(a._id) !== String(currentAdId)).slice(0, limit));
        setLoading(false);
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          setError(true);
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [currentAdId, category, limit]);

  // Track scroll position to show/hide arrow buttons
  function updateScrollButtons() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  }

  useEffect(() => {
    updateScrollButtons();
    const el = scrollRef.current;
    el?.addEventListener('scroll', updateScrollButtons, { passive: true });
    return () => el?.removeEventListener('scroll', updateScrollButtons);
  }, [ads]);

  function scrollBy(direction) {
    const el = scrollRef.current;
    if (!el) return;
    // RTL: "right" button scrolls content to show items on the right (scrollLeft decreases in RTL)
    el.scrollBy({ left: direction * 340, behavior: 'smooth' });
  }

  // Don't render if nothing to show after loading
  if (!loading && (error || ads.length === 0)) return null;

  return (
    <section dir="rtl" style={{ marginTop: 32, marginBottom: 8 }}>
      {/* Shimmer keyframes injected once */}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* Section header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
        paddingInline: 4,
      }}>
        <h2 style={{
          margin: 0,
          fontSize: 17,
          fontWeight: 800,
          color: '#111',
          fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif",
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ fontSize: 20 }}>🔍</span>
          إعلانات مشابهة
        </h2>

        {/* Desktop scroll arrows — hidden on mobile */}
        <div
          style={{
            display: 'flex',
            gap: 8,
          }}
          className="related-arrows"
        >
          <button
            onClick={() => scrollBy(1)}
            disabled={!canScrollRight}
            aria-label="التالي"
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              border: '1.5px solid #ddd',
              background: canScrollRight ? '#002f34' : '#f0f0f0',
              color: canScrollRight ? '#fff' : '#ccc',
              cursor: canScrollRight ? 'pointer' : 'default',
              fontSize: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
              lineHeight: 1,
            }}
          >
            ‹
          </button>
          <button
            onClick={() => scrollBy(-1)}
            disabled={!canScrollLeft}
            aria-label="السابق"
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              border: '1.5px solid #ddd',
              background: canScrollLeft ? '#002f34' : '#f0f0f0',
              color: canScrollLeft ? '#fff' : '#ccc',
              cursor: canScrollLeft ? 'pointer' : 'default',
              fontSize: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
              lineHeight: 1,
            }}
          >
            ›
          </button>
        </div>
      </div>

      {/* Horizontally scrollable row */}
      <div
        ref={scrollRef}
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: 12,
          overflowX: 'auto',
          overflowY: 'visible',
          paddingBottom: 8,
          paddingInline: 4,
          scrollbarWidth: 'none',          // Firefox
          msOverflowStyle: 'none',         // IE/Edge
          WebkitOverflowScrolling: 'touch', // iOS momentum scroll
        }}
        onScroll={updateScrollButtons}
      >
        {/* Hide scrollbar in WebKit */}
        <style>{`
          .related-scroll::-webkit-scrollbar { display: none; }
        `}</style>

        {loading ? (
          <RelatedAdsSkeleton count={4} />
        ) : (
          ads.map(ad => <MiniAdCard key={ad._id} ad={ad} />)
        )}
      </div>

      {/* "See all in category" link */}
      {!loading && ads.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <a
            href={`/search?category=${encodeURIComponent(category)}`}
            style={{
              display: 'inline-block',
              padding: '8px 22px',
              borderRadius: 999,
              border: '1.5px solid #002f34',
              color: '#002f34',
              fontWeight: 700,
              fontSize: 13,
              textDecoration: 'none',
              fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif",
              transition: 'background 0.2s, color 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#002f34';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#002f34';
            }}
          >
            عرض جميع إعلانات هذه الفئة ←
          </a>
        </div>
      )}
    </section>
  );
}
