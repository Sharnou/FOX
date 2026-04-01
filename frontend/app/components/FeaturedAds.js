'use client';
import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';

// ─── i18n labels ────────────────────────────────────────────────────────────
const LABELS = {
  title: '⭐ إعلانات مميزة',
  views: 'مشاهدة',
  whatsapp: 'واتساب',
  scrollLeft: 'تمرير لليسار',
  scrollRight: 'تمرير لليمين',
  featured: 'مميز',
  promote: 'روّج إعلانك',
  empty: 'لا توجد إعلانات مميزة حالياً',
  currency: 'ج.م',
};

// ─── Skeleton shimmer card ────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div
      aria-hidden="true"
      style={{
        minWidth: 180,
        borderRadius: 16,
        overflow: 'hidden',
        background: '#f0f0f0',
        flexShrink: 0,
      }}
    >
      <div style={{ width: '100%', height: 120, background: 'linear-gradient(90deg,#e0e0e0 25%,#f5f5f5 50%,#e0e0e0 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
      <div style={{ padding: '10px 12px' }}>
        <div style={{ height: 14, borderRadius: 6, background: '#e0e0e0', marginBottom: 8, animation: 'shimmer 1.4s infinite' }} />
        <div style={{ height: 12, width: '60%', borderRadius: 6, background: '#e0e0e0', animation: 'shimmer 1.4s infinite' }} />
      </div>
    </div>
  );
}

// ─── Single featured card ─────────────────────────────────────────────────────
function FeaturedCard({ ad }) {
  const isCartoon = ad.featuredStyle === 'cartoon';
  const whatsappNum = ad.phone ? ad.phone.replace(/\D/g, '') : null;
  const whatsappUrl = whatsappNum ? `https://wa.me/${whatsappNum}?text=${encodeURIComponent(`مرحباً، رأيت إعلانك "${ad.title}" على XTOX`)}` : null;

  return (
    <article
      dir="rtl"
      role="article"
      aria-label={`إعلان مميز: ${ad.title}`}
      style={{
        minWidth: 180,
        maxWidth: 200,
        background: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        flexShrink: 0,
        border: isCartoon ? '3px solid #f1c40f' : '2px solid #002f34',
        boxShadow: '0 4px 16px rgba(0,47,52,0.10)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        cursor: 'pointer',
        position: 'relative',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,47,52,0.18)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,47,52,0.10)';
      }}
    >
      {/* Featured badge */}
      <span style={{
        position: 'absolute', top: 8, right: 8, zIndex: 2,
        background: isCartoon ? '#f1c40f' : '#002f34',
        color: isCartoon ? '#002f34' : '#fff',
        fontSize: 10, fontWeight: 700,
        borderRadius: 8, padding: '2px 8px',
        fontFamily: 'Cairo, sans-serif',
      }}>
        {isCartoon ? '⭐ مميز' : '✓ مميز'}
      </span>

      <Link href={`/ads/${ad._id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
        {/* Image with gradient overlay */}
        <div style={{ position: 'relative', width: '100%', height: 120, background: '#f0f0f0', overflow: 'hidden' }}>
          {ad.media?.[0] ? (
            <>
              <img
                src={ad.media[0]}
                alt={ad.title}
                loading="lazy"
                decoding="async"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                onError={e => { e.currentTarget.style.display = 'none'; }}
              />
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height: 40,
                background: 'linear-gradient(transparent, rgba(0,0,0,0.45))',
              }} />
            </>
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>🏷️</div>
          )}
        </div>

        {/* Card body */}
        <div style={{ padding: '10px 12px', fontFamily: 'Cairo, sans-serif' }}>
          <p style={{ fontWeight: 700, fontSize: 13, color: '#002f34', margin: '0 0 4px', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {ad.title}
          </p>
          <p style={{ fontWeight: 700, fontSize: 14, color: '#e67e22', margin: '0 0 4px' }}>
            {ad.price ? `${ad.price} ${ad.currency || LABELS.currency}` : 'السعر عند الاتصال'}
          </p>
          {(ad.city || ad.location) && (
            <p style={{ fontSize: 11, color: '#888', margin: '0 0 2px', display: 'flex', alignItems: 'center', gap: 3 }}>
              <span aria-hidden="true">📍</span>
              {ad.city || ad.location}
            </p>
          )}
          {ad.views !== undefined && (
            <p style={{ fontSize: 10, color: '#aaa', margin: 0 }}>
              {ad.views || 0} {LABELS.views}
            </p>
          )}
        </div>
      </Link>

      {/* WhatsApp quick contact */}
      {whatsappUrl && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`تواصل عبر واتساب بخصوص: ${ad.title}`}
          onClick={e => e.stopPropagation()}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            background: '#25D366', color: '#fff',
            fontSize: 11, fontWeight: 700,
            padding: '6px 12px',
            fontFamily: 'Cairo, sans-serif',
            textDecoration: 'none',
            borderTop: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          <span aria-hidden="true">💬</span> {LABELS.whatsapp}
        </a>
      )}
    </article>
  );
}

// ─── Main FeaturedAds component ───────────────────────────────────────────────
export default function FeaturedAds({ ads = [], loading = false }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const featured = ads.filter(a => a.isFeatured);

  // Update scroll button visibility
  function updateScrollButtons() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollButtons();
    el.addEventListener('scroll', updateScrollButtons, { passive: true });
    window.addEventListener('resize', updateScrollButtons, { passive: true });
    return () => {
      el.removeEventListener('scroll', updateScrollButtons);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [featured.length]);

  function scrollBy(dir) {
    scrollRef.current?.scrollBy({ left: dir * 210, behavior: 'smooth' });
  }

  // Don't render if nothing to show and not loading
  if (!loading && !featured.length) return null;

  const arrowStyle = (enabled) => ({
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 3,
    background: enabled ? '#002f34' : '#ddd',
    color: '#fff',
    border: 'none',
    borderRadius: '50%',
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: enabled ? 'pointer' : 'default',
    opacity: enabled ? 1 : 0.4,
    fontSize: 16,
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    transition: 'opacity 0.2s, background 0.2s',
    pointerEvents: enabled ? 'auto' : 'none',
  });

  return (
    <section
      dir="rtl"
      aria-label="إعلانات مميزة"
      style={{ padding: '16px 0', position: 'relative', fontFamily: 'Cairo, sans-serif' }}
    >
      {/* Keyframes */}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .featured-card:focus-within {
          outline: 2px solid #002f34;
          outline-offset: 2px;
          border-radius: 16px;
        }
      `}</style>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px 12px',
      }}>
        <h2 style={{ fontWeight: 700, fontSize: 17, color: '#002f34', margin: 0 }}>
          {LABELS.title}
        </h2>
        {featured.length > 0 && (
          <span style={{ fontSize: 12, color: '#888' }}>{featured.length} إعلان</span>
        )}
      </div>

      {/* Scroll strip */}
      <div style={{ position: 'relative' }}>
        {/* Left arrow (RTL: navigate right visually) */}
        {canScrollLeft && (
          <button
            aria-label={LABELS.scrollLeft}
            onClick={() => scrollBy(-1)}
            style={{ ...arrowStyle(canScrollLeft), right: 6 }}
          >
            ›
          </button>
        )}

        <div
          ref={scrollRef}
          role="list"
          aria-label="قائمة الإعلانات المميزة"
          style={{
            display: 'flex',
            gap: 12,
            overflowX: 'auto',
            padding: '4px 16px 12px',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <style>{`div::-webkit-scrollbar { display: none; }`}</style>

          {loading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : featured.map(ad => (
                <div key={ad._id} role="listitem" className="featured-card">
                  <FeaturedCard ad={ad} />
                </div>
              ))
          }
        </div>

        {/* Right arrow */}
        {canScrollRight && (
          <button
            aria-label={LABELS.scrollRight}
            onClick={() => scrollBy(1)}
            style={{ ...arrowStyle(canScrollRight), left: 6 }}
          >
            ‹
          </button>
        )}
      </div>
    </section>
  );
}
