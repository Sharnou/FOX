'use client';
// BannerAds — displays ALL featured ads with style-aware layouts:
//   gold/banner  → full-width hero strip (premium)
//   normal       → compact card with indigo accent
//   cartoon      → card with purple cartoon badge
import Link from 'next/link';

// Style config per featuredStyle value
const STYLE_CONFIG = {
  gold: {
    bg: 'linear-gradient(135deg, #92400e, #d97706, #fbbf24, #d97706, #92400e)',
    badge: '🥇 إعلان ذهبي',
    badgeEn: '🥇 Gold Ad',
    hero: true,
  },
  banner: {
    bg: 'linear-gradient(135deg, #1e1047, #4c1d95, #6366f1)',
    badge: '🏆 إعلان مميز',
    badgeEn: '🏆 Featured Ad',
    hero: true,
  },
  cartoon: {
    bg: 'linear-gradient(135deg, #2d1b69, #7c3aed, #c084fc)',
    badge: '🎨 إعلان كرتوني',
    badgeEn: '🎨 Cartoon Ad',
    hero: false,
  },
  normal: {
    bg: 'linear-gradient(135deg, #0f172a, #1e293b, #334155)',
    badge: '⭐ إعلان مميز',
    badgeEn: '⭐ Featured',
    hero: false,
  },
};

export default function BannerAds({ ads = [], lang = 'ar' }) {
  // FIX C: Show ALL isFeatured ads, not just banner/gold styles
  const featuredAds = ads.filter(a => a.isFeatured);
  if (!featuredAds.length) return null;

  // Split: hero-style (gold, banner) shown full-width at top; others as compact cards
  const heroAds    = featuredAds.filter(a => a.featuredStyle === 'gold' || a.featuredStyle === 'banner');
  const compactAds = featuredAds.filter(a => a.featuredStyle !== 'gold' && a.featuredStyle !== 'banner');

  const isAr = lang === 'ar';

  return (
    <div style={{ margin: '0 0 4px' }}>
      {/* ── Hero strip ads (gold / banner) ── */}
      {heroAds.map((ad, i) => {
        const cfg = STYLE_CONFIG[ad.featuredStyle] || STYLE_CONFIG.banner;
        return (
          <Link key={ad._id || `hero-${i}`} href={`/ads/${ad._id}`} style={{ textDecoration: 'none', display: 'block', marginBottom: 8 }}>
            <div style={{
              background: cfg.bg,
              color: '#fff',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              borderRadius: '16px',
              boxShadow: '0 6px 20px rgba(0,0,0,0.22)',
              position: 'relative',
              minHeight: '80px',
              overflow: 'hidden',
            }}>
              {/* Shimmer overlay */}
              <div aria-hidden="true" style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.08) 50%, transparent 60%)',
                pointerEvents: 'none',
              }} />
              {ad.media?.[0] && (
                <img
                  src={ad.media[0]}
                  alt={ad.title || ''}
                  loading="lazy"
                  style={{ width: 76, height: 76, objectFit: 'cover', borderRadius: 10, flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.85, marginBottom: 4, letterSpacing: 0.3 }}>
                  {isAr ? cfg.badge : cfg.badgeEn}
                </div>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ad.title}
                </div>
                <div style={{ fontSize: 13, opacity: 0.9, fontWeight: 600 }}>
                  {ad.price?.toLocaleString()} {ad.currency}
                </div>
              </div>
              <div style={{
                fontSize: 13,
                padding: '6px 14px',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: 999,
                fontWeight: 700,
                flexShrink: 0,
                backdropFilter: 'blur(4px)',
                border: '1px solid rgba(255,255,255,0.25)',
              }}>
                {isAr ? 'عرض ←' : 'View →'}
              </div>
            </div>
          </Link>
        );
      })}

      {/* ── Compact cards (normal / cartoon) ── */}
      {compactAds.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: compactAds.length === 1 ? '1fr' : 'repeat(2, 1fr)',
          gap: 8,
          marginBottom: heroAds.length > 0 ? 0 : 4,
        }}>
          {compactAds.map((ad, i) => {
            const cfg = STYLE_CONFIG[ad.featuredStyle] || STYLE_CONFIG.normal;
            const isCartoon = ad.featuredStyle === 'cartoon';
            return (
              <Link key={ad._id || `compact-${i}`} href={`/ads/${ad._id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: cfg.bg,
                  color: '#fff',
                  borderRadius: 14,
                  overflow: 'hidden',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 100,
                  position: 'relative',
                }}>
                  {/* Cartoon badge */}
                  {isCartoon && (
                    <div style={{
                      position: 'absolute', top: 8, [isAr ? 'right' : 'left']: 8,
                      background: 'rgba(192,132,252,0.9)',
                      color: 'white',
                      fontSize: 9,
                      fontWeight: 800,
                      padding: '2px 7px',
                      borderRadius: 6,
                      backdropFilter: 'blur(4px)',
                      letterSpacing: 0.4,
                      textTransform: 'uppercase',
                    }}>
                      🎨 {isAr ? 'كرتوني' : 'CARTOON'}
                    </div>
                  )}
                  {ad.media?.[0] ? (
                    <img
                      src={ad.media[0]}
                      alt={ad.title || ''}
                      loading="lazy"
                      style={{ width: '100%', height: 70, objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                      {isCartoon ? '🎨' : '⭐'}
                    </div>
                  )}
                  <div style={{ padding: '8px 10px 10px' }}>
                    <div style={{ fontSize: 10, opacity: 0.8, marginBottom: 2, fontWeight: 600 }}>
                      {isAr ? cfg.badge : cfg.badgeEn}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 12, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ad.title}
                    </div>
                    <div style={{ fontSize: 12, marginTop: 3, fontWeight: 700, opacity: 0.95 }}>
                      {ad.price?.toLocaleString()} {ad.currency}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
