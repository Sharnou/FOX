'use client';
/**
 * CategoryPriceIndex.jsx
 * Displays average / min / max prices for a category with trend indicator.
 * Helps Arab marketplace buyers assess whether an ad price is fair.
 *
 * Props:
 *   categoryKey  – string key, e.g. 'electronics' | 'cars' | 'realestate' | etc.
 *   currentPrice – number  (ad's listed price, optional — enables fair-price badge)
 *   currency     – string  (default 'EGP')
 *   lang         – 'ar' | 'en' | 'de'  (default 'ar')
 *   className    – extra Tailwind classes
 */

import React, { useMemo, useState } from 'react';

/* ── helpers ──────────────────────────────────────────────────────────── */

const toArabicIndic = (n) =>
  String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

const fmt = (n, lang) => {
  const s = Number(n).toLocaleString('en');
  return lang === 'ar' ? toArabicIndic(s) : s;
};

/* ── i18n ─────────────────────────────────────────────────────────────── */

const T = {
  ar: {
    title: 'مؤشر أسعار الفئة',
    avg: 'متوسط السعر',
    min: 'أدنى سعر',
    max: 'أعلى سعر',
    trend: 'اتجاه الأسعار',
    up: '↑ ارتفاع',
    down: '↓ انخفاض',
    stable: '→ مستقر',
    fair: '✓ سعر عادل',
    high: '⚠ سعر مرتفع',
    low: '↓ سعر منخفض',
    noData: 'لا توجد بيانات أسعار لهذه الفئة بعد.',
    sample: 'بناءً على آخر إعلانات',
    ads: 'إعلان',
    toggle: 'تفاصيل',
  },
  en: {
    title: 'Category Price Index',
    avg: 'Avg Price',
    min: 'Min Price',
    max: 'Max Price',
    trend: 'Price Trend',
    up: '↑ Rising',
    down: '↓ Falling',
    stable: '→ Stable',
    fair: '✓ Fair Price',
    high: '⚠ Priced High',
    low: '↓ Priced Low',
    noData: 'No price data for this category yet.',
    sample: 'Based on last',
    ads: 'ads',
    toggle: 'Details',
  },
  de: {
    title: 'Kategorie-Preisindex',
    avg: 'Ø Preis',
    min: 'Min Preis',
    max: 'Max Preis',
    trend: 'Preistrend',
    up: '↑ Steigend',
    down: '↓ Fallend',
    stable: '→ Stabil',
    fair: '✓ Fairer Preis',
    high: '⚠ Zu teuer',
    low: '↓ Günstig',
    noData: 'Noch keine Preisdaten für diese Kategorie.',
    sample: 'Basierend auf letzten',
    ads: 'Anzeigen',
    toggle: 'Details',
  },
};

/* ── mock / localStorage-backed price index ───────────────────────────── */

const SEED = {
  electronics:  { avg: 4500,  min: 200,  max: 32000, trend: 'up',   count: 312 },
  cars:         { avg: 185000,min: 18000, max: 950000,trend: 'up',   count: 89  },
  realestate:   { avg: 850000,min: 95000, max: 9500000,trend:'up',   count: 44  },
  furniture:    { avg: 2800,  min: 150,  max: 28000, trend: 'stable',count: 178 },
  clothing:     { avg: 350,   min: 20,   max: 3500,  trend: 'down',  count: 421 },
  books:        { avg: 95,    min: 10,   max: 850,   trend: 'stable',count: 203 },
  sports:       { avg: 1200,  min: 50,   max: 18000, trend: 'stable',count: 95  },
  babies:       { avg: 680,   min: 25,   max: 8500,  trend: 'down',  count: 134 },
  other:        { avg: 750,   min: 10,   max: 15000, trend: 'stable',count: 560 },
};

const getIndex = (categoryKey) => {
  try {
    const stored = localStorage.getItem(`xtox_price_index_${categoryKey}`);
    if (stored) return JSON.parse(stored);
  } catch (_) { /* ignore */ }
  return SEED[categoryKey] || SEED.other;
};

/* ── Trend badge ──────────────────────────────────────────────────────── */

const TrendBadge = ({ trend, t }) => {
  const map = {
    up:     { label: t.up,     cls: 'bg-red-100 text-red-700' },
    down:   { label: t.down,   cls: 'bg-green-100 text-green-700' },
    stable: { label: t.stable, cls: 'bg-gray-100 text-gray-600' },
  };
  const { label, cls } = map[trend] || map.stable;
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${cls}`}>
      {label}
    </span>
  );
};

/* ── Bar chart row ────────────────────────────────────────────────────── */

const BarRow = ({ label, value, max: rowMax, color, lang, currency }) => {
  const pct = Math.min(100, Math.round((value / rowMax) * 100));
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs text-gray-500 mb-0.5">
        <span>{label}</span>
        <span>{fmt(value, lang)} {currency}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

/* ── Main component ───────────────────────────────────────────────────── */

export default function CategoryPriceIndex({
  categoryKey = 'other',
  currentPrice,
  currency = 'EGP',
  lang = 'ar',
  className = '',
}) {
  const isRtl = lang === 'ar';
  const t = T[lang] || T.ar;
  const data = useMemo(() => getIndex(categoryKey), [categoryKey]);
  const [open, setOpen] = useState(false);

  if (!data) {
    return (
      <div className={`rounded-2xl border border-gray-100 p-4 text-center text-sm text-gray-400 ${className}`}>
        {t.noData}
      </div>
    );
  }

  /* Fair-price badge */
  let fairBadge = null;
  if (currentPrice != null && data.avg) {
    const ratio = currentPrice / data.avg;
    if (ratio <= 0.9) {
      fairBadge = { label: t.low,  cls: 'bg-blue-100 text-blue-700' };
    } else if (ratio <= 1.15) {
      fairBadge = { label: t.fair, cls: 'bg-green-100 text-green-700' };
    } else {
      fairBadge = { label: t.high, cls: 'bg-amber-100 text-amber-700' };
    }
  }

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`rounded-2xl border border-indigo-100 bg-white shadow-sm p-4 font-[Cairo,Tajawal,sans-serif] ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-indigo-800 flex items-center gap-1">
          📊 {t.title}
        </h3>
        <div className="flex items-center gap-2">
          {fairBadge && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${fairBadge.cls}`}>
              {fairBadge.label}
            </span>
          )}
          <TrendBadge trend={data.trend} t={t} />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: t.min, val: data.min, cls: 'text-green-600' },
          { label: t.avg, val: data.avg, cls: 'text-indigo-600 font-bold' },
          { label: t.max, val: data.max, cls: 'text-red-500' },
        ].map(({ label, val, cls }) => (
          <div key={label} className="bg-gray-50 rounded-xl p-2 text-center">
            <div className="text-[10px] text-gray-400 mb-0.5">{label}</div>
            <div className={`text-sm ${cls}`}>
              {fmt(val, lang)}
            </div>
            <div className="text-[9px] text-gray-400">{currency}</div>
          </div>
        ))}
      </div>

      {/* Toggle details */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full text-xs text-indigo-500 hover:text-indigo-700 transition-colors mb-1 flex items-center justify-center gap-1"
      >
        {t.toggle} {open ? '▲' : '▼'}
      </button>

      {open && (
        <div className="mt-2 animate-fade-in">
          <BarRow label={t.min} value={data.min} max={data.max} color="bg-green-400" lang={lang} currency={currency} />
          <BarRow label={t.avg} value={data.avg} max={data.max} color="bg-indigo-400" lang={lang} currency={currency} />
          <BarRow label={t.max} value={data.max} max={data.max} color="bg-red-400"   lang={lang} currency={currency} />
          <p className="text-[10px] text-gray-400 mt-2 text-center">
            {t.sample} {fmt(data.count, lang)} {t.ads}
          </p>
        </div>
      )}
    </div>
  );
}
