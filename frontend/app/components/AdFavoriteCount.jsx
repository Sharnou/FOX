'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * AdFavoriteCount — Social proof widget showing how many users favorited an ad.
 *
 * Props:
 *   count  {number}  — Number of users who favorited this ad
 *   lang   {string}  — 'ar' (Arabic, default) or any other for English
 *   compact {boolean} — Compact badge mode (default false)
 *
 * Usage:
 *   <AdFavoriteCount count={ad.favoriteCount} lang={lang} />
 *   <AdFavoriteCount count={ad.favoriteCount} lang={lang} compact />
 */
export default function AdFavoriteCount({ count = 0, lang = 'ar', compact = false }) {
  const isAr = lang === 'ar';
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);
  const DURATION = 1000;

  useEffect(() => {
    if (count === 0) { setDisplayed(0); return; }
    startRef.current = null;
    const target = count;
    const animate = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / DURATION, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [count]);

  const formatNum = (n) => {
    if (!isAr) return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);
    // Arabic-Indic numerals
    const toArabicIndic = (num) =>
      String(num).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);
    if (n >= 1000) return toArabicIndic(Math.floor(n / 1000)) + '.' + toArabicIndic(Math.floor((n % 1000) / 100)) + 'ك';
    return toArabicIndic(n);
  };

  const isHot = count >= 20;

  const label = isAr
    ? 'أضاف ' + formatNum(displayed) + ' شخص هذا للمفضلة'
    : formatNum(displayed) + ' ' + (displayed === 1 ? 'person' : 'people') + ' favorited this';

  const hotLabel = isAr ? 'مطلوب جداً' : 'In Demand';

  if (compact) {
    return (
      <span
        dir={isAr ? 'rtl' : 'ltr'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          background: isHot ? '#fff1f2' : '#f9fafb',
          border: '1px solid ' + (isHot ? '#fecdd3' : '#e5e7eb'),
          borderRadius: '999px',
          padding: '2px 10px',
          fontSize: '12px',
          fontFamily: isAr ? "'Cairo', 'Tajawal', sans-serif" : 'inherit',
          color: isHot ? '#e11d48' : '#6b7280',
          fontWeight: 600,
          whiteSpace: 'nowrap',
        }}
      >
        <HeartIcon filled={isHot} size={13} color={isHot ? '#e11d48' : '#9ca3af'} />
        <span>{formatNum(displayed)}</span>
        {isHot && <span style={{ fontSize: '10px' }}>🔥</span>}
      </span>
    );
  }

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        background: isHot
          ? 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)'
          : 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
        border: '1px solid ' + (isHot ? '#fecdd3' : '#e5e7eb'),
        borderRadius: '12px',
        padding: '8px 14px',
        fontFamily: isAr ? "'Cairo', 'Tajawal', sans-serif" : 'inherit',
        transition: 'box-shadow 0.2s',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.10)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <HeartIcon filled={isHot} size={18} color={isHot ? '#e11d48' : '#9ca3af'} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
        <span
          style={{
            fontSize: '13px',
            color: isHot ? '#9f1239' : '#374151',
            fontWeight: 600,
            lineHeight: 1.3,
          }}
        >
          {label}
        </span>
        {isHot && (
          <span
            style={{
              fontSize: '11px',
              color: '#e11d48',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
            }}
          >
            🔥 {hotLabel}
          </span>
        )}
      </div>
    </div>
  );
}

function HeartIcon({ filled, size = 16, color = '#9ca3af' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? color : 'none'}
      stroke={color}
      strokeWidth={filled ? 0 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, transition: 'fill 0.3s, stroke 0.3s' }}
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
