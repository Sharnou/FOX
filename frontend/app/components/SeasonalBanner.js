'use client';
import { useState, useEffect } from 'react';
import { getActiveBanner } from '../../lib/seasonalBanners';

export default function SeasonalBanner() {
  const [banner, setBanner] = useState(null);
  useEffect(() => { setBanner(getActiveBanner()); }, []);
  if (!banner) return null;
  return (
    <div
      role="banner"
      aria-label={banner.title}
      style={{
        width: '100%',
        background: banner.gradient,
        backgroundSize: '300% 300%',
        padding: '18px 20px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(168,237,234,0.4), 0 2px 8px rgba(0,0,0,0.08)',
        borderBottom: '3px solid rgba(255,255,255,0.6)',
      }}
    >
      {/* Decorative circles */}
      <div aria-hidden="true" style={{ position: 'absolute', top: -30, left: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
      <div aria-hidden="true" style={{ position: 'absolute', bottom: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', pointerEvents: 'none' }} />

      {/* Emoji row */}
      <div style={{ marginBottom: 8, fontSize: 28 }} aria-hidden="true">
        {banner.emoji} {banner.emoji} {banner.emoji}
      </div>

      {/* Main card */}
      <div style={{
        display: 'inline-block',
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: 20,
        padding: '14px 28px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        border: '2px solid rgba(255,255,255,0.8)',
        maxWidth: 600,
        width: '100%',
      }}>
        <p style={{
          margin: '0 0 4px',
          fontSize: 20,
          fontWeight: 900,
          color: banner.textColor,
          direction: 'rtl',
          lineHeight: 1.5,
          fontFamily: "'Cairo', 'Noto Sans Arabic', 'Tajawal', system-ui, sans-serif",
        }}>
          {banner.title}
        </p>
        <p style={{
          margin: 0,
          fontSize: 14,
          fontWeight: 700,
          color: banner.textColor,
          opacity: 0.8,
          lineHeight: 1.5,
        }}>
          {banner.subtitle}
        </p>
      </div>
    </div>
  );
}
