'use client';

import { useState, useEffect } from 'react';

// ─── Arabic-Indic numeral converter ──────────────────────────────────────────
const toArabicIndic = (num) =>
  String(num).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

// ─── i18n strings ─────────────────────────────────────────────────────────────
const LABELS = {
  ar: {
    title: 'التوزيع الجغرافي للمشاهدات',
    subtitle: 'أفضل المدن التي تصلها إعلاناتك',
    views: 'مشاهدة',
    chats: 'محادثة',
    engagement: 'معدل التفاعل',
    trend: 'الاتجاه',
    noData: 'لا توجد بيانات متاحة',
    topCities: 'أعلى ٥ مدن',
    of: 'من',
    totalViews: 'إجمالي المشاهدات',
    totalChats: 'إجمالي المحادثات',
    up: '▲ صاعد',
    down: '▼ هابط',
    stable: '● مستقر',
  },
  en: {
    title: 'Geographic View Breakdown',
    subtitle: 'Top cities reaching your listings',
    views: 'Views',
    chats: 'Chats',
    engagement: 'Engagement Rate',
    trend: 'Trend',
    noData: 'No data available',
    topCities: 'Top 5 Cities',
    of: 'of',
    totalViews: 'Total Views',
    totalChats: 'Total Chats',
    up: '▲ Rising',
    down: '▼ Falling',
    stable: '● Stable',
  },
  de: {
    title: 'Geografische Ansichtsverteilung',
    subtitle: 'Top-Städte, die Ihre Anzeigen erreichen',
    views: 'Aufrufe',
    chats: 'Chats',
    engagement: 'Engagement-Rate',
    trend: 'Trend',
    noData: 'Keine Daten verfügbar',
    topCities: 'Top 5 Städte',
    of: 'von',
    totalViews: 'Gesamtaufrufe',
    totalChats: 'Gesamt-Chats',
    up: '▲ Steigend',
    down: '▼ Fallend',
    stable: '● Stabil',
  },
};

// ─── Mock / sample data ────────────────────────────────────────────────────────
const SAMPLE_DATA = [
  { city: 'الرياض',     cityEn: 'Riyadh',     country: 'SA', views: 1420, chats: 98,  trend: 'up' },
  { city: 'جدة',        cityEn: 'Jeddah',     country: 'SA', views: 870,  chats: 54,  trend: 'up' },
  { city: 'الدمام',     cityEn: 'Dammam',     country: 'SA', views: 430,  chats: 22,  trend: 'stable' },
  { city: 'القاهرة',    cityEn: 'Cairo',      country: 'EG', views: 310,  chats: 14,  trend: 'down' },
  { city: 'دبي',        cityEn: 'Dubai',      country: 'AE', views: 210,  chats: 19,  trend: 'up' },
];

// ─── Country flag emoji helper ─────────────────────────────────────────────────
const flagEmoji = (code) => {
  if (!code || code.length !== 2) return '🌍';
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
};

// ─── Trend badge ───────────────────────────────────────────────────────────────
const TrendBadge = ({ trend, t }) => {
  const cfg = {
    up:     { cls: 'bg-emerald-100 text-emerald-700', label: t.up },
    down:   { cls: 'bg-red-100 text-red-600',         label: t.down },
    stable: { cls: 'bg-gray-100 text-gray-500',       label: t.stable },
  };
  const { cls, label } = cfg[trend] || cfg.stable;
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>
      {label}
    </span>
  );
};

// ─── Percentage bar ────────────────────────────────────────────────────────────
const PercentBar = ({ percent, color = 'bg-amber-500' }) => (
  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
    <div
      className={`${color} h-2 rounded-full transition-all duration-700`}
      style={{ width: `${Math.min(percent, 100)}%` }}
    />
  </div>
);

// ─── Stat pill ─────────────────────────────────────────────────────────────────
const StatPill = ({ label, value, icon }) => (
  <div className="flex flex-col items-center bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm min-w-[110px]">
    <span className="text-xl mb-1">{icon}</span>
    <span className="text-lg font-bold text-gray-800 font-cairo">{value}</span>
    <span className="text-xs text-gray-500 mt-0.5 text-center">{label}</span>
  </div>
);

// ─── Main component ────────────────────────────────────────────────────────────
const BAR_COLORS = [
  'bg-amber-500',
  'bg-orange-400',
  'bg-yellow-400',
  'bg-amber-300',
  'bg-yellow-300',
];

export default function SellerGeographicInsights({
  insightsData,
  lang: propLang,
  className = '',
}) {
  const [lang, setLang]           = useState(propLang || 'ar');
  const [arabicNums, setArabicNums] = useState(lang === 'ar');
  const [animated, setAnimated]   = useState(false);

  const t    = LABELS[lang] || LABELS.ar;
  const isRTL = lang === 'ar';
  const data  = (insightsData && insightsData.length > 0 ? insightsData : SAMPLE_DATA).slice(0, 5);

  const totalViews = data.reduce((s, d) => s + d.views, 0);
  const totalChats = data.reduce((s, d) => s + d.chats, 0);

  const fmt = (n) => {
    const str = Number(n).toLocaleString('en');
    return arabicNums ? toArabicIndic(str) : str;
  };
  const fmtPct = (n) => {
    const pct = n.toFixed(1);
    return arabicNums ? toArabicIndic(pct) + '٪' : pct + '%';
  };

  // Staggered bar animation on mount
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 80);
    return () => clearTimeout(t);
  }, []);



  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className={`font-sans rounded-3xl bg-gradient-to-br from-amber-50 to-white border border-amber-100 shadow-md p-5 max-w-lg w-full ${className}`}
    >
      {/* Google Fonts — Cairo + Tajawal */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Tajawal:wght@400;500;700&display=swap');
        .font-cairo { font-family: 'Cairo', 'Tajawal', sans-serif; }
      `}</style>

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-800 font-cairo leading-snug">
            📍 {t.title}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5 font-cairo">{t.subtitle}</p>
        </div>

        {/* Language switcher */}
        <div className="flex gap-1 shrink-0">
          {['ar', 'en', 'de'].map((l) => (
            <button
              key={l}
              onClick={() => { setLang(l); setArabicNums(l === 'ar'); }}
              className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors ${
                lang === l
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 hover:bg-amber-100'
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ── Summary pills ── */}
      <div className={`flex gap-3 mb-5 overflow-x-auto pb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <StatPill label={t.totalViews} value={fmt(totalViews)} icon="👁️" />
        <StatPill label={t.totalChats} value={fmt(totalChats)} icon="💬" />
        <StatPill
          label={t.engagement}
          value={fmtPct((totalChats / (totalViews || 1)) * 100)}
          icon="📊"
        />
      </div>

      {/* ── City list ── */}
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 font-cairo">
        {t.topCities}
      </p>

      {data.length === 0 ? (
        <p className="text-center text-gray-400 py-6">{t.noData}</p>
      ) : (
        <ul className="space-y-4">
          {data.map((row, i) => {
            const pct = totalViews > 0 ? (row.views / totalViews) * 100 : 0;
            const engRate = row.views > 0 ? (row.chats / row.views) * 100 : 0;
            const cityLabel = lang === 'ar' ? row.city : (row.cityEn || row.city);

            return (
              <li key={`${row.city}-${i}`} className="group">
                {/* City name row */}
                <div className={`flex items-center justify-between mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-lg leading-none">{flagEmoji(row.country)}</span>
                    <span className="text-sm font-semibold text-gray-700 font-cairo">
                      {cityLabel}
                    </span>
                  </div>
                  <TrendBadge trend={row.trend} t={t} />
                </div>

                {/* Progress bar */}
                <div className={`transition-all duration-500 ${animated ? 'opacity-100' : 'opacity-0'}`}>
                  <PercentBar percent={pct} color={BAR_COLORS[i % BAR_COLORS.length]} />
                </div>

                {/* Stats row */}
                <div className={`flex items-center gap-4 mt-1.5 text-xs text-gray-500 font-cairo ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span>
                    👁️ {fmt(row.views)} {t.views} · {fmtPct(pct)} {t.of} {t.totalViews}
                  </span>
                  <span>
                    💬 {fmt(row.chats)} {t.chats}
                  </span>
                  <span className="text-amber-600 font-medium">
                    {fmtPct(engRate)} {t.engagement}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* ── Arabic numerals toggle ── */}
      <div className={`flex items-center gap-2 mt-5 pt-4 border-t border-amber-100 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button
          onClick={() => setArabicNums((p) => !p)}
          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
            arabicNums ? 'bg-amber-500' : 'bg-gray-200'
          }`}
          role="switch"
          aria-checked={arabicNums}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${
              arabicNums ? (isRTL ? '-translate-x-4' : 'translate-x-4') : 'translate-x-0.5'
            }`}
          />
        </button>
        <span className="text-xs text-gray-500 font-cairo select-none">
          {arabicNums ? '٠١٢٣٤٥٦٧٨٩ ←' : '0123456789'} {lang === 'ar' ? 'أرقام عربية' : lang === 'de' ? 'Arab. Ziffern' : 'Arabic numerals'}
        </span>
      </div>
    </div>
  );
}
