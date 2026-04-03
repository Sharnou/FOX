'use client';
// Displays full-width banner ads (featuredStyle === 'banner' or 'gold')
// Shows as hero banner strip between categories and main feed
import Link from 'next/link';

export default function BannerAds({ ads = [], lang = 'ar' }) {
  const bannerAds = ads.filter(a => a.isFeatured && (a.featuredStyle === 'banner' || a.featuredStyle === 'gold'));
  if (!bannerAds.length) return null;

  return (
    <div style={{ margin: '12px 0', borderRadius: '12px', overflow: 'hidden' }}>
      {bannerAds.map((ad, i) => (
        <Link key={ad._id || i} href={`/ads/${ad._id}`} style={{ textDecoration: 'none', display: 'block' }}>
          <div style={{
            background: ad.featuredStyle === 'gold' 
              ? 'linear-gradient(135deg, #b8860b, #ffd700, #b8860b)' 
              : 'linear-gradient(135deg, #002f34, #00626a)',
            color: '#fff',
            padding: '16px 20px',
            marginBottom: i < bannerAds.length - 1 ? '8px' : '0',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            position: 'relative',
            minHeight: '80px',
          }}>
            {ad.media?.[0] && (
              <img src={ad.media[0]} alt={ad.title} 
                style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }} />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', opacity: 0.8, marginBottom: '4px' }}>
                {ad.featuredStyle === 'gold' ? '⭐ إعلان ذهبي' : '🏆 إعلان مميز'}
              </div>
              <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>{ad.title}</div>
              <div style={{ fontSize: '13px', opacity: 0.9 }}>{ad.price?.toLocaleString()} {ad.currency}</div>
            </div>
            <div style={{ fontSize: '13px', padding: '6px 12px', background: 'rgba(255,255,255,0.2)', borderRadius: '20px' }}>
              {lang === 'ar' ? 'عرض →' : 'View →'}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
