'use client';
import { useState, useEffect, useRef } from 'react';

/**
 * AdStatsWidget — Seller ad performance analytics
 * Shows views, chats, favorites, ranking score with sparkline
 * RTL Arabic-first, bilingual AR/EN/DE, Arabic-Indic numerals, zero deps
 * Props:
 *   adId        {string}  — ad identifier
 *   stats       {object}  — { totalViews, totalChats, totalFavorites, score, dailyViews: [7 nums] }
 *   lang        {string}  — 'ar' | 'en' | 'de'
 *   compact     {boolean} — compact pill mode vs full card
 */

const i18n = {
  ar: {
    title: 'إحصائيات إعلانك',
    views: 'مشاهدة',
    chats: 'محادثة',
    favorites: 'محفوظ',
    score: 'التقييم',
    engagement: 'نسبة التفاعل',
    last7: 'آخر ٧ أيام',
    high: 'ممتاز',
    medium: 'جيد',
    low: 'منخفض',
    tip: 'نصيحة: شارك إعلانك لزيادة المشاهدات',
  },
  en: {
    title: 'Ad Statistics',
    views: 'Views',
    chats: 'Chats',
    favorites: 'Saved',
    score: 'Score',
    engagement: 'Engagement Rate',
    last7: 'Last 7 Days',
    high: 'Excellent',
    medium: 'Good',
    low: 'Low',
    tip: 'Tip: Share your ad to boost views',
  },
  de: {
    title: 'Anzeigenstatistik',
    views: 'Aufrufe',
    chats: 'Chats',
    favorites: 'Gespeichert',
    score: 'Bewertung',
    engagement: 'Interaktionsrate',
    last7: 'Letzte 7 Tage',
    high: 'Ausgezeichnet',
    medium: 'Gut',
    low: 'Niedrig',
    tip: 'Tipp: Teilen Sie Ihre Anzeige für mehr Aufrufe',
  },
};

function toArabicNumerals(num, lang) {
  if (lang !== 'ar') return num.toLocaleString();
  const arabicDigits = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
  return String(num).replace(/[0-9]/g, d => arabicDigits[d]);
}

function Sparkline({ data, color = '#f97316', height = 40 }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 120;
  const h = height;
  const pad = 3;
  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  });
  const polyline = points.join(' ');
  // Area fill
  const areaPoints = `${pad},${h - pad} ${polyline} ${w - pad},${h - pad}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.04" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#sg)" />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Last point dot */}
      {points.length > 0 && (() => {
        const last = points[points.length - 1].split(',');
        return <circle cx={last[0]} cy={last[1]} r="3" fill={color} />;
      })()}
    </svg>
  );
}

function AnimatedCount({ target, duration = 900, lang }) {
  const [count, setCount] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    const start = performance.now();
    const animate = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(target * ease));
      if (progress < 1) raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return <span>{toArabicNumerals(count, lang)}</span>;
}

export default function AdStatsWidget({ adId, stats = {}, lang = 'ar', compact = false }) {
  const t = i18n[lang] || i18n.ar;
  const isRTL = lang === 'ar';

  const {
    totalViews = 0,
    totalChats = 0,
    totalFavorites = 0,
    score = 0,
    dailyViews = [0, 0, 0, 0, 0, 0, 0],
  } = stats;

  const engagementRate = totalViews > 0
    ? Math.round((totalChats / totalViews) * 100)
    : 0;

  const engagementLevel =
    engagementRate >= 10 ? 'high' :
    engagementRate >= 4  ? 'medium' : 'low';

  const engagementColor =
    engagementLevel === 'high'   ? '#22c55e' :
    engagementLevel === 'medium' ? '#f97316' : '#ef4444';

  const scoreColor =
    score >= 80 ? '#22c55e' :
    score >= 40 ? '#f97316' : '#ef4444';

  // Compact pill mode
  if (compact) {
    return (
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px',
          background: '#1a1a1a',
          border: '1px solid #2a2a2a',
          borderRadius: '999px',
          padding: '5px 14px',
          fontFamily: isRTL ? "'Cairo', 'Tajawal', sans-serif" : "system-ui, sans-serif",
          fontSize: '12px',
          color: '#ccc',
        }}
      >
        <span>👁 <AnimatedCount target={totalViews} lang={lang} /></span>
        <span style={{ color: '#444' }}>|</span>
        <span>💬 <AnimatedCount target={totalChats} lang={lang} /></span>
        <span style={{ color: '#444' }}>|</span>
        <span>❤️ <AnimatedCount target={totalFavorites} lang={lang} /></span>
      </div>
    );
  }

  // Full card mode
  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      role="region"
      aria-label={t.title}
      style={{
        background: '#111',
        border: '1px solid #222',
        borderRadius: '16px',
        padding: '20px',
        fontFamily: isRTL ? "'Cairo', 'Tajawal', sans-serif" : "system-ui, sans-serif",
        color: '#fff',
        maxWidth: '420px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#fff' }}>
          📊 {t.title}
        </h3>
        <span style={{
          fontSize: '11px',
          background: '#1e1e1e',
          border: '1px solid #333',
          borderRadius: '8px',
          padding: '3px 10px',
          color: '#888',
        }}>
          {t.last7}
        </span>
      </div>

      {/* Stat Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
        {[
          { icon: '👁', label: t.views, value: totalViews, color: '#60a5fa' },
          { icon: '💬', label: t.chats, value: totalChats, color: '#34d399' },
          { icon: '❤️', label: t.favorites, value: totalFavorites, color: '#f472b6' },
        ].map(({ icon, label, value, color }) => (
          <div key={label} style={{
            background: '#1a1a1a',
            borderRadius: '12px',
            padding: '12px 8px',
            textAlign: 'center',
            border: '1px solid #2a2a2a',
          }}>
            <div style={{ fontSize: '18px', marginBottom: '4px' }}>{icon}</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color, lineHeight: 1 }}>
              <AnimatedCount target={value} lang={lang} />
            </div>
            <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Sparkline */}
      <div style={{
        background: '#1a1a1a',
        borderRadius: '12px',
        padding: '12px 14px',
        marginBottom: '12px',
        border: '1px solid #2a2a2a',
      }}>
        <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px' }}>{t.last7}</div>
        <Sparkline data={dailyViews} color="#f97316" height={40} />
      </div>

      {/* Engagement + Score Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {/* Engagement Rate */}
        <div style={{
          background: '#1a1a1a',
          borderRadius: '12px',
          padding: '12px',
          border: '1px solid #2a2a2a',
        }}>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px' }}>{t.engagement}</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: engagementColor }}>
            {toArabicNumerals(engagementRate, lang)}%
          </div>
          <div style={{
            marginTop: '6px',
            fontSize: '11px',
            fontWeight: 600,
            color: engagementColor,
            background: `${engagementColor}18`,
            borderRadius: '6px',
            padding: '2px 8px',
            display: 'inline-block',
          }}>
            {t[engagementLevel]}
          </div>
        </div>

        {/* Ad Score */}
        <div style={{
          background: '#1a1a1a',
          borderRadius: '12px',
          padding: '12px',
          border: '1px solid #2a2a2a',
        }}>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px' }}>{t.score}</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: scoreColor }}>
            {toArabicNumerals(score, lang)}
          </div>
          {/* Score bar */}
          <div style={{ marginTop: '8px', background: '#2a2a2a', borderRadius: '4px', height: '5px', overflow: 'hidden' }}>
            <div style={{
              width: `${Math.min(score, 100)}%`,
              height: '100%',
              background: scoreColor,
              borderRadius: '4px',
              transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
            }} />
          </div>
        </div>
      </div>

      {/* Tip */}
      {totalViews < 20 && (
        <div style={{
          marginTop: '12px',
          background: '#1a1a1a',
          border: '1px solid #f97316aa',
          borderRadius: '10px',
          padding: '10px 12px',
          fontSize: '12px',
          color: '#f97316',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span>💡</span>
          <span>{t.tip}</span>
        </div>
      )}
    </div>
  );
}
