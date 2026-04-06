'use client';

/**
 * SellerVerificationBadge — XTOX Marketplace
 * Shows seller verification tier with Arabic labels and RTL support.
 *
 * Tiers:
 *  0 - unverified
 *  1 - phone verified  (هاتف موثق)
 *  2 - ID verified     (هوية موثقة)
 *  3 - business verified (تاجر موثق)
 *
 * Props:
 *  tier        {number}  0-3 (default 0)
 *  lang        {string}  'ar' | 'en' (default 'ar')
 *  size        {string}  'sm' | 'md' | 'lg' (default 'md')
 *  showLabel   {boolean} show text label (default true)
 *  tooltip     {boolean} show hover tooltip (default true)
 *  animated    {boolean} shimmer on Tier 3 (default true)
 */

import { useState } from 'react';

const TIERS = {
  0: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '1em', height: '1em' }}>
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" opacity="0.3"/>
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 2.18l7 3.12V11c0 4.52-3.13 8.74-7 9.93-3.87-1.19-7-5.41-7-9.93V6.3l7-3.12z"/>
      </svg>
    ),
    ar: 'غير موثق',
    en: 'Unverified',
    color: '#9ca3af',
    bg: '#f3f4f6',
    border: '#e5e7eb',
    tooltipAr: 'هذا البائع لم يتحقق منه بعد',
    tooltipEn: 'This seller has not been verified yet',
  },
  1: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '1em', height: '1em' }}>
        <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
      </svg>
    ),
    ar: 'هاتف موثق',
    en: 'Phone Verified',
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#bfdbfe',
    tooltipAr: 'تم التحقق من رقم هاتف هذا البائع',
    tooltipEn: "This seller's phone number has been verified",
  },
  2: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '1em', height: '1em' }}>
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
      </svg>
    ),
    ar: 'هوية موثقة',
    en: 'ID Verified',
    color: '#059669',
    bg: '#ecfdf5',
    border: '#a7f3d0',
    tooltipAr: 'تم التحقق من هوية هذا البائع الشخصية',
    tooltipEn: "This seller's identity has been verified",
  },
  3: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '1em', height: '1em' }}>
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
        <circle cx="19" cy="19" r="4" fill="#f59e0b"/>
        <path d="M19 16l.75 2.25L22 19l-2.25.75L19 22l-.75-2.25L16 19l2.25-.75z" fill="white" style={{fontSize:'6px'}}/>
      </svg>
    ),
    ar: 'تاجر موثق',
    en: 'Verified Business',
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
    tooltipAr: 'تاجر معتمد — تم التحقق من هويته التجارية',
    tooltipEn: 'Verified business — commercial identity confirmed',
  },
};

const SIZES = {
  sm: { font: '11px', padding: '2px 6px', gap: '3px', iconSize: '12px', radius: '4px' },
  md: { font: '13px', padding: '3px 9px', gap: '4px', iconSize: '14px', radius: '6px' },
  lg: { font: '15px', padding: '5px 12px', gap: '6px', iconSize: '17px', radius: '8px' },
};

export default function SellerVerificationBadge({
  tier = 0,
  lang = 'ar',
  size = 'md',
  showLabel = true,
  tooltip = true,
  animated = true,
}) {
  const [hovered, setHovered] = useState(false);
  const isRTL = lang === 'ar';
  const t = TIERS[Math.min(Math.max(Number(tier) || 0, 0), 3)];
  const s = SIZES[size] || SIZES.md;
  const label = isRTL ? t.ar : t.en;
  const tooltipText = isRTL ? t.tooltipAr : t.tooltipEn;
  const isBusiness = Number(tier) === 3;

  return (
    <span
      dir={isRTL ? 'rtl' : 'ltr'}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: s.gap,
        background: t.bg,
        color: t.color,
        border: '1px solid ' + t.border,
        borderRadius: s.radius,
        padding: s.padding,
        fontSize: s.font,
        fontFamily: isRTL ? "'Cairo', 'Tajawal', Arial, sans-serif" : 'inherit',
        fontWeight: 600,
        cursor: tooltip ? 'help' : 'default',
        userSelect: 'none',
        boxShadow: isBusiness ? '0 0 0 2px ' + t.border : 'none',
        animation: isBusiness && animated ? 'xtox-glow 2s ease-in-out infinite alternate' : 'none',
        transition: 'box-shadow 0.2s, transform 0.15s',
        transform: hovered ? 'scale(1.04)' : 'scale(1)',
        whiteSpace: 'nowrap',
      }}
      aria-label={tooltipText}
      role="img"
    >
      <style>{'\n        @keyframes xtox-glow {\n          from { box-shadow: 0 0 0 2px #fde68a, 0 0 6px #fbbf24; }\n          to   { box-shadow: 0 0 0 3px #fcd34d, 0 0 14px #f59e0b; }\n        }\n      '}</style>

      {/* Icon */}
      <span style={{ display: 'flex', alignItems: 'center', fontSize: s.iconSize, lineHeight: 1 }}>
        {t.icon}
      </span>

      {/* Label */}
      {showLabel && (
        <span style={{ lineHeight: 1.2 }}>{label}</span>
      )}

      {/* Tooltip */}
      {tooltip && hovered && (
        <span
          dir={isRTL ? 'rtl' : 'ltr'}
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            [isRTL ? 'right' : 'left']: '0',
            background: 'rgba(17,24,39,0.93)',
            color: '#f9fafb',
            fontSize: '12px',
            fontFamily: isRTL ? "'Cairo', 'Tajawal', Arial, sans-serif" : 'inherit',
            padding: '5px 10px',
            borderRadius: '6px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 50,
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          }}
        >
          {tooltipText}
          <span style={{
            position: 'absolute',
            top: '100%',
            [isRTL ? 'right' : 'left']: '10px',
            border: '4px solid transparent',
            borderTopColor: 'rgba(17,24,39,0.93)',
          }} />
        </span>
      )}
    </span>
  );
}
