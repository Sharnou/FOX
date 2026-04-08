/**
 * AdVisibilityScoreWidget.jsx
 * XTOX Arab Marketplace — Ad Visibility Score Widget
 * Arabic-first RTL layout with EN/DE switcher
 * Tailwind CSS only · Cairo/Tajawal Google Fonts
 */

import React, { useState, useMemo } from 'react';

/* ─── Translations ─────────────────────────────────────────── */
const T = {
  ar: {
    title: 'مؤشر ظهور إعلانك',
    excellent: 'ممتاز',
    good: 'جيد',
    needsWork: 'يحتاج تحسين',
    priceComp: 'تنافسية السعر',
    adQuality: 'جودة الإعلان',
    freshness: 'حداثة الإعلان',
    responseRate: 'معدل الرد',
    featured: 'إعلان مميز',
    tips: 'نصائح لتحسين الظهور',
    searchPos: 'موضعك التقريبي في البحث',
    betterThan: 'إعلانك أفضل من',
    ofSimilar: 'من الإعلانات المشابهة',
    position: 'الموضع التقريبي',
    tip_price: 'خفّض السعر قليلاً لتنافس أكثر',
    tip_quality: 'أضف المزيد من الصور والتفاصيل',
    tip_freshness: 'جدّد إعلانك لتظهر في الأعلى',
    tip_response: 'ردّ على المشترين بسرعة أكبر',
    tip_featured: 'ميّز إعلانك للوصول لأكثر مشترين',
    scoreOutOf: 'من ١٠٠',
    factors: 'عوامل النتيجة',
    viewDetails: 'عرض التفاصيل',
    lastUpdated: 'آخر تحديث',
    now: 'الآن',
  },
  en: {
    title: 'Ad Visibility Score',
    excellent: 'Excellent',
    good: 'Good',
    needsWork: 'Needs Improvement',
    priceComp: 'Price Competitiveness',
    adQuality: 'Ad Quality',
    freshness: 'Ad Freshness',
    responseRate: 'Response Rate',
    featured: 'Featured Status',
    tips: 'Tips to Improve Visibility',
    searchPos: 'Estimated Search Position',
    betterThan: 'Your ad outperforms',
    ofSimilar: 'of similar listings',
    position: 'Approx. position',
    tip_price: 'Lower the price slightly to compete better',
    tip_quality: 'Add more photos and detailed description',
    tip_freshness: 'Bump your ad to appear at the top',
    tip_response: 'Reply to buyers faster',
    tip_featured: 'Feature your ad to reach more buyers',
    scoreOutOf: 'out of 100',
    factors: 'Score Factors',
    viewDetails: 'View Details',
    lastUpdated: 'Last updated',
    now: 'just now',
  },
  de: {
    title: 'Anzeigen-Sichtbarkeits-Score',
    excellent: 'Ausgezeichnet',
    good: 'Gut',
    needsWork: 'Verbesserungsbedarf',
    priceComp: 'Preiswettbewerb',
    adQuality: 'Anzeigequalität',
    freshness: 'Aktualität',
    responseRate: 'Antwortrate',
    featured: 'Featured-Status',
    tips: 'Tipps zur Verbesserung',
    searchPos: 'Geschätzte Suchposition',
    betterThan: 'Ihre Anzeige übertrifft',
    ofSimilar: 'ähnlicher Anzeigen',
    position: 'ca. Position',
    tip_price: 'Preis leicht senken für mehr Wettbewerb',
    tip_quality: 'Mehr Fotos und Details hinzufügen',
    tip_freshness: 'Anzeige erneuern um oben zu erscheinen',
    tip_response: 'Schneller auf Käufer antworten',
    tip_featured: 'Anzeige hervorheben für mehr Reichweite',
    scoreOutOf: 'von 100',
    factors: 'Bewertungsfaktoren',
    viewDetails: 'Details anzeigen',
    lastUpdated: 'Zuletzt aktualisiert',
    now: 'gerade eben',
  },
};

/* ─── Arabic-Indic numeral converter ──────────────────────── */
const toArabicIndic = (n) =>
  String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

const formatNumber = (n, lang) =>
  lang === 'ar' ? toArabicIndic(Math.round(n)) : Math.round(n);

/* ─── Score colour helpers ─────────────────────────────────── */
const getScoreColor = (score) => {
  if (score >= 70) return { ring: '#10b981', text: 'text-emerald-500', bg: 'bg-emerald-50', bar: 'bg-emerald-500' };
  if (score >= 40) return { ring: '#f59e0b', text: 'text-amber-500',   bg: 'bg-amber-50',   bar: 'bg-amber-400'  };
  return              { ring: '#ef4444', text: 'text-red-500',    bg: 'bg-red-50',     bar: 'bg-red-500'    };
};

const getScoreLabel = (score, t) => {
  if (score >= 70) return t.excellent;
  if (score >= 40) return t.good;
  return t.needsWork;
};

/* ─── Factor icon SVGs ─────────────────────────────────────── */
const FactorIcons = {
  priceComp: (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
    </svg>
  ),
  adQuality: (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  ),
  freshness: (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2">
      <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0"/><path d="M12 7v5l3 3"/>
    </svg>
  ),
  responseRate: (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  featured: (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
};

const TipIcons = {
  tip_price:    '💰',
  tip_quality:  '📸',
  tip_freshness:'🔄',
  tip_response: '⚡',
  tip_featured: '⭐',
};

/* ─── Circular SVG Gauge ───────────────────────────────────── */
const CircularGauge = ({ score, color, lang }) => {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="140" height="140" className="-rotate-90">
        {/* Background track */}
        <circle
          cx="70" cy="70" r={radius}
          fill="none" stroke="#e5e7eb" strokeWidth="10"
        />
        {/* Score arc */}
        <circle
          cx="70" cy="70" r={radius}
          fill="none"
          stroke={color.ring}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
        />
      </svg>
      {/* Centre text */}
      <div className="absolute flex flex-col items-center justify-center">
        <span className={`text-4xl font-extrabold ${color.text} font-mono leading-none`}>
          {formatNumber(score, lang)}
        </span>
        <span className="text-xs text-gray-400 mt-1 font-medium">
          {T[lang]?.scoreOutOf ?? 'out of 100'}
        </span>
      </div>
    </div>
  );
};

/* ─── Individual Factor Bar ────────────────────────────────── */
const FactorBar = ({ factorKey, value, label, lang, dir }) => {
  const color = getScoreColor(value);
  return (
    <div className="mb-3">
      <div className={`flex items-center justify-between mb-1 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <span className={color.text}>{FactorIcons[factorKey]}</span>
          <span className="text-sm font-semibold text-gray-700">{label}</span>
        </div>
        <span className={`text-sm font-bold ${color.text}`}>
          {formatNumber(value, lang)}%
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-2.5 rounded-full ${color.bar} transition-all duration-700`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
};

/* ─── Tip Card ─────────────────────────────────────────────── */
const TipCard = ({ tipKey, t, dir }) => (
  <div className={`flex items-start gap-3 bg-white border border-gray-100 rounded-xl p-3 shadow-sm ${dir === 'rtl' ? 'flex-row-reverse text-right' : ''}`}>
    <span className="text-2xl flex-shrink-0 mt-0.5">{TipIcons[tipKey]}</span>
    <p className="text-sm text-gray-700 leading-relaxed">{t[tipKey]}</p>
  </div>
);

/* ─── Search Position Badge ────────────────────────────────── */
const SearchPositionCard = ({ score, t, lang, dir }) => {
  // Estimate search position: score 100 → pos 1, score 0 → pos 50
  const position = Math.max(1, Math.round(50 - (score / 100) * 49));
  const percentile = Math.round(score * 0.85 + Math.random() * 5);

  return (
    <div className={`grid grid-cols-2 gap-3 mt-4`}>
      {/* Position card */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
        <div className="text-3xl font-extrabold text-blue-600 mb-1">
          #{formatNumber(position, lang)}
        </div>
        <div className="text-xs text-blue-500 font-medium leading-tight">
          {t.position}
        </div>
      </div>
      {/* Percentile card */}
      <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-center">
        <div className="text-3xl font-extrabold text-purple-600 mb-1">
          {formatNumber(percentile, lang)}%
        </div>
        <div className={`text-xs text-purple-500 font-medium leading-tight ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
          {dir === 'rtl'
            ? <>{t.betterThan} {t.ofSimilar}</>
            : <>{t.betterThan} {t.ofSimilar}</>}
        </div>
      </div>
    </div>
  );
};

/* ─── Language Switcher ────────────────────────────────────── */
const LangSwitcher = ({ current, onChange }) => (
  <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-lg p-1">
    {['ar', 'en', 'de'].map((l) => (
      <button
        key={l}
        onClick={() => onChange(l)}
        className={`text-xs px-2 py-1 rounded-md font-bold transition-all ${
          current === l
            ? 'bg-white text-emerald-700 shadow-sm'
            : 'text-white/80 hover:text-white hover:bg-white/10'
        }`}
      >
        {l.toUpperCase()}
      </button>
    ))}
  </div>
);

/* ─── Main Widget ──────────────────────────────────────────── */
const AdVisibilityScoreWidget = ({
  adId,
  score,
  factors,
  lang: initialLang,
  className,
}) => {
  const [lang, setLang] = useState(initialLang || 'ar');
  const [showAllFactors, setShowAllFactors] = useState(false);

  const t = T[lang] || T.ar;
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const scoreColor = getScoreColor(score);
  const scoreLabel = getScoreLabel(score, t);

  /* Derive 3 tips from the lowest-scoring factors */
  const tipKeys = useMemo(() => {
    const factorTipMap = {
      priceComp:    'tip_price',
      adQuality:    'tip_quality',
      freshness:    'tip_freshness',
      responseRate: 'tip_response',
      featured:     'tip_featured',
    };
    return Object.entries(factors)
      .sort(([, a], [, b]) => a - b)
      .slice(0, 3)
      .map(([key]) => factorTipMap[key]);
  }, [factors]);

  const factorDefs = [
    { key: 'priceComp',    label: t.priceComp    },
    { key: 'adQuality',    label: t.adQuality    },
    { key: 'freshness',    label: t.freshness    },
    { key: 'responseRate', label: t.responseRate },
    { key: 'featured',     label: t.featured     },
  ];

  const visibleFactors = showAllFactors ? factorDefs : factorDefs.slice(0, 3);

  return (
    <div
      dir={dir}
      className={`font-[Cairo,Tajawal,sans-serif] bg-white rounded-2xl shadow-lg overflow-hidden w-full max-w-sm mx-auto ${className || ''}`}
      style={{ fontFamily: "'Cairo', 'Tajawal', 'Segoe UI', sans-serif" }}
    >
      {/* Google Fonts import (inline style) */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&family=Tajawal:wght@400;700;900&display=swap');`}</style>

      {/* ── Header ── */}
      <div className="bg-gradient-to-br from-emerald-600 via-teal-500 to-emerald-400 px-5 py-4">
        <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <div className={dir === 'rtl' ? 'text-right' : 'text-left'}>
            <h2 className="text-white font-extrabold text-base leading-tight">
              {t.title}
            </h2>
            {adId && (
              <p className="text-emerald-100 text-xs mt-0.5 opacity-80">
                {adId}
              </p>
            )}
          </div>
          <LangSwitcher current={lang} onChange={setLang} />
        </div>

        {/* Score gauge */}
        <div className="flex flex-col items-center mt-4 pb-2">
          <CircularGauge score={score} color={scoreColor} lang={lang} />
          <span
            className={`mt-3 inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold ${scoreColor.bg} ${scoreColor.text} border border-current/20`}
          >
            {scoreLabel}
          </span>
          <p className="text-emerald-100 text-xs mt-2 opacity-75">
            {t.lastUpdated}: {t.now}
          </p>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="px-5 py-4">

        {/* Search position & percentile */}
        <SearchPositionCard score={score} t={t} lang={lang} dir={dir} />

        {/* Factor bars */}
        <div className="mt-5">
          <h3 className={`text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
            {t.factors}
          </h3>
          {visibleFactors.map(({ key, label }) => (
            <FactorBar
              key={key}
              factorKey={key}
              value={factors[key] ?? 0}
              label={label}
              lang={lang}
              dir={dir}
            />
          ))}
          {!showAllFactors && factorDefs.length > 3 && (
            <button
              onClick={() => setShowAllFactors(true)}
              className={`w-full text-xs text-emerald-600 font-semibold mt-1 py-1.5 hover:text-emerald-700 transition-colors ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
            >
              {t.viewDetails} ↓
            </button>
          )}
          {showAllFactors && (
            <button
              onClick={() => setShowAllFactors(false)}
              className={`w-full text-xs text-gray-400 font-semibold mt-1 py-1.5 hover:text-gray-500 transition-colors ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
            >
              ↑
            </button>
          )}
        </div>

        {/* Tips section */}
        <div className="mt-5">
          <div className={`flex items-center gap-2 mb-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <span className="text-lg">💡</span>
            <h3 className="text-sm font-bold text-gray-700">{t.tips}</h3>
          </div>
          <div className="flex flex-col gap-2">
            {tipKeys.map((tipKey) => (
              <TipCard key={tipKey} tipKey={tipKey} t={t} dir={dir} />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className={`mt-5 pt-4 border-t border-gray-100 flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <span className="text-xs text-gray-400">
            {lang === 'ar' ? 'مدعوم من XTOX' : lang === 'de' ? 'Powered by XTOX' : 'Powered by XTOX'}
          </span>
          <div className={`flex items-center gap-1 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-2 h-2 rounded-full ${score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-400' : 'bg-red-500'} animate-pulse`} />
            <span className={`text-xs font-semibold ${scoreColor.text}`}>{scoreLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Default Props ────────────────────────────────────────── */
AdVisibilityScoreWidget.defaultProps = {
  score: 62,
  factors: {
    priceComp:    45,
    adQuality:    78,
    freshness:    55,
    responseRate: 80,
    featured:     0,
  },
  lang: 'ar',
};

export default AdVisibilityScoreWidget;
