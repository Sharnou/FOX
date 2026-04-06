'use client';
import { useEffect, useState } from 'react';

/**
 * AdExpiryBadge
 * Shows remaining days on an XTOX ad (30-day lifecycle + 7-day grace).
 * Supports Arabic (RTL), German and English via `lang` prop.
 * Colors: green >14d | orange 7-14d | red <7d | purple = grace period
 *
 * Props:
 *   createdAt  {string|Date}  — ad creation timestamp
 *   lang       {string}       — 'ar' | 'de' | 'en'  (default 'ar')
 */
export default function AdExpiryBadge({ createdAt, lang = 'ar' }) {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    if (!createdAt) return;
    const created = new Date(createdAt);
    const now = new Date();
    const msPerDay = 1000 * 60 * 60 * 24;
    const activeDeadline = new Date(created.getTime() + 30 * msPerDay);
    const graceDeadline = new Date(created.getTime() + 37 * msPerDay); // 30+7

    const daysUntilExpiry = Math.ceil(
      (activeDeadline - now) / msPerDay
    );
    const daysUntilGraceEnd = Math.ceil(
      (graceDeadline - now) / msPerDay
    );

    if (now < activeDeadline) {
      // Active period
      let color;
      if (daysUntilExpiry > 14) color = '#22c55e';       // green
      else if (daysUntilExpiry > 7) color = '#f97316';   // orange
      else color = '#ef4444';                             // red

      setInfo({ color, daysUntilExpiry, phase: 'active' });
    } else if (now < graceDeadline) {
      // Grace period
      setInfo({ color: '#a855f7', daysUntilGraceEnd, phase: 'grace' });
    } else {
      // Expired
      setInfo({ color: '#6b7280', phase: 'expired' });
    }
  }, [createdAt]);

  if (!info) return null;

  const isRTL = lang === 'ar';

  const labels = {
    active: {
      ar: (d) => 'باقي ' + d + ' ' + (d === 1 ? 'يوم' : 'أيام'),
      de: (d) => 'Noch ' + d + ' Tag' + (d !== 1 ? 'e' : ''),
      en: (d) => d + ' day' + (d !== 1 ? 's' : '') + ' left',
    },
    grace: {
      ar: (d) => 'فترة السماح · ' + d + ' ' + (d === 1 ? 'يوم' : 'أيام'),
      de: (d) => 'Gnadenfrist · ' + d + ' Tag' + (d !== 1 ? 'e' : ''),
      en: (d) => 'Grace period · ' + d + ' day' + (d !== 1 ? 's' : ''),
    },
    expired: {
      ar: () => 'منتهي الصلاحية',
      de: () => 'Abgelaufen',
      en: () => 'Expired',
    },
  };

  const labelFn =
    labels[info.phase]?.[lang] || labels[info.phase]?.['en'];
  const labelText =
    info.phase === 'active'
      ? labelFn(info.daysUntilExpiry)
      : info.phase === 'grace'
      ? labelFn(info.daysUntilGraceEnd)
      : labelFn();

  return (
    <span
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 10px',
        borderRadius: '999px',
        backgroundColor: info.color + '20', // translucent bg
        border: '1px solid ' + info.color,
        color: info.color,
        fontSize: '0.78rem',
        fontFamily: isRTL ? '"Cairo", sans-serif' : 'inherit',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
      role="status"
      aria-label={labelText}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      {labelText}
    </span>
  );
}
